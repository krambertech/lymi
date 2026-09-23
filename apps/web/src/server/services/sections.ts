import type {
  CardSectionInput,
  DeckProgress,
  SectionArchiveInput,
  SectionInput,
  SectionOrderInput,
  SectionStanding,
} from "@lymi/core";
import { deckProgress, newId, sectionsToStart } from "@lymi/core";
import { and, asc, eq, isNotNull, isNull, type SQL, sql } from "@lymi/core/db";
import { type Db, schema } from "../db";
import { auditStatement, auditStatementWhen } from "./audit";
import { runBatch } from "./batch";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { deckAccess, memberOf, ownedDeck } from "./members";
import { askedSql, stateStatementsForDeck } from "./modes";

type Statement = Parameters<Db["batch"]>[0][number];

/** A list of ids as one bound JSON parameter, since D1 caps a query at 100 parameters. */
const jsonIds = (ids: readonly string[]) => JSON.stringify(ids);

const sectionOrder = [
  asc(schema.sections.position),
  asc(schema.sections.createdAt),
  asc(schema.sections.id),
];

/**
 * True for a `cards` row the caller has started in a mode it is still asked in. The standings and
 * the draw share it, so a card the list shows as waiting is one the draw leaves out.
 */
export function startedSql(userId: string) {
  return sql`exists (
    select 1 from card_states as begun
    where begun.card_id = cards.id and begun.user_id = ${userId} and begun.state != 0
      and ${sql.raw(askedSql("begun.direction"))}
  )`;
}

/**
 * The caller's standing in every active section of the decks they can see, in deck order.
 * Known follows the state the deck's list shows for a card, so the count matches its marks.
 */
async function standings(ctx: ServiceContext, deckId?: string) {
  const { db, userId } = ctx;
  const leading = sql`(
    select leading.state from card_states as leading
    where leading.card_id = cards.id and leading.user_id = ${userId}
      and ${sql.raw(askedSql("leading.direction"))}
    order by case when leading.direction like 'image_%' then 0
      when leading.direction = 'recognition' then 1 else 2 end
    limit 1
  )`;
  const started = startedSql(userId);
  return db
    .select({
      id: schema.sections.id,
      deckId: schema.sections.deckId,
      progression: schema.decks.sectionProgression,
      total: sql<number>`count(${schema.cards.id})`,
      known: sql<number>`coalesce(sum(case when ${leading} = 2 then 1 else 0 end), 0)`,
      started: sql<number>`coalesce(sum(case when ${started} then 1 else 0 end), 0)`,
      opened: sql<number>`exists (
        select 1 from section_starts
        where section_starts.section_id = sections.id and section_starts.user_id = ${userId}
      )`,
    })
    .from(schema.sections)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.sections.deckId))
    .leftJoin(
      schema.cards,
      and(
        eq(schema.cards.sectionId, schema.sections.id),
        eq(schema.cards.deckId, schema.sections.deckId),
        isNull(schema.cards.archivedAt),
      ),
    )
    .where(
      and(
        isNull(schema.sections.archivedAt),
        isNull(schema.decks.archivedAt),
        memberOf(userId),
        deckId ? eq(schema.sections.deckId, deckId) : undefined,
      ),
    )
    .groupBy(schema.sections.id)
    .orderBy(asc(schema.sections.deckId), ...sectionOrder);
}

/** Where the caller stands in each deck with sections, by deck id. */
export async function progressByDeck(ctx: ServiceContext, deckId?: string) {
  const rows = await standings(ctx, deckId);
  const byDeck = new Map<string, { inOrder: boolean; sections: SectionStanding[] }>();
  for (const row of rows) {
    const deck = byDeck.get(row.deckId) ?? { inOrder: row.progression !== "open", sections: [] };
    deck.sections.push({
      id: row.id,
      total: Number(row.total),
      known: Number(row.known),
      started: Number(row.started),
      opened: !!row.opened,
    });
    byDeck.set(row.deckId, deck);
  }
  const out = new Map<string, DeckProgress>();
  for (const [id, deck] of byDeck) out.set(id, deckProgress(deck.sections, deck.inOrder));
  return out;
}

