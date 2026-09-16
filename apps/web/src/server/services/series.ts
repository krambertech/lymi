import type {
  SeriesArchiveInput,
  SeriesDecksInput,
  SeriesInput,
  SeriesOrderInput,
} from "@lymi/core";
import { newId } from "@lymi/core";
import { and, asc, eq, isNotNull, isNull, type SQL, sql } from "@lymi/core/db";
import { auditStatement, auditStatementWhen } from "../audit";
import { type Db, schema } from "../db";
import { runBatch } from "./batch";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { listDecks } from "./decks";
import { memberOf } from "./members";
import { activeSeries, ownedSeries } from "./series-access";

type Statement = Parameters<Db["batch"]>[0][number];

/** A list of ids as one bound JSON parameter, since D1 caps a query at 100 parameters. */
const jsonIds = (ids: readonly string[]) => JSON.stringify(ids);

/**
 * The caller's series in their order, each with its active decks in order and the counts of
 * those decks. Archived series come back only when asked for, with how many decks Restore returns.
 */
export async function listSeries(
  ctx: ServiceContext,
  opts: { archived?: boolean | undefined } = {},
) {
  const { db, userId } = ctx;
  const rows = await db
    .select()
    .from(schema.series)
    .where(
      and(
        eq(schema.series.userId, userId),
        opts.archived ? isNotNull(schema.series.archivedAt) : isNull(schema.series.archivedAt),
      ),
    )
    .orderBy(asc(schema.series.position), asc(schema.series.createdAt), asc(schema.series.id));
  if (opts.archived) {
    const withDecks = await db
      .select({ seriesId: schema.decks.seriesId, count: sql<number>`count(*)` })
      .from(schema.decks)
      .innerJoin(schema.series, eq(schema.series.id, schema.decks.seriesId))
      .where(and(eq(schema.decks.userId, userId), sql`decks.archived_at = series.archived_at`))
      .groupBy(schema.decks.seriesId);
    const archived = new Map(withDecks.map((row) => [row.seriesId, row.count]));
    return rows.map(({ userId: _owner, revision: _revision, ...row }) => ({
      ...row,
      deckIds: [] as string[],
      total: 0,
      due: 0,
      archivedDecks: archived.get(row.id) ?? 0,
    }));
  }
  // The same rows and counts Library shows, so a series always adds up to its decks.
  const decks = rows.length > 0 ? await listDecks(ctx) : [];
  return rows.map(({ userId: _owner, revision: _revision, ...row }) => {
    const inSeries = decks.filter((deck) => deck.seriesId === row.id);
    return {
      ...row,
      deckIds: inSeries.map((deck) => deck.id),
      total: inSeries.reduce((sum, deck) => sum + deck.total, 0),
      due: inSeries.reduce((sum, deck) => sum + deck.due, 0),
      archivedDecks: 0,
    };
  });
}

export async function getSeries(ctx: ServiceContext, id: string) {
  const row = await ownedSeries(ctx, id);
  const found = (await listSeries(ctx, { archived: !!row.archivedAt })).find((s) => s.id === id);
  if (!found) throw notFound("Series");
  return found;
}

/** The listed decks, each active and the caller's, or not found and forbidden as a deck write would be. */
async function ownedActiveDecks({ db, userId }: ServiceContext, deckIds: readonly string[]) {
  if (deckIds.length === 0) return new Map<string, { seriesId: string | null; position: number }>();
  const rows = await db
    .select({
      id: schema.decks.id,
      userId: schema.decks.userId,
      seriesId: schema.decks.seriesId,
      position: schema.decks.position,
    })
    .from(schema.decks)
    .where(
      and(
        sql`${schema.decks.id} in (select value from json_each(${jsonIds(deckIds)}))`,
        memberOf(userId),
        isNull(schema.decks.archivedAt),
      ),
    );
  const byId = new Map(rows.map((row) => [row.id, row]));
  for (const id of deckIds) {
    const row = byId.get(id);
    if (!row) throw notFound("Deck");
    if (row.userId !== userId) {
      throw new ServiceError("forbidden", "Only the deck's owner can put it in a series");
    }
  }
  return byId;
}

