import type { CardInput, CardPatch, CardSearchInput } from "@lymi/core";
import { emptyState, expandDirections, newId, normaliseTerm, serializeState } from "@lymi/core";
import { and, asc, desc, eq, inArray, isNotNull, isNull, or, sql } from "@lymi/core/db";
import type { Card } from "@lymi/core/schema";
import { audit } from "../audit";
import { type Db, schema } from "../db";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { fillStates, learnersOf, memberOf } from "./members";

/**
 * What happened to one card in an add. A duplicate is skipped, never rejected, and the
 * caller learns which card already holds the term and in which deck. See ADR 0004.
 */
export type AddCardOutcome =
  | { status: "added"; card: Card }
  | { status: "skipped"; term: string; existing: Card; deckName: string };

/** One card. Same rule as the batch, one outcome. */
export async function addCard(ctx: ServiceContext, input: CardInput): Promise<AddCardOutcome> {
  const [outcome] = await addCards(ctx, [input]);
  if (!outcome) throw new Error("addCards returned no outcome for one input");
  return outcome;
}

/**
 * Add one or many cards. Each gets its scheduling state rows, one per learner of the deck.
 * Duplicates, against the learner's active cards and against earlier cards in the same
 * batch, are skipped and reported. Order of outcomes matches order of inputs. Only the
 * deck's owner adds; a member gets forbidden, a stranger not found.
 */