/**
 * True for a `cards` row that waits for the caller: in a section that is not open, and not started.
 * Every count of what can be reviewed filters with it. Undefined when nothing is locked.
 */
export async function waitingCardsSql(ctx: ServiceContext, deckId?: string) {
  const locked: string[] = [];
  for (const progress of (await progressByDeck(ctx, deckId)).values()) {
    for (const section of progress.sections) if (section.status !== "open") locked.push(section.id);
  }
  if (locked.length === 0) return undefined;
  return sql`(coalesce(${schema.cards.sectionId}, '') in (select value from json_each(${JSON.stringify(locked)}))
    and not ${startedSql(ctx.userId)})`;
}

/**
 * A deck's sections in order, each with the caller's standing, and where the caller is. Archived
 * sections come back only when asked for, with how many cards Restore returns.
 */
export async function listSections(
  ctx: ServiceContext,
  deckId: string,
  opts: { archived?: boolean | undefined } = {},
) {
  const { db } = ctx;
  const deck = await deckAccess(ctx, deckId);
  const found = await db
    .select()
    .from(schema.sections)
    .leftJoin(
      schema.sectionLocalizations,
      and(
        eq(schema.sectionLocalizations.sectionId, schema.sections.id),
        // A binding, not a column: the caller's pinned edition, or nothing when they pinned none.
        eq(schema.sectionLocalizations.language, deck.meaningLanguage ?? ""),
        eq(schema.sectionLocalizations.status, "approved"),
      ),
    )
    .where(
      and(
        eq(schema.sections.deckId, deckId),
        opts.archived ? isNotNull(schema.sections.archivedAt) : isNull(schema.sections.archivedAt),
      ),
    )
    .orderBy(...sectionOrder);
  const rows = found.map(({ sections: section, section_localizations: text }) => {
    const { revision: _revision, ...rest } = section;
    return { ...rest, name: text?.name ?? section.name };
  });

  if (opts.archived) {
    const withCards = await db
      .select({ sectionId: schema.cards.sectionId, count: sql<number>`count(*)` })
      .from(schema.cards)
      .innerJoin(schema.sections, eq(schema.sections.id, schema.cards.sectionId))
      .where(and(eq(schema.cards.deckId, deckId), sql`cards.archived_at = sections.archived_at`))
      .groupBy(schema.cards.sectionId);
    const archived = new Map(withCards.map((row) => [row.sectionId, Number(row.count)]));
    return {
      sections: rows.map((row) => ({
        ...row,
        total: 0,
        known: 0,
        notStarted: 0,
        knownNeeded: 0,
        status: "open" as const,
        archivedCards: archived.get(row.id) ?? 0,
      })),
      progress: null,
    };
  }

  const progress = (await progressByDeck(ctx, deckId)).get(deck.id);
  const byId = new Map(progress?.sections.map((s) => [s.id, s]));
  return {
    sections: rows.map((row) => {
      const standing = byId.get(row.id);
      return {
        ...row,
        total: standing?.total ?? 0,
        known: standing?.known ?? 0,
        notStarted: standing?.notStarted ?? 0,
        knownNeeded: standing?.knownNeeded ?? 0,
        status: standing?.status ?? ("open" as const),
        archivedCards: 0,
      };
    }),
    progress: progress?.currentId
      ? { currentId: progress.currentId, nextId: progress.nextId, ready: progress.ready }
      : null,
  };
}

/** A section the caller can see, active or archived, with its deck. */
async function sectionAccess(ctx: ServiceContext, id: string) {
  const [row] = await ctx.db.select().from(schema.sections).where(eq(schema.sections.id, id));
  if (!row) throw notFound("Section");
  const deck = await deckAccess(ctx, row.deckId).catch(() => {
    throw notFound("Section");
  });
  return { section: row, deck };
}

