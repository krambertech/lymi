import type { CardInput, CardPatch, CardSearchInput } from "@lymi/core";
import { newId, normaliseTerm, TEXT_MODES } from "@lymi/core";
import { and, asc, desc, eq, inArray, isNotNull, isNull, or } from "@lymi/core/db";
import { notesToText } from "@lymi/core/notes";
import type { Card } from "@lymi/core/schema";
import { auditStatement } from "../audit";
import { type Db, schema } from "../db";
import { selectIn } from "./batch";
import { type CardView, presentCard, presentCards } from "./card-view";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { memberOf } from "./members";
import { presentModeRow, resolveCardModes, stateStatementsForCard } from "./modes";
import { activeSectionOf } from "./sections";

/**
 * What happened to one card in an add. A duplicate is skipped, never rejected, and the
 * caller learns which card already holds the term and in which deck. See ADR 0004.
 */
export type AddCardOutcome =
  | { status: "added"; card: CardView }
  | { status: "skipped"; term: string; existing: CardView; deckName: string };

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
  const sectionIds = [...new Set(inputs.flatMap((i) => (i.sectionId ? [i.sectionId] : [])))];
  const sections = await selectIn(sectionIds, (ids) =>
    db
      .select({ id: schema.sections.id, deckId: schema.sections.deckId })
      .from(schema.sections)
      .where(and(inArray(schema.sections.id, ids), isNull(schema.sections.archivedAt))),
  );
  const sectionDeck = new Map(sections.map((s) => [s.id, s.deckId]));

  // Resolve language and key per input, then look up every key in one query.
  const prepared = inputs.map((input) => {
    const deck = deckById.get(input.deckId);
    if (!deck) throw notFound("Deck");
    if (deck.userId !== userId) {
      throw new ServiceError("forbidden", "Only the deck's owner can add cards to it");
    }
    if (input.sectionId && sectionDeck.get(input.sectionId) !== deck.id) throw notFound("Section");
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
  const outcomes: RawOutcome[] = [];
  // One group per card: the card, live learner states, and its audit row. A group never
  // splits across batches, so a failed batch leaves no partially created card.
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
    const modes = resolveCardModes(input, null);
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
      directions: modes?.directions ?? null,
      reviewModeKeys: modes?.reviewModeKeys ?? null,
      imageVersion: null,
      importId: null,
      externalId: null,
      sectionId: input.sectionId ?? null,
      meaningSource: input.meaningSource ?? (input.meaning ? "manual" : null),
      exampleSource: input.exampleSource ?? (input.example ? "manual" : null),
      audioKey: null,
      createdBy: actor,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    groups.push([
      db.insert(schema.cards).values(card),
      // A new card has no picture yet, so only its text modes can be asked.
      ...stateStatementsForCard(db, id, now, TEXT_MODES),
      auditStatement(db, {
        userId,
        actor,
        action: "create",
        entity: "card",
        entityId: id,
        payload: input,
      }),
    ]);
    // Later inputs in this batch with the same key are duplicates of this one.
    existing.set(dupKey(language, key), { card, deckName: deck.name });
    outcomes.push({ status: "added", card });
  }

  await runInBatches(db, groups);
  const views = await presentCards(
    db,
    outcomes.map((o) => (o.status === "added" ? o.card : o.existing)),
  );
  return outcomes.map((outcome, index) => {
    const card = views[index] as CardView;
    return outcome.status === "added" ? { status: "added", card } : { ...outcome, existing: card };
  });
}

type RawOutcome =
  | { status: "added"; card: Card }
  | { status: "skipped"; term: string; existing: Card; deckName: string };

type Statement = Parameters<Db["batch"]>[0][number];

/**
 * D1 caps a batch. Whole groups go into a batch, up to about fifty statements, so a card,
 * its live membership fan-out, and its audit row always land together.
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
  const matched = needle
    ? rows.filter((row) => matchesSearch(row.card, needle)).slice(0, limit)
    : rows;
  const cards = await presentCards(
    db,
    matched.map((row) => row.card),
  );
  return matched.map((row, index) => ({ card: cards[index] as CardView, deckName: row.deckName }));
}

/** The most rows one text search reads before matching. */
export const SEARCH_SCAN_LIMIT = 5000;

/** Case and Unicode folding for search, the same rule as the duplicate key. */
export function foldForSearch(text: string): string {
  return normaliseTerm(text);
}

/** True when the folded needle occurs in the term, meaning, example or the notes' words. */
export function matchesSearch(
  card: Pick<Card, "normalizedTerm" | "meaning" | "example" | "notes">,
  needle: string,
): boolean {
  if (card.normalizedTerm.includes(needle)) return true;
  const notes = card.notes && notesToText(card.notes);
  for (const field of [card.meaning, card.example, notes]) {
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

/** A card with its review modes, for callers outside the server. */
export async function showCard(ctx: ServiceContext, id: string): Promise<CardView> {
  return presentCard(ctx.db, await getCard(ctx, id));
}

/** The card, or forbidden when the learner can see it but does not own it. */
export async function ownedCard(ctx: ServiceContext, id: string) {
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
    states: states.map(presentModeRow),
    reviews: reviews.map(presentModeRow),
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
  const deckId = patch.deckId ?? current.deckId;
  if (patch.sectionId) await activeSectionOf(ctx, deckId, patch.sectionId);
  // A section belongs to one deck, so a card that changes deck leaves its section unless given one there.
  const section =
    patch.sectionId !== undefined
      ? { sectionId: patch.sectionId }
      : deckId !== current.deckId
        ? { sectionId: null }
        : {};
  // Always recompute the duplicate key, so a card whose stored key predates normaliseTerm()
  // (the 0002 backfill used SQLite's ASCII-only lower()) is repaired by any edit.
  const normalizedTerm = normaliseTerm(patch.term ?? current.term);
  const pronunciationChanged =
    (patch.term !== undefined && patch.term !== current.term) ||
    (patch.language !== undefined && patch.language !== current.language);
  const { reviewModes, directions: _legacy, ...fields } = patch;
  const modes = resolveCardModes(
    patch,
    current.directions ? (current.reviewModeKeys ?? null) : null,
  );
  const update = db
    .update(schema.cards)
    .set({
      ...fields,
      ...(modes ?? {}),
      ...section,
      normalizedTerm,
      ...(pronunciationChanged ? { audioKey: null } : {}),
      updatedAt: new Date(),
    })
    .where(eq(schema.cards.id, id));
  await runInBatches(db, [
    [
      update,
      ...(modes || patch.deckId !== undefined ? stateStatementsForCard(db, id) : []),
      auditStatement(db, {
        userId,
        actor,
        action: "update",
        entity: "card",
        entityId: id,
        payload: patch,
      }),
    ],
  ]);
  return showCard(ctx, id);
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
  const update = db
    .update(schema.cards)
    .set({ archivedAt, updatedAt: new Date() })
    .where(eq(schema.cards.id, id));
  await runInBatches(db, [
    [
      update,
      ...(archivedAt === null ? stateStatementsForCard(db, id) : []),
      auditStatement(db, {
        userId,
        actor,
        action: archivedAt ? "archive" : "restore",
        entity: "card",
        entityId: id,
      }),
    ],
  ]);
}