/** One statement that puts the listed decks in a series at their list positions. */
function placeDecks(
  db: Db,
  userId: string,
  seriesId: string,
  deckIds: readonly string[],
  at: Date,
) {
  const list = jsonIds(deckIds);
  return db
    .update(schema.decks)
    .set({
      seriesId,
      position: sql`(select key from json_each(${list}) where value = decks.id)`,
      updatedAt: at,
    })
    .where(
      and(
        eq(schema.decks.userId, userId),
        isNull(schema.decks.archivedAt),
        sql`${schema.decks.id} in (select value from json_each(${list}))`,
      ),
    );
}

export async function createSeries(ctx: ServiceContext, input: SeriesInput) {
  const { db, userId, actor } = ctx;
  const deckIds = input.deckIds ?? [];
  await ownedActiveDecks(ctx, deckIds);
  const [last] = await db
    .select({ next: sql<number>`coalesce(max(${schema.series.position}), -1) + 1` })
    .from(schema.series)
    .where(and(eq(schema.series.userId, userId), isNull(schema.series.archivedAt)));
  const id = newId();
  await runBatch(db, [
    db.insert(schema.series).values({ id, userId, name: input.name, position: last?.next ?? 0 }),
    ...(deckIds.length > 0 ? [placeDecks(db, userId, id, deckIds, new Date())] : []),
    auditStatement(db, {
      userId,
      actor,
      action: "create",
      entity: "series",
      entityId: id,
      payload: input,
    }),
  ]);
  return getSeries(ctx, id);
}

export async function renameSeries(ctx: ServiceContext, id: string, name: string) {
  const { db, userId, actor } = ctx;
  const row = await ownedSeries(ctx, id);
  if (row.name !== name) {
    await runBatch(db, [
      db
        .update(schema.series)
        // A rename is text an edition translates, so every edition of it goes stale.
        .set({ name, revision: sql`revision + 1`, updatedAt: new Date() })
        .where(and(eq(schema.series.id, id), eq(schema.series.userId, userId))),
      auditStatement(db, {
        userId,
        actor,
        action: "update",
        entity: "series",
        entityId: id,
        payload: { name },
      }),
    ]);
  }
  return getSeries(ctx, id);
}

/**
 * Set exactly which active decks a series holds and their order. A listed deck from Library or
 * another series moves in; a deck left out goes to the end of Library. The same list again
 * changes nothing and adds nothing to Activity.
 */
export async function setSeriesDecks(ctx: ServiceContext, id: string, input: SeriesDecksInput) {
  const { db, userId, actor } = ctx;
  await activeSeries(ctx, id);
  const listed = await ownedActiveDecks(ctx, input.deckIds);
  const members = await db
    .select({ id: schema.decks.id })
    .from(schema.decks)
    .where(
      and(
        eq(schema.decks.seriesId, id),
        eq(schema.decks.userId, userId),
        isNull(schema.decks.archivedAt),
      ),
    );
  const leaving = members.filter((deck) => !listed.has(deck.id));
  const unchanged =
    leaving.length === 0 &&
    input.deckIds.every((deckId, position) => {
      const deck = listed.get(deckId);
      return deck?.seriesId === id && deck.position === position;
    });
  if (unchanged) return getSeries(ctx, id);

  const now = new Date();
  await runBatch(db, [
    db
      .update(schema.decks)
      .set({ seriesId: null, position: 0, updatedAt: now })
      .where(
        and(
          eq(schema.decks.seriesId, id),
          eq(schema.decks.userId, userId),
          isNull(schema.decks.archivedAt),
          sql`${schema.decks.id} not in (select value from json_each(${jsonIds(input.deckIds)}))`,
        ),
      ),
    ...(input.deckIds.length > 0 ? [placeDecks(db, userId, id, input.deckIds, now)] : []),
    auditStatement(db, {
      userId,
      actor,
      action: "update",
      entity: "series",
      entityId: id,
      payload: { deckIds: input.deckIds },
    }),
  ]);
  return getSeries(ctx, id);
}