/** An active section the caller can see; an archived one is not found, since nothing reviews in it. */
export async function visibleSection(ctx: ServiceContext, id: string) {
  const { section } = await sectionAccess(ctx, id);
  if (section.archivedAt) throw notFound("Section");
  return section;
}

/** A section of a deck the caller owns, or forbidden when they only study it. */
async function ownedSection(ctx: ServiceContext, id: string) {
  const found = await sectionAccess(ctx, id);
  if (found.deck.role !== "owner") {
    throw new ServiceError("forbidden", "Only the deck's owner can change its sections");
  }
  return found;
}

/** An active section of this deck, or not found; what a card may be put in. */
export async function activeSectionOf({ db }: ServiceContext, deckId: string, sectionId: string) {
  const [row] = await db
    .select({ id: schema.sections.id })
    .from(schema.sections)
    .where(
      and(
        eq(schema.sections.id, sectionId),
        eq(schema.sections.deckId, deckId),
        isNull(schema.sections.archivedAt),
      ),
    );
  if (!row) throw notFound("Section");
  return row;
}

async function getSection(ctx: ServiceContext, id: string) {
  const { section, deck } = await sectionAccess(ctx, id);
  const list = await listSections(ctx, deck.id, { archived: !!section.archivedAt });
  const found = list.sections.find((s) => s.id === id);
  if (!found) throw notFound("Section");
  return found;
}

/** One statement that moves the listed cards of a deck into a section, or out of theirs. */
function placeCards(
  db: Db,
  deckId: string,
  sectionId: string | null,
  cardIds: readonly string[],
  at: Date,
) {
  return db
    .update(schema.cards)
    .set({ sectionId, updatedAt: at })
    .where(
      and(
        eq(schema.cards.deckId, deckId),
        sql`${schema.cards.id} in (select value from json_each(${jsonIds(cardIds)}))`,
      ),
    );
}

/** The listed cards, each active and in this deck, or not found. */
async function cardsOfDeck({ db }: ServiceContext, deckId: string, cardIds: readonly string[]) {
  if (cardIds.length === 0) return;
  const [row] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.cards)
    .where(
      and(
        eq(schema.cards.deckId, deckId),
        isNull(schema.cards.archivedAt),
        sql`${schema.cards.id} in (select value from json_each(${jsonIds(cardIds)}))`,
      ),
    );
  if (Number(row?.count ?? 0) !== cardIds.length) throw notFound("Card");
}

export async function createSection(ctx: ServiceContext, deckId: string, input: SectionInput) {
  const { db } = ctx;
  await ownedDeck(ctx, deckId);
  const cardIds = input.cardIds ?? [];
  await cardsOfDeck(ctx, deckId, cardIds);
  const [last] = await db
    .select({ next: sql<number>`coalesce(max(${schema.sections.position}), -1) + 1` })
    .from(schema.sections)
    .where(and(eq(schema.sections.deckId, deckId), isNull(schema.sections.archivedAt)));
  const id = newId();
  const now = new Date();
  await runBatch(db, [
    db.insert(schema.sections).values({ id, deckId, name: input.name, position: last?.next ?? 0 }),
    ...(cardIds.length > 0 ? [placeCards(db, deckId, id, cardIds, now)] : []),
    auditStatement(ctx, { entity: "section", action: "create", id, details: { deckId, ...input } }),
  ]);
  return getSection(ctx, id);
}

export async function renameSection(ctx: ServiceContext, id: string, name: string) {
  const { db } = ctx;
  const { section } = await ownedSection(ctx, id);
  if (section.name !== name) {
    await runBatch(db, [
      db
        .update(schema.sections)
        // A rename is text an edition translates, so every edition of it goes stale.
        .set({ name, revision: sql`revision + 1`, updatedAt: new Date() })
        .where(eq(schema.sections.id, id)),
      auditStatement(ctx, { entity: "section", action: "update", id, details: { name } }),
    ]);
  }
  return getSection(ctx, id);
}

