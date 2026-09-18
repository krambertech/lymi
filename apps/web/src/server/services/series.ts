import type {
  SeriesDecksInput,
  SeriesDeleteInput,
  SeriesInput,
  SeriesOrderInput,
} from "@lymi/core";
import { newId } from "@lymi/core";
import { and, asc, eq, isNull, type SQL, sql } from "@lymi/core/db";
import { type Db, schema } from "../db";
import { auditStatement, auditStatementWhen } from "./audit";
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
 * those decks. A deleted series is gone from every list; only the audit trail still names it.
 */
export async function listSeries(ctx: ServiceContext) {
  const { db, userId } = ctx;
  const rows = await db
    .select()
    .from(schema.series)
    .where(and(eq(schema.series.userId, userId), isNull(schema.series.archivedAt)))
    .orderBy(asc(schema.series.position), asc(schema.series.createdAt), asc(schema.series.id));
  // The same rows and counts Library shows, so a series always adds up to its decks.
  const decks = rows.length > 0 ? await listDecks(ctx) : [];
  // Every listed series is active, so `archivedAt` would only ever be null.
  return rows.map(({ userId: _owner, revision: _revision, archivedAt: _gone, ...row }) => {
    const inSeries = decks.filter((deck) => deck.seriesId === row.id);
    return {
      ...row,
      deckIds: inSeries.map((deck) => deck.id),
      total: inSeries.reduce((sum, deck) => sum + deck.total, 0),
      due: inSeries.reduce((sum, deck) => sum + deck.due, 0),
    };
  });
}

export async function getSeries(ctx: ServiceContext, id: string) {
  await ownedSeries(ctx, id);
  const found = (await listSeries(ctx)).find((s) => s.id === id);
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
  const { db, userId } = ctx;
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
    auditStatement(ctx, { entity: "series", action: "create", id, details: input }),
  ]);
  return getSeries(ctx, id);
}

export async function renameSeries(ctx: ServiceContext, id: string, name: string) {
  const { db, userId } = ctx;
  const row = await ownedSeries(ctx, id);
  if (row.name !== name) {
    await runBatch(db, [
      db
        .update(schema.series)
        // A rename is text an edition translates, so every edition of it goes stale.
        .set({ name, revision: sql`revision + 1`, updatedAt: new Date() })
        .where(and(eq(schema.series.id, id), eq(schema.series.userId, userId))),
      auditStatement(ctx, { entity: "series", action: "update", id, details: { name } }),
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
  const { db, userId } = ctx;
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
    auditStatement(ctx, {
      entity: "series",
      action: "update",
      id,
      details: { deckIds: input.deckIds },
    }),
  ]);
  return getSeries(ctx, id);
}

/** Put every active series in a new order. The list must name each of them once, or 409. */
export async function reorderSeries(ctx: ServiceContext, input: SeriesOrderInput) {
  const { db, userId } = ctx;
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
      auditStatement(ctx, {
        entity: "series",
        action: "reorder",
        id: input.seriesIds[0] ?? userId,
        details: input,
      }),
    ]);
  }
  return listSeries(ctx);
}

/**
 * Delete a series for good. Its decks are either archived with it or stay in Library, and either
 * way they stop naming it, so nothing points at a series no one can reach. Deleting twice is
 * harmless.
 */
export async function deleteSeries(ctx: ServiceContext, id: string, input: SeriesDeleteInput) {
  const { db, userId } = ctx;
  const row = await ownedSeries(ctx, id);
  if (row.archivedAt) return { ok: true as const };
  const at = new Date();
  // Only the write that removed the series moves its decks and lands in Activity.
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
    // Archiving first, while the decks still name the series; clearing the pointer comes after.
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
      : []),
    // Nothing brings the series back, so every deck of it loses the pointer, archived or not.
    db
      .update(schema.decks)
      .set({ seriesId: null, position: 0, updatedAt: at })
      .where(
        and(
          eq(schema.decks.seriesId, id),
          eq(schema.decks.userId, userId),
          sql`exists (select 1 from series where ${landed})`,
        ),
      ),
    auditStatementWhen(
      ctx,
      { entity: "series", action: "archive", id, details: input },
      schema.series,
      landed,
    ),
  ]);
  return { ok: true as const };
}
