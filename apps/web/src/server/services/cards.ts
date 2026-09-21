import type {
  Actor,
  CardEditInput,
  CardInput,
  CardPatch,
  CardSearchInput,
  StatedFieldSource,
  TerseCardOutcomeOut,
} from "@lymi/core";
import { needsEnrichment, newId, normaliseTerm, TEXT_MODES } from "@lymi/core";
import { and, asc, desc, eq, inArray, isNotNull, isNull } from "@lymi/core/db";
import { notesToText } from "@lymi/core/notes";
import type { Card } from "@lymi/core/schema";
import { type Db, schema } from "../db";
import { auditStatement } from "./audit";
import { runBatch, runInBatches, type Statement, selectIn } from "./batch";
import { type CardView, editionText, inEdition, presentCard, presentCards } from "./card-view";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { type EnrichmentQueue, queueEnrichment } from "./enrichment";
import { memberOf } from "./members";
import {
  presentModeRow,
  resolveCardModes,
  stateStatementsForCard,
  stateStatementsForCards,
} from "./modes";
import { bumped } from "./revisions";

/**
 * What happened to one card in an add. A duplicate is skipped, never rejected, and the
 * caller learns which card already holds the term and in which deck. See ADR 0004.
 */
export type AddCardOutcome =
  | { id: string; status: "added"; card: CardView }
  | { id: string; status: "skipped"; term: string; existing: CardView; deckName: string };

/** Only the learner in the app enriches unless asked; an integration opts in per card. */
function wantsEnrichment(input: CardInput, actor: Actor): boolean {
  return input.enrich ?? actor === "user";
}

/** One card. Same rule as the batch, one outcome. */
export async function addCard(
  ctx: ServiceContext,
  input: CardInput,
  enrichment?: EnrichmentQueue | null,
): Promise<AddCardOutcome> {
  const [outcome] = await addCards(ctx, [input], enrichment);
  if (!outcome) throw new Error("addCards returned no outcome for one input");
  return outcome;
}

/**
 * Add one or many cards. Each gets its scheduling state rows, one per learner of the deck.
 * Duplicates, against the learner's active cards and against earlier cards in the same
 * batch, are skipped and reported. Order of outcomes matches order of inputs. Only the
 * deck's owner adds; a member gets forbidden, a stranger not found.
 *
 * Given an enrichment queue, every added card that asks for enrichment and has an empty field
 * starts at `working` and one background run fills it. Without one, the cards stay exactly as
 * they arrived. ADR 0002.
 */
export async function addCards(
  ctx: ServiceContext,
  inputs: CardInput[],
  enrichment?: EnrichmentQueue | null,
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
  const enriching: string[] = [];

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
      pronunciationSource: input.pronunciationSource ?? (input.pronunciation ? "manual" : null),
      enrichmentStatus: null,
      audioKey: null,
      createdBy: actor,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      revision: 1,
    };
    if (enrichment && wantsEnrichment(input, actor) && needsEnrichment(card)) {
      card.enrichmentStatus = "working";
      enriching.push(id);
    }
    groups.push([
      db.insert(schema.cards).values(card),
      // A new card has no picture yet, so only its text modes can be asked.
      ...stateStatementsForCard(db, id, now, TEXT_MODES),
      auditStatement(ctx, {
        entity: "card",
        action: "create",
        id,
        deckId: input.deckId,
        details: input,
      }),
    ]);
    // Later inputs in this batch with the same key are duplicates of this one.
    existing.set(dupKey(language, key), { card, deckName: deck.name });
    outcomes.push({ status: "added", card });
  }

  await runInBatches(db, groups);
  // The add stands whatever the queue does; a refused run leaves its cards saying so.
  if (
    enrichment &&
    enriching.length > 0 &&
    !(await queueEnrichment(db, userId, enriching, enrichment))
  ) {
    for (const outcome of outcomes) {
      if (outcome.status === "added" && enriching.includes(outcome.card.id)) {
        outcome.card.enrichmentStatus = "failed";
      }
    }
  }
  const views = await presentCards(
    db,
    outcomes.map((o) => (o.status === "added" ? o.card : o.existing)),
    userId,
  );
  return outcomes.map((outcome, index) => {
    const card = views[index] as CardView;
    return outcome.status === "added"
      ? { id: card.id, status: "added", card }
      : { ...outcome, id: card.id, existing: card };
  });
}