/** Put every active section of a deck in a new order. The list must name each once, or 409. */
export async function reorderSections(
  ctx: ServiceContext,
  deckId: string,
  input: SectionOrderInput,
) {
  const { db } = ctx;
  await ownedDeck(ctx, deckId);
  const current = await db
    .select({ id: schema.sections.id, position: schema.sections.position })
    .from(schema.sections)
    .where(and(eq(schema.sections.deckId, deckId), isNull(schema.sections.archivedAt)))
    .orderBy(...sectionOrder);
  const known = new Set(current.map((row) => row.id));
  if (input.sectionIds.length !== known.size || input.sectionIds.some((s) => !known.has(s))) {
    throw new ServiceError("conflict", "The deck's sections changed. Reload and try again.");
  }
  const unchanged = input.sectionIds.every(
    (sectionId, position) =>
      current[position]?.id === sectionId && current[position]?.position === position,
  );
  if (!unchanged) {
    const list = jsonIds(input.sectionIds);
    await runBatch(db, [
      db
        .update(schema.sections)
        .set({
          position: sql`(select key from json_each(${list}) where value = sections.id)`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(schema.sections.deckId, deckId),
            isNull(schema.sections.archivedAt),
            sql`${schema.sections.id} in (select value from json_each(${list}))`,
          ),
        ),
      auditStatement(ctx, {
        entity: "section",
        action: "reorder",
        id: input.sectionIds[0] ?? deckId,
        details: { deckId, ...input },
      }),
    ]);
  }
  return listSections(ctx, deckId);
}

/**
 * Put cards of one deck in a section, or take them out of theirs. Schedules and history stay.
 * Cards already where they are asked to go change nothing and add nothing to Activity.
 */
export async function setCardsSection(
  ctx: ServiceContext,
  deckId: string,
  input: CardSectionInput,
) {
  const { db } = ctx;
  await ownedDeck(ctx, deckId);
  if (input.sectionId) await activeSectionOf(ctx, deckId, input.sectionId);
  await cardsOfDeck(ctx, deckId, input.cardIds);
  const [moving] = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.cards)
    .where(
      and(
        eq(schema.cards.deckId, deckId),
        sql`${schema.cards.id} in (select value from json_each(${jsonIds(input.cardIds)}))`,
        input.sectionId
          ? sql`(${schema.cards.sectionId} is null or ${schema.cards.sectionId} != ${input.sectionId})`
          : sql`${schema.cards.sectionId} is not null`,
      ),
    );
  if (Number(moving?.count ?? 0) > 0) {
    await runBatch(db, [
      placeCards(db, deckId, input.sectionId, input.cardIds, new Date()),
      auditStatement(ctx, {
        entity: "section",
        action: "move",
        id: input.sectionId ?? deckId,
        details: { deckId, ...input },
      }),
    ]);
  }
  return listSections(ctx, deckId);
}

/**
 * Archive a section. Its cards either leave with it, stamped with the section's own
 * `archived_at` so Restore finds exactly them, or stay in the deck without a section.
 */
export async function archiveSection(ctx: ServiceContext, id: string, input: SectionArchiveInput) {
  const { db } = ctx;
  const { section } = await ownedSection(ctx, id);
  if (section.archivedAt) return { ok: true as const };
  const at = new Date();
  const landed: SQL = sql`${schema.sections.id} = ${id} and ${schema.sections.archivedAt} = ${at.getTime()}`;
  await runBatch(db, [
    db
      .update(schema.sections)
      .set({ archivedAt: at, updatedAt: at })
      .where(and(eq(schema.sections.id, id), isNull(schema.sections.archivedAt))),
    ...(input.cards === "archive"
      ? [
          db
            .update(schema.cards)
            .set({ archivedAt: at, updatedAt: at })
            .where(
              and(
                eq(schema.cards.sectionId, id),
                isNull(schema.cards.archivedAt),
                sql`exists (select 1 from sections where ${landed})`,
              ),
            ),
        ]
      : // Kept cards keep `section_id`, so Restore regroups them as they were.
        []),
    auditStatementWhen(
      ctx,
      { entity: "section", action: "archive", id, details: input },
      schema.sections,
      landed,
    ),
  ]);
  return { ok: true as const };
}