/** Put every active series in a new order. The list must name each of them once, or 409. */
export async function reorderSeries(ctx: ServiceContext, input: SeriesOrderInput) {
  const { db, userId, actor } = ctx;
  const current = await db
    .select({ id: schema.series.id, position: schema.series.position })
    .from(schema.series)
    .where(and(eq(schema.series.userId, userId), isNull(schema.series.archivedAt)))
    .orderBy(asc(schema.series.position), asc(schema.series.createdAt), asc(schema.series.id));
  const known = new Set(current.map((row) => row.id));
  if (input.seriesIds.length !== known.size || input.seriesIds.some((s) => !known.has(s))) {
    throw new ServiceError("conflict", "Your series changed. Reload and try again.");
  }
  const unchanged = input.seriesIds.every(
    (seriesId, position) =>
      current[position]?.id === seriesId && current[position]?.position === position,
  );
  if (!unchanged) {
    const list = jsonIds(input.seriesIds);
    await runBatch(db, [
      db
        .update(schema.series)
        .set({
          position: sql`(select key from json_each(${list}) where value = series.id)`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.series.userId, userId),
            isNull(schema.series.archivedAt),
            sql`${schema.series.id} in (select value from json_each(${list}))`,
          ),
        ),
      auditStatement(db, {
        userId,
        actor,
        action: "reorder",
        entity: "series",
        entityId: input.seriesIds[0] ?? userId,
        payload: input,
      }),
    ]);
  }
  return listSeries(ctx);
}

/**
 * Archive a series. Its decks either leave with it, stamped with the series' own `archived_at` so
 * Restore finds exactly them, or stay in Library without a series. Archiving twice is harmless.
 */
export async function archiveSeries(ctx: ServiceContext, id: string, input: SeriesArchiveInput) {
  const { db, userId, actor } = ctx;
  const row = await ownedSeries(ctx, id);
  if (row.archivedAt) return { ok: true as const };
  const at = new Date();
  // Only the write that archived the series moves its decks and lands in Activity.
  const landed: SQL = sql`${schema.series.id} = ${id} and ${schema.series.archivedAt} = ${at.getTime()}`;
  await runBatch(db, [
    db
      .update(schema.series)
      .set({ archivedAt: at, updatedAt: at })
      .where(
        and(
          eq(schema.series.id, id),
          eq(schema.series.userId, userId),
          isNull(schema.series.archivedAt),
        ),
      ),
    ...(input.decks === "archive"
      ? [
          db
            .update(schema.decks)
            .set({ archivedAt: at, updatedAt: at })
            .where(
              and(
                eq(schema.decks.seriesId, id),
                eq(schema.decks.userId, userId),
                isNull(schema.decks.archivedAt),
                sql`exists (select 1 from series where ${landed})`,
              ),
            ),
        ]
      : // Kept decks keep `series_id` and their order, so Restore regroups them as they were.
        []),
    auditStatementWhen(
      db,
      { userId, actor, action: "archive", entity: "series", entityId: id, payload: input },
      schema.series,
      landed,
    ),
  ]);
  return { ok: true as const };
}

/** Bring a series back with the decks archived alongside it. Restoring twice is harmless. */
export async function restoreSeries(ctx: ServiceContext, id: string) {
  const { db, userId, actor } = ctx;
  const row = await ownedSeries(ctx, id);
  if (!row.archivedAt) return { ok: true as const };
  const at = row.archivedAt;
  const now = new Date();
  const stillArchived: SQL = sql`${schema.series.id} = ${id} and ${schema.series.userId} = ${userId} and ${schema.series.archivedAt} = ${at.getTime()}`;
  await runBatch(db, [
    // Decks and Activity first: both find the series by the archive time the last statement clears.
    db
      .update(schema.decks)
      .set({ archivedAt: null, updatedAt: now })
      .where(
        and(
          eq(schema.decks.seriesId, id),
          eq(schema.decks.userId, userId),
          eq(schema.decks.archivedAt, at),
          sql`exists (select 1 from series where ${stillArchived})`,
        ),
      ),
    auditStatementWhen(
      db,
      { userId, actor, action: "restore", entity: "series", entityId: id },
      schema.series,
      stillArchived,
    ),
    db.update(schema.series).set({ archivedAt: null, updatedAt: now }).where(stillArchived),
  ]);
  return { ok: true as const };
}