type RawOutcome =
  | { status: "added"; card: Card }
  | { status: "skipped"; term: string; existing: Card; deckName: string };

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
 * `archived` returns only cards archived on their own, in a deck that is still active, because
 * those are the ones restore can bring back; a card inside an archived deck returns with its deck.
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
          ? and(isNotNull(schema.cards.archivedAt), isNull(schema.decks.archivedAt))
          : and(isNull(schema.cards.archivedAt), isNull(schema.decks.archivedAt)),
        search.deckId ? eq(schema.cards.deckId, search.deckId) : undefined,
        search.language ? eq(schema.cards.language, search.language) : undefined,
      ),
    )
    .orderBy(search.archived ? desc(schema.cards.archivedAt) : desc(schema.cards.createdAt))
    .limit(needle ? SEARCH_SCAN_LIMIT : limit);
  // Matched against the edition the learner reads the deck in, so a search finds the words on
  // their screen. A learner who pinned none pays one indexed lookup that returns nothing.
  const editions = needle
    ? await editionText(
        db,
        userId,
        rows.map((row) => row.card),
      )
    : new Map();
  const matched = needle
    ? rows
        .filter((row) => matchesSearch(inEdition(row.card, editions.get(row.card.id)), needle))
        .slice(0, limit)
    : rows;
  const cards = await presentCards(
    db,
    matched.map((row) => row.card),
    userId,
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
  return presentCard(ctx.db, await getCard(ctx, id), ctx.userId);
}

/** The card, or forbidden when the learner can see it but does not own it. */
export async function ownedCard(ctx: ServiceContext, id: string) {
  const card = await getCard(ctx, id);
  assertOwner(ctx, card);
  return card;
}

function assertOwner({ userId }: ServiceContext, card: Card) {
  if (card.userId !== userId) {
    throw new ServiceError("forbidden", "Only the deck's owner can change its cards");
  }
}

/** The listed cards the learner can see, by id, in one query per slice of ids. */
async function visibleCards({ db, userId }: ServiceContext, ids: readonly string[]) {
  const rows = await selectIn([...new Set(ids)], (slice) =>
    db
      .select({ card: schema.cards })
      .from(schema.cards)
      .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
      .where(and(inArray(schema.cards.id, slice), memberOf(userId))),
  );
  return new Map(rows.map((row) => [row.card.id, row.card]));
}

/** A card a bulk write left alone, with the code and message a single write would have thrown. */
export type CardWriteError = {
  id: string;
  status: "error";
  code: ServiceError["code"];
  error: string;
};

/** Runs one card's checks; a refusal becomes that card's outcome instead of failing the others. */
function refusalOf(id: string, check: () => void): CardWriteError | null {
  try {
    check();
    return null;
  } catch (err) {
    if (err instanceof ServiceError) {
      return { id, status: "error", code: err.code, error: err.message };
    }
    throw err;
  }
}

/** One card's write and its audit row, and whether the card's review states need adding after it. */
type CardWrite = { id: string; statements: Statement[]; states: boolean };

/**
 * Cards per D1 batch. Each costs two statements, and the batch adds one set of state statements
 * for all of them, which keeps a batch under the fifty `runInBatches` allows.
 */
export const CARDS_PER_BATCH = 20;

/** The writes, then the missing review states of every card that needs them, in one statement per mode. */
function batchOf(db: Db, writes: CardWrite[], now: Date): Statement[] {
  const stated = writes.filter((write) => write.states).map((write) => write.id);
  return [
    ...writes.flatMap((write) => write.statements),
    ...(stated.length > 0 ? stateStatementsForCards(db, JSON.stringify(stated), now) : []),
  ];
}