export async function addCards(
  ctx: ServiceContext,
  inputs: CardInput[],
): Promise<AddCardOutcome[]> {
  const { db, userId, actor } = ctx;
  if (inputs.length === 0) return [];

  const deckIds = [...new Set(inputs.map((i) => i.deckId))];
  const decks = await selectIn(deckIds, (ids) =>
    db
      .select({
        id: schema.decks.id,
        userId: schema.decks.userId,
        name: schema.decks.name,
        defaultLanguage: schema.decks.defaultLanguage,
        directions: schema.decks.directions,
      })
      .from(schema.decks)
      .where(and(inArray(schema.decks.id, ids), memberOf(userId), isNull(schema.decks.archivedAt))),
  );
  const deckById = new Map(decks.map((d) => [d.id, d]));
  const learnersByDeck = new Map<string, string[]>();
  for (const deck of decks) learnersByDeck.set(deck.id, await learnersOf({ db }, deck.id));

  // Resolve language and key per input, then look up every key in one query.
  const prepared = inputs.map((input) => {
    const deck = deckById.get(input.deckId);
    if (!deck) throw notFound("Deck");
    if (deck.userId !== userId) {
      throw new ServiceError("forbidden", "Only the deck's owner can add cards to it");
    }
    const language = input.language === undefined ? deck.defaultLanguage : input.language;
    return { input, deck, language, key: normaliseTerm(input.term) };
  });

  const existingRows = await selectIn([...new Set(prepared.map((p) => p.key))], (keys) =>
    db
      .select({ card: schema.cards, deckName: schema.decks.name })
      .from(schema.cards)
      .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
      .where(
        and(
          eq(schema.cards.userId, userId),
          isNull(schema.cards.archivedAt),
          inArray(schema.cards.normalizedTerm, keys),
        ),
      ),
  );
  const existing = new Map<string, { card: Card; deckName: string }>();
  for (const row of existingRows) {
    existing.set(dupKey(row.card.language, row.card.normalizedTerm), row);
  }

  const now = new Date();
  const outcomes: AddCardOutcome[] = [];
  // One group per card: the card, its states, its audit row. A group never splits across
  // batches, so a failed batch leaves no card without states.
  const groups: Statement[][] = [];

  for (const { input, deck, language, key } of prepared) {
    const hit = existing.get(dupKey(language, key));
    if (hit) {
      outcomes.push({
        status: "skipped",
        term: input.term,
        existing: hit.card,
        deckName: hit.deckName,
      });
      continue;
    }
    const id = newId();
    const card: Card = {
      id,
      userId,
      deckId: input.deckId,
      term: input.term,
      normalizedTerm: key,
      meaning: input.meaning ?? null,
      pronunciation: input.pronunciation ?? null,
      example: input.example ?? null,
      notes: input.notes ?? null,
      language,
      tags: input.tags ?? [],
      source: input.source ?? null,
      directions: input.directions ?? null,
      meaningSource: input.meaningSource ?? (input.meaning ? "manual" : null),
      exampleSource: input.exampleSource ?? (input.example ? "manual" : null),
      audioKey: null,
      createdBy: actor,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    const group: Statement[] = [db.insert(schema.cards).values(card)];
    for (const learner of learnersByDeck.get(deck.id) ?? [userId]) {
      for (const direction of expandDirections(input.directions ?? deck.directions)) {
        group.push(
          db.insert(schema.cardStates).values({
            id: newId(),
            cardId: id,
            userId: learner,
            direction,
            due: now,
            state: 0,
            fsrs: serializeState(emptyState(now)),
          }),
        );
      }
    }
    group.push(
      db.insert(schema.auditLog).values({
        id: newId(),
        userId,
        actor,
        action: "create",
        entity: "card",
        entityId: id,
        payload: input,
      }),
    );
    groups.push(group);
    // Later inputs in this batch with the same key are duplicates of this one.
    existing.set(dupKey(language, key), { card, deckName: deck.name });
    outcomes.push({ status: "added", card });
  }

  await runInBatches(db, groups);
  return outcomes;
}

type Statement = Parameters<Db["batch"]>[0][number];

/**
 * D1 caps a batch, and a lesson of 200 terms in a shared deck is thousands of statements.
 * Whole groups go into a batch, up to about fifty statements, so a card and its states
 * always land together.
 */
async function runInBatches(db: Db, groups: Statement[][]) {
  let batch: Statement[] = [];
  const flush = async () => {
    const [first, ...rest] = batch;
    if (first) await db.batch([first, ...rest]);
    batch = [];
  };
  for (const group of groups) {
    if (batch.length > 0 && batch.length + group.length > 50) await flush();
    batch.push(...group);
  }
  await flush();
}

/**
 * D1 allows 100 bound parameters per query and a lesson can be 200 terms, so `IN (...)`
 * lists are queried in slices. Returns every row across the slices.
 */
async function selectIn<T, R>(values: T[], select: (slice: T[]) => Promise<R[]>): Promise<R[]> {
  const size = 90;
  const rows: R[] = [];
  for (let i = 0; i < values.length; i += size) {
    rows.push(...(await select(values.slice(i, i + size))));
  }
  return rows;
}

/** A card with no language only matches other cards with no language. */
function dupKey(language: string | null, normalizedTerm: string): string {
  return `${language ?? ""} ${normalizedTerm}`;
}

export const SEARCH_LIMIT = 200;

/**
 * Cards matching a search, newest first, each with the name of the deck it is in.
 *
 * The filters run in SQL; the text match runs here. SQLite's `lower()` folds ASCII only, so
 * a LIKE on the stored text would miss "Привіт" for "привіт" and "École" for "école". The
 * candidate rows are folded with the same rule the duplicate key uses and matched in
 * memory. One learner's collection is a few thousand rows at most, and the scan is capped
 * at SEARCH_SCAN_LIMIT so a query can never read without bound. A persisted folded column
 * is the upgrade if the collection outgrows that.
 *
 * Active means the card and its deck are both unarchived: archiving a deck hides its cards
 * without touching them, so a card-only check would surface cards the learner cannot see.
 * `archived` returns the cards hidden either way.
 */
export async function searchCards({ db, userId }: ServiceContext, search: CardSearchInput) {
  const limit = Math.min(Math.max(search.limit ?? 50, 1), SEARCH_LIMIT);
  const needle = foldForSearch(search.query ?? "");
  const rows = await db
    .select({ card: schema.cards, deckName: schema.decks.name })
    .from(schema.cards)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .where(
      and(
        memberOf(userId),
        search.archived
          ? or(isNotNull(schema.cards.archivedAt), isNotNull(schema.decks.archivedAt))
          : and(isNull(schema.cards.archivedAt), isNull(schema.decks.archivedAt)),
        search.deckId ? eq(schema.cards.deckId, search.deckId) : undefined,
        search.language ? eq(schema.cards.language, search.language) : undefined,
      ),
    )
    .orderBy(desc(schema.cards.createdAt))
    .limit(needle ? SEARCH_SCAN_LIMIT : limit);
  if (!needle) return rows;
  return rows.filter((row) => matchesSearch(row.card, needle)).slice(0, limit);
}

/** The most rows one text search reads before matching. */
export const SEARCH_SCAN_LIMIT = 5000;

/** Case and Unicode folding for search, the same rule as the duplicate key. */
export function foldForSearch(text: string): string {
  return normaliseTerm(text);
}

/** True when the folded needle occurs in the term, meaning, example or notes. */
export function matchesSearch(
  card: Pick<Card, "normalizedTerm" | "meaning" | "example" | "notes">,
  needle: string,
): boolean {
  if (card.normalizedTerm.includes(needle)) return true;
  for (const field of [card.meaning, card.example, card.notes]) {
    if (field && foldForSearch(field).includes(needle)) return true;
  }
  return false;
}

/** A card in any deck the learner can see. */
export async function getCard({ db, userId }: ServiceContext, id: string) {
  const [row] = await db
    .select({ card: schema.cards })
    .from(schema.cards)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .where(and(eq(schema.cards.id, id), memberOf(userId)));
  if (!row) throw notFound("Card");
  return row.card;
}

/** The card, or forbidden when the learner can see it but does not own it. */
async function ownedCard(ctx: ServiceContext, id: string) {
  const card = await getCard(ctx, id);
  if (card.userId !== ctx.userId) {
    throw new ServiceError("forbidden", "Only the deck's owner can change its cards");
  }
  return card;
}

/**
 * A card's whole life: every review, and every write from the audit log, newest first.
 * Nothing about a word is hidden from the person learning it.
 */
export async function cardHistory(ctx: ServiceContext, id: string) {
  const { db, userId } = ctx;
  await getCard(ctx, id);
  const [states, reviews, writes] = await Promise.all([
    db
      .select()
      .from(schema.cardStates)
      .where(and(eq(schema.cardStates.cardId, id), eq(schema.cardStates.userId, userId)))
      .orderBy(asc(schema.cardStates.direction)),
    db
      .select()
      .from(schema.reviews)
      .where(and(eq(schema.reviews.cardId, id), eq(schema.reviews.userId, userId)))
      .orderBy(desc(schema.reviews.reviewedAt)),
    db
      .select()
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.userId, userId),
          eq(schema.auditLog.entity, "card"),
          eq(schema.auditLog.entityId, id),
        ),
      )
      .orderBy(desc(schema.auditLog.createdAt)),
  ]);
  return {
    states,
    reviews,
    events: writes.map((w) => ({
      id: w.id,
      actor: w.actor,
      action: w.action,
      at: w.createdAt,
      payload: w.payload ?? null,
    })),
  };
}