/** Bring a section back with the cards archived alongside it. Restoring twice is harmless. */
export async function restoreSection(ctx: ServiceContext, id: string) {
  const { db } = ctx;
  const { section } = await ownedSection(ctx, id);
  if (!section.archivedAt) return { ok: true as const };
  const at = section.archivedAt;
  const now = new Date();
  const stillArchived: SQL = sql`${schema.sections.id} = ${id} and ${schema.sections.archivedAt} = ${at.getTime()}`;
  await runBatch(db, [
    // Cards and Activity first: both find the section by the archive time the last statement clears.
    db
      .update(schema.cards)
      .set({ archivedAt: null, updatedAt: now })
      .where(
        and(
          eq(schema.cards.sectionId, id),
          eq(schema.cards.archivedAt, at),
          sql`exists (select 1 from sections where ${stillArchived})`,
        ),
      ),
    // A restored card may be asked in a mode its deck gained while it was away.
    ...stateStatementsForDeck(db, section.deckId),
    auditStatementWhen(
      ctx,
      { entity: "section", action: "restore", id },
      schema.sections,
      stillArchived,
    ),
    db.update(schema.sections).set({ archivedAt: null, updatedAt: now }).where(stillArchived),
  ]);
  return { ok: true as const };
}

/**
 * In a deck whose sections open automatically, open each section the caller has made ready, as
 * Start would. The row is written once, so a card forgotten later never locks the section again.
 */
export async function openReadySections(ctx: ServiceContext, deckId: string) {
  // A section can be ready the moment the one before it opens, when its cards were already started.
  for (let step = 0; step < 50; step++) {
    const progress = (await progressByDeck(ctx, deckId)).get(deckId);
    if (!progress?.ready || !progress.nextId) return;
    await openSections(ctx, progress, progress.nextId, "auto");
  }
}

/** Write the start rows that open `targetId`, with one Activity entry when this write opened it. */
async function openSections(
  ctx: ServiceContext,
  progress: DeckProgress,
  targetId: string,
  how: "ready" | "early" | "auto",
) {
  const { db, userId } = ctx;
  const opening = sectionsToStart(progress, targetId);
  if (opening.length === 0) return;
  const now = new Date();
  // A retry or a second device finds the target's row already there, so only the first start is recorded.
  const landed: SQL = sql`${schema.sectionStarts.sectionId} = ${targetId} and ${schema.sectionStarts.userId} = ${userId} and ${schema.sectionStarts.startedAt} = ${now.getTime()}`;
  await runBatch(db, [
    ...opening.map((sectionId) =>
      db
        .insert(schema.sectionStarts)
        .values({ id: newId(), sectionId, userId, how, startedAt: now })
        .onConflictDoNothing(),
    ),
    auditStatementWhen(
      ctx,
      { entity: "section", action: "start", id: targetId, details: { how, sectionIds: opening } },
      schema.sectionStarts,
      landed,
    ),
  ]);
}

/**
 * Open a section for the caller, and every section before it that was not open. Starting one
 * that is already open changes nothing, so a retry or a second device lands the same.
 */
export async function startSection(ctx: ServiceContext, id: string) {
  const { section, deck } = await sectionAccess(ctx, id);
  if (section.archivedAt) throw notFound("Section");
  const progress = (await progressByDeck(ctx, deck.id)).get(deck.id);
  if (progress) {
    await openSections(
      ctx,
      progress,
      id,
      progress.nextId === id && progress.ready ? "ready" : "early",
    );
  }
  return listSections(ctx, deck.id);
}