/**
 * Runs a bulk write CARDS_PER_BATCH cards at a time and returns the ids of cards whose batch
 * failed. A D1 batch is atomic, so those cards are untouched, and the later batches still run.
 */
async function runCardWrites(db: Db, writes: CardWrite[], now: Date): Promise<Set<string>> {
  const failed = new Set<string>();
  for (let i = 0; i < writes.length; i += CARDS_PER_BATCH) {
    const slice = writes.slice(i, i + CARDS_PER_BATCH);
    try {
      await runBatch(db, batchOf(db, slice, now));
    } catch (err) {
      console.error("Bulk card write failed", {
        error: err instanceof Error ? err.name : typeof err,
      });
      for (const write of slice) failed.add(write.id);
    }
  }
  return failed;
}

function writeFailed(id: string): CardWriteError {
  return {
    id,
    status: "error",
    code: "unavailable",
    error: "Lymi could not save this card. Nothing on it changed; try it again.",
  };
}

/**
 * Ask the AI to fill one card, the way an add does. Only the card's owner may ask, so a member
 * of a shared deck is forbidden, and only a card with an empty field: one the AI has nothing
 * left to fill is refused rather than silently accepted. The card moves to `working` before the
 * run is handed over, so the shimmer the add path already draws appears with no second state.
 */