export async function updateCard(ctx: ServiceContext, id: string, patch: CardPatch) {
  const { db, userId, actor } = ctx;
  const current = await ownedCard(ctx, id);
  if (patch.deckId && patch.deckId !== current.deckId) {
    const [deck] = await db
      .select({ id: schema.decks.id })
      .from(schema.decks)
      .where(and(eq(schema.decks.id, patch.deckId), eq(schema.decks.userId, userId)));
    if (!deck) throw notFound("Deck");
  }
  // Always recompute the duplicate key, so a card whose stored key predates normaliseTerm()
  // (the 0002 backfill used SQLite's ASCII-only lower()) is repaired by any edit.
  const normalizedTerm = normaliseTerm(patch.term ?? current.term);
  const pronunciationChanged =
    (patch.term !== undefined && patch.term !== current.term) ||
    (patch.language !== undefined && patch.language !== current.language);
  await db
    .update(schema.cards)
    .set({
      ...patch,
      normalizedTerm,
      ...(pronunciationChanged ? { audioKey: null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.cards.id, id));
  const askedChanged =
    (patch.directions !== undefined && patch.directions !== current.directions) ||
    (patch.deckId !== undefined && patch.deckId !== current.deckId);
  if (askedChanged) await openCardDirections(ctx, id);
  await audit(db, {
    userId,
    actor,
    action: "update",
    entity: "card",
    entityId: id,
    payload: patch,
  });
  return getCard(ctx, id);
}

/**
 * A card whose own directions or deck changed may now be asked a way it has no state for,
 * for the owner or for any member. Fill the gap, due now, for every learner of its deck.
 */
async function openCardDirections({ db }: ServiceContext, cardId: string) {
  const [row] = await db
    .select({
      deckId: schema.cards.deckId,
      directions: sql<
        "recognition" | "production" | "both"
      >`coalesce(cards.directions, decks.directions)`,
    })
    .from(schema.cards)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .where(eq(schema.cards.id, cardId));
  if (!row) return;
  await fillStates(
    { db },
    [{ cardId, directions: expandDirections(row.directions) }],
    await learnersOf({ db }, row.deckId),
  );
}

/** Archive, never delete. Undo is `restoreCard`. */
export function archiveCard(ctx: ServiceContext, id: string) {
  return setArchived(ctx, id, new Date());
}

export function restoreCard(ctx: ServiceContext, id: string) {
  return setArchived(ctx, id, null);
}

async function setArchived(ctx: ServiceContext, id: string, archivedAt: Date | null) {
  const { db, userId, actor } = ctx;
  await ownedCard(ctx, id);
  const result = await db
    .update(schema.cards)
    .set({ archivedAt, updatedAt: new Date() })
    .where(eq(schema.cards.id, id))
    .returning({ id: schema.cards.id });
  if (result.length === 0) throw notFound("Card");
  await audit(db, {
    userId,
    actor,
    action: archivedAt ? "archive" : "restore",
    entity: "card",
    entityId: id,
  });
}