export async function requestEnrichment(
  ctx: ServiceContext,
  id: string,
  enrichment: EnrichmentQueue | null,
): Promise<CardView> {
  const { db, userId } = ctx;
  const card = await ownedCard(ctx, id);
  if (card.archivedAt) throw new ServiceError("invalid", "An archived card cannot be enriched");
  if (!needsEnrichment(card)) {
    throw new ServiceError("invalid", "This card has nothing left for the AI to fill in");
  }
  if (!enrichment) {
    throw new ServiceError("unavailable", "Enrichment is not configured on this server");
  }
  // A run already outstanding is the answer, so asking twice does not queue twice.
  if (card.enrichmentStatus === "working") return presentCard(db, card, userId);
  // `updatedAt` moves because the card did, and because the screen stops waiting on a card
  // that has said `working` for too long: a card added months ago must not read as stale.
  const working = { enrichmentStatus: "working" as const, updatedAt: new Date() };
  await db
    .update(schema.cards)
    .set(working)
    .where(and(eq(schema.cards.id, id), eq(schema.cards.userId, userId)));
  const queued = await queueEnrichment(db, userId, [id], enrichment);
  return presentCard(
    db,
    { ...card, ...working, ...(queued ? {} : { enrichmentStatus: "failed" as const }) },
    userId,
  );
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

/** A field's source after an edit: as stated, or the learner's when only the text was sent. */
function sourceAfter(text: string | undefined, stated: StatedFieldSource | undefined) {
  if (stated !== undefined || text === undefined) return stated;
  return text ? ("manual" as const) : null;
}

export async function updateCard(ctx: ServiceContext, id: string, patch: CardPatch) {
  const edit = { ...patch, cardId: id };
  const lookups = await editLookups(ctx, [edit]);
  const now = new Date();
  await runBatch(ctx.db, batchOf(ctx.db, [editWrite(ctx, lookups, edit, now)], now));
  return showCard(ctx, id);
}

export type EditCardOutcome = { id: string; status: "updated"; card: CardView } | CardWriteError;

/**
 * Edit many cards, each as `updateCard` would, with its own audit row. A card that is missing, not
 * the learner's, or refused its deck or section reports why, and so does a card whose batch failed
 * to save; the rest still land. Outcomes come back in the order of the edits.
 */
export async function updateCards(
  ctx: ServiceContext,
  edits: CardEditInput[],
): Promise<EditCardOutcome[]> {
  const { db, userId } = ctx;
  if (edits.length === 0) return [];
  const lookups = await editLookups(ctx, edits);
  const now = new Date();
  const writes: CardWrite[] = [];
  const refusals = edits.map((edit) =>
    refusalOf(edit.cardId, () => writes.push(editWrite(ctx, lookups, edit, now))),
  );
  const failed = await runCardWrites(db, writes, now);
  const written = await visibleCards(
    ctx,
    writes.filter((write) => !failed.has(write.id)).map((write) => write.id),
  );
  const views = new Map(
    (await presentCards(db, [...written.values()], userId)).map((view) => [view.id, view]),
  );
  return edits.map(({ cardId: id }, index) => {
    const refused = refusals[index];
    if (refused) return refused;
    const card = views.get(id);
    return failed.has(id) || !card ? writeFailed(id) : { id, status: "updated", card };
  });
}

type EditLookups = {
  cards: Map<string, Card>;
  ownedDecks: Set<string>;
  sectionDecks: Map<string, string>;
};

/** Every card, target deck and section a set of edits names, read once for the whole set. */
async function editLookups(ctx: ServiceContext, edits: CardEditInput[]): Promise<EditLookups> {
  const { db, userId } = ctx;
  const deckIds = [...new Set(edits.flatMap((edit) => (edit.deckId ? [edit.deckId] : [])))];
  const sectionIds = [
    ...new Set(edits.flatMap((edit) => (edit.sectionId ? [edit.sectionId] : []))),
  ];
  const [cards, decks, sections] = await Promise.all([
    visibleCards(
      ctx,
      edits.map((edit) => edit.cardId),
    ),
    selectIn(deckIds, (ids) =>
      db
        .select({ id: schema.decks.id })
        .from(schema.decks)
        .where(and(inArray(schema.decks.id, ids), eq(schema.decks.userId, userId))),
    ),
    selectIn(sectionIds, (ids) =>
      db
        .select({ id: schema.sections.id, deckId: schema.sections.deckId })
        .from(schema.sections)
        .where(and(inArray(schema.sections.id, ids), isNull(schema.sections.archivedAt))),
    ),
  ]);
  return {
    cards,
    ownedDecks: new Set(decks.map((deck) => deck.id)),
    sectionDecks: new Map(sections.map((section) => [section.id, section.deckId])),
  };
}

/** One card's edit and its audit row, or the ServiceError that refuses it. */
function editWrite(
  ctx: ServiceContext,
  lookups: EditLookups,
  { cardId: id, ...patch }: CardEditInput,
  now: Date,
): CardWrite {
  const { db } = ctx;
  const current = lookups.cards.get(id);
  if (!current) throw notFound("Card");
  assertOwner(ctx, current);
  if (patch.deckId && patch.deckId !== current.deckId && !lookups.ownedDecks.has(patch.deckId)) {
    throw notFound("Deck");
  }
  const deckId = patch.deckId ?? current.deckId;
  if (patch.sectionId && lookups.sectionDecks.get(patch.sectionId) !== deckId) {
    throw notFound("Section");
  }
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
  // Changing a field's text changes where it came from, so an AI fill an app rewrites loses its badge.
  const sources = {
    meaningSource: sourceAfter(patch.meaning, patch.meaningSource),
    exampleSource: sourceAfter(patch.example, patch.exampleSource),
    pronunciationSource: sourceAfter(patch.pronunciation, patch.pronunciationSource),
  };
  const modes = resolveCardModes(
    patch,
    current.directions ? (current.reviewModeKeys ?? null) : null,
  );
  const update = db
    .update(schema.cards)
    .set({
      ...fields,
      ...sources,
      ...(modes ?? {}),
      ...section,
      ...bumped("card", patch, current),
      normalizedTerm,
      ...(pronunciationChanged ? { audioKey: null } : {}),
      updatedAt: now,
    })
    .where(eq(schema.cards.id, id));
  return {
    id,
    statements: [
      update,
      auditStatement(ctx, { entity: "card", action: "update", id, deckId, details: patch }),
    ],
    states: modes !== undefined || patch.deckId !== undefined,
  };
}

/** Archive, never delete. Undo is `restoreCard`. Archiving an archived card changes nothing. */
export function archiveCard(ctx: ServiceContext, id: string) {
  return setArchived(ctx, id, new Date());
}

/** Restoring an active card changes nothing. */
export function restoreCard(ctx: ServiceContext, id: string) {
  return setArchived(ctx, id, null);
}

export type ArchiveCardOutcome = { id: string; status: "archived" | "restored" } | CardWriteError;

/**
 * Archive many cards, each as `archiveCard` would, with its own audit row. A card that is missing,
 * not the learner's, or in a batch that failed to save reports why; the rest are still archived.
 * Outcomes come back in the order of the ids.
 */
export function archiveCards(ctx: ServiceContext, ids: readonly string[]) {
  return setArchivedMany(ctx, ids, new Date());
}

/** Restore many cards, each as `restoreCard` would, by the same rules as `archiveCards`. */
export function restoreCards(ctx: ServiceContext, ids: readonly string[]) {
  return setArchivedMany(ctx, ids, null);
}

async function setArchived(ctx: ServiceContext, id: string, archivedAt: Date | null) {
  const cards = await visibleCards(ctx, [id]);
  const write = archiveWrite(ctx, cards, id, archivedAt);
  if (write) await runBatch(ctx.db, batchOf(ctx.db, [write], new Date()));
}

async function setArchivedMany(
  ctx: ServiceContext,
  ids: readonly string[],
  archivedAt: Date | null,
): Promise<ArchiveCardOutcome[]> {
  const cards = await visibleCards(ctx, ids);
  const now = new Date();
  const writes: CardWrite[] = [];
  const refusals = ids.map((id) =>
    refusalOf(id, () => {
      const write = archiveWrite(ctx, cards, id, archivedAt);
      if (write) writes.push(write);
    }),
  );
  const failed = await runCardWrites(ctx.db, writes, now);
  const status = archivedAt ? ("archived" as const) : ("restored" as const);
  return ids.map(
    (id, index) => refusals[index] ?? (failed.has(id) ? writeFailed(id) : { id, status }),
  );
}

/**
 * One card's archive or restore and its audit row, nothing when the card is already there, or the
 * ServiceError that refuses it.
 */
function archiveWrite(
  ctx: ServiceContext,
  cards: Map<string, Card>,
  id: string,
  archivedAt: Date | null,
): CardWrite | null {
  const current = cards.get(id);
  if (!current) throw notFound("Card");
  assertOwner(ctx, current);
  if ((current.archivedAt === null) === (archivedAt === null)) return null;
  return {
    id,
    statements: [
      ctx.db
        .update(schema.cards)
        .set({ archivedAt, updatedAt: new Date() })
        .where(eq(schema.cards.id, id)),
      auditStatement(ctx, {
        entity: "card",
        action: archivedAt ? "archive" : "restore",
        id,
        deckId: current.deckId,
      }),
    ],
    states: archivedAt === null,
  };
}

/** A card write reduced to the card's id and what happened to it, for a `terse` response. */
export function terseOutcome(
  outcome: AddCardOutcome | EditCardOutcome | ArchiveCardOutcome,
): TerseCardOutcomeOut {
  switch (outcome.status) {
    case "added":
      return {
        id: outcome.id,
        status: "added",
        enrichmentStatus: outcome.card.enrichmentStatus,
      };
    case "skipped":
      return {
        id: outcome.id,
        status: "skipped",
        enrichmentStatus: outcome.existing.enrichmentStatus,
      };
    case "error":
      return { id: outcome.id, status: "error", code: outcome.code, error: outcome.error };
    default:
      return { id: outcome.id, status: outcome.status };
  }
}
