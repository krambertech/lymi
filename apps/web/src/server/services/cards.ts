import type {
  Actor,
  CardEditInput,
  CardInput,
  CardPatch,
  FieldSource,
  TerseCardOutcomeOut,
} from "@lymi/core";
import {
  DECK_ENRICH_FIELDS,
  type DeckEnrichField,
  deckEnrichFields,
  duplicateKey,
  emptyFields,
  enrichmentStalled,
  fieldsToFill,
  foldApostrophes,
  type NormalizedField,
  needsEnrichment,
  newId,
  normaliseTerm,
  normalizeCardText,
  readingKey,
  sameReading,
  speechInputs,
  stripReadings,
  TEXT_MODES,
  termKey,
} from "@lymi/core";
import { eventLanguages, TYPED_CARD_FIELDS, type TypedCardField } from "@lymi/core/analytics";
import { and, asc, desc, eq, inArray, isNull, sql } from "@lymi/core/db";
import { notesToText } from "@lymi/core/notes";
import type { Card } from "@lymi/core/schema";
import { type Db, schema } from "../db";
import { type AnalyticsEvent, track } from "./analytics";
import { auditStatement } from "./audit";
import { runBatch, runInBatches, type Statement, selectIn } from "./batch";
import { type CardView, presentCard, presentCards } from "./card-view";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { addRunId, type EnrichmentQueue, queueEnrichment, runState } from "./enrichment";
import { memberOf } from "./members";
import {
  presentModeRow,
  resolveCardModes,
  stateStatementsForCard,
  stateStatementsForCards,
} from "./modes";
import { bumped } from "./revisions";
import { syncTagStatements } from "./tags";

/**
 * What happened to one card in an add. A duplicate is skipped, never rejected, and the
 * caller learns which card already holds the term and in which deck. See ADR 0004.
 */
export type AddCardOutcome =
  | { id: string; status: "added"; card: CardView; normalized?: NormalizedField[] }
  | { id: string; status: "skipped"; term: string; existing: CardView; deckName: string };

type Sources = {
  meaningSource?: FieldSource | null | undefined;
  exampleSource?: FieldSource | null | undefined;
  pronunciationSource?: FieldSource | null | undefined;
  notesSource?: FieldSource | null | undefined;
  hookSource?: FieldSource | null | undefined;
};
/**
 * A card write from inside the server, which may record Lymi's own AI as a field's source. No
 * caller can claim it; routes parse `CardInput`.
 */
export type ServerCardInput = Omit<CardInput, keyof Sources> & Sources;
type Cleared = "meaning" | "pronunciation" | "hook";
export type ServerCardPatch = Omit<CardPatch, keyof Sources | Cleared> &
  Sources & {
    /** Null clears a field back to never set, which a split and Undo need. */
    meaning?: string | null | undefined;
    pronunciation?: string | null | undefined;
    hook?: string | null | undefined;
    /** The revision the card held this text at, for a write that puts earlier text back. */
    revision?: number | undefined;
  };
type ServerCardEdit = Omit<CardEditInput, keyof Sources | Cleared> &
  Sources & {
    meaning?: string | null | undefined;
    pronunciation?: string | null | undefined;
    hook?: string | null | undefined;
    revision?: number | undefined;
  };

/** A publisher's curated decks each stand alone, so its terms repeat across decks but not within one. ADR 0004. */
export type AddCardsOptions = {
  allowCrossDeckDuplicates?: boolean;
  /** Smart add's pick list, so `cards_added` tells its cards from typed ones. */
  fromLesson?: boolean;
  /** The Mac app's quick-add panel, so `cards_added` tells its cards from the app's own. */
  entry?: "desktop_panel" | undefined;
};

/** Only the learner in the app enriches unless asked; an integration opts in per card. */
function wantsEnrichment(input: ServerCardInput, actor: Actor): boolean {
  return input.enrich ?? actor === "user";
}

/** One card. Same rule as the batch, one outcome. */
export async function addCard(
  ctx: ServiceContext,
  input: ServerCardInput,
  enrichment?: EnrichmentQueue | null,
  options: AddCardsOptions = {},
): Promise<AddCardOutcome> {
  const [outcome] = await addCards(ctx, [input], enrichment, options);
  if (!outcome) throw new Error("addCards returned no outcome for one input");
  return outcome;
}

/**
 * Add one or many cards. Each gets its scheduling state rows, one per learner of the deck.
 * Duplicates, against the learner's active cards and against earlier cards in the same
 * batch, are skipped and reported. Order of outcomes matches order of inputs. Only the
 * deck's owner adds; a member gets forbidden, a stranger not found.
 *
 * Given an enrichment queue, every added card that asks for enrichment and has a field never set
 * starts at `working` and one background run fills it. Without one, the cards stay exactly as
 * they arrived. ADR 0002.
 */
export async function addCards(
  ctx: ServiceContext,
  inputs: ServerCardInput[],
  enrichment?: EnrichmentQueue | null,
  options: AddCardsOptions = {},
): Promise<AddCardOutcome[]> {
  const { db, userId, actor } = ctx;
  if (inputs.length === 0) return [];

  // A create sent again with its id returns the card the first one made, before any check that
  // could now refuse it: its deck may have been archived since the first one landed.
  const chosenIds = inputs.flatMap((i) => (i.id ? [i.id] : []));
  const claimed = await selectIn(chosenIds, (ids) =>
    db.select().from(schema.cards).where(inArray(schema.cards.id, ids)),
  );
  const replayed = new Map<string, Card>();
  for (const card of claimed) {
    if (card.userId !== userId) throw new ServiceError("conflict", "That card id is taken");
    replayed.set(card.id, card);
  }

  const deckIds = [...new Set(inputs.map((i) => i.deckId))];
  const decks = await selectIn(deckIds, (ids) =>
    db
      .select({
        id: schema.decks.id,
        userId: schema.decks.userId,
        name: schema.decks.name,
        defaultLanguage: schema.decks.defaultLanguage,
        directions: schema.decks.directions,
        purpose: schema.decks.purpose,
        enrichFields: schema.decks.enrichFields,
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

  // Resolve language, stored text and key per input, then look up every key in one query.
  const prepared = inputs.map((sent) => {
    if (sent.id && replayed.has(sent.id)) {
      return { input: sent, deck: null, language: null, key: "", normalized: [] };
    }
    const deck = deckById.get(sent.deckId);
    if (!deck) throw notFound("Deck");
    if (deck.userId !== userId) {
      throw new ServiceError("forbidden", "Only the deck's owner can add cards to it");
    }
    if (sent.sectionId && sectionDeck.get(sent.sectionId) !== deck.id) throw notFound("Section");
    const language = sent.language === undefined ? deck.defaultLanguage : sent.language;
    const { fields: input, normalized } = normalizeCardText(language, sent);
    return { input, deck, language, key: termKey(language, input.term), normalized };
  });

  const terms = prepared.flatMap((p) => (p.deck ? [p.key] : []));
  const existingRows = await selectIn([...new Set(terms)], (keys) =>
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
  // Several cards can share a key: homographs told apart by their readings.
  const existing = new Map<string, { card: Card; deckName: string }[]>();
  const hold = (row: { card: Card; deckName: string }) => {
    const key = duplicateKey(row.card.language, row.card.normalizedTerm);
    existing.set(key, [...(existing.get(key) ?? []), row]);
  };
  for (const row of existingRows) hold(row);

  const now = new Date();
  const outcomes: RawOutcome[] = [];
  // One group per card: the card, live learner states, and its audit row. A group never
  // splits across batches, so a failed batch leaves no partially created card.
  const groups: Statement[][] = [];
  let enriching: string[] = [];
  // The add's first card, whose id names its run, and whether any card is a replay still waiting.
  let firstAdded: string | undefined;
  let replayedWorking = false;
  // Which optional fields the new cards hold, for the typed add's event; never their text.
  const filled = new Set<TypedCardField>();

  for (const { input, deck, language, key, normalized } of prepared) {
    const again = input.id ? replayed.get(input.id) : undefined;
    if (again || !deck) {
      if (again) {
        outcomes.push({ status: "added", card: again });
        firstAdded ??= again.id;
      }
      // The first add saved the card at `working` but may have died before handing over its run,
      // and a replay is the only request that will ever come for it. Below, a replay of an add
      // whose run is still going leaves it to that run, so the model is asked once.
      if (again?.enrichmentStatus === "working" && enrichment) {
        enriching.push(again.id);
        replayedWorking = true;
      }
      continue;
    }
    const reading = readingKey({
      term: input.term,
      language,
      pronunciation: input.pronunciation,
    });
    const hit = existing
      .get(duplicateKey(language, key))
      ?.find(
        (row) =>
          (!options.allowCrossDeckDuplicates || row.card.deckId === deck.id) &&
          sameReading(readingKey(row.card), reading),
      );
    if (hit) {
      outcomes.push({
        status: "skipped",
        term: input.term,
        existing: hit.card,
        deckName: hit.deckName,
      });
      continue;
    }
    const id = input.id ?? newId();
    firstAdded ??= id;
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
      hook: input.hook || null,
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
      notesSource: input.notesSource ?? (input.notes ? "manual" : null),
      hookSource: input.hook ? (input.hookSource ?? "manual") : null,
      hookDraft: null,
      enrichmentStatus: null,
      enrichmentFields: null,
      audioKey: null,
      audioSource: null,
      audioApprovedKey: null,
      createdBy: actor,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
      revision: 1,
    };
    if (card.example) filled.add("example");
    if (card.pronunciation) filled.add("pronunciation");
    if (card.notes) filled.add("notes");
    if (card.hook) filled.add("hook");
    if (card.source) filled.add("source");
    if (card.tags.length) filled.add("tags");
    if (card.sectionId) filled.add("section");
    if (card.reviewModeKeys) filled.add("review_modes");
    const filling = fieldsToFill(
      card,
      deckEnrichFields(deck.enrichFields, deck.defaultLanguage, deck.purpose),
    );
    if (enrichment && wantsEnrichment(input, actor) && filling.length > 0) {
      card.enrichmentStatus = "working";
      card.enrichmentFields = filling;
      enriching.push(id);
    }
    groups.push([
      db.insert(schema.cards).values(card),
      ...(card.tags.length > 0 ? syncTagStatements(db, [id], card.tags, now) : []),
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
    hold({ card, deckName: deck.name });
    outcomes.push({ status: "added", card, normalized });
  }

  await runInBatches(db, groups);
  await respellTags(db, outcomes);
  if (groups.length > 0) {
    track(ctx.analytics, {
      name: "card_added",
      count: groups.length,
      source: actor === "api" || actor === "mcp" ? actor : "manual",
    });
  }
  if (groups.length > 0) {
    const source =
      actor === "mcp"
        ? "ai_mcp"
        : actor === "api"
          ? "api"
          : options.fromLesson
            ? "lesson"
            : "typed";
    const converted = outcomes.filter((o) => o.status === "added" && o.normalized?.length).length;
    track(ctx.analytics, {
      name: "cards_added",
      count: groups.length,
      source,
      ...(source === "typed" ? { fields: TYPED_CARD_FIELDS.filter((f) => filled.has(f)) } : {}),
      ...(converted > 0 ? { normalized: converted } : {}),
      ...(options.entry ? { entry: options.entry } : {}),
    });
  }
  // The run is named after the add's first card, so the same add sent again finds it. A replay
  // whose run is still going leaves its cards to it; one whose run has finished, or that also
  // brings new cards, starts a run of its own under a fresh name.
  let runId = firstAdded ? addRunId(firstAdded) : undefined;
  if (enrichment && runId && replayedWorking) {
    const state = await runState(enrichment, runId);
    if (state === "live") {
      enriching = enriching.filter((id) => !replayed.has(id));
    }
    if (state !== "none") runId = undefined;
  }
  // The add stands whatever the queue does; a refused run leaves its cards saying so.
  if (
    enrichment &&
    enriching.length > 0 &&
    !(await queueEnrichment(db, userId, enriching, enrichment, "add", runId))
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
    if (outcome.status === "skipped") return { ...outcome, id: card.id, existing: card };
    return outcome.normalized?.length
      ? { id: card.id, status: "added", card, normalized: outcome.normalized }
      : { id: card.id, status: "added", card };
  });
}

/** Reads back the tags of added cards, which the write spelled as their owner's tags. */
async function respellTags(db: Db, outcomes: RawOutcome[]) {
  const tagged = new Map(
    outcomes.flatMap((o) =>
      o.status === "added" && o.card.tags.length > 0 ? [[o.card.id, o.card]] : [],
    ),
  );
  const rows = await selectIn([...tagged.keys()], (ids) =>
    db
      .select({ id: schema.cards.id, tags: schema.cards.tags })
      .from(schema.cards)
      .where(inArray(schema.cards.id, ids)),
  );
  for (const row of rows) {
    const card = tagged.get(row.id);
    if (card) card.tags = row.tags;
  }
}

type RawOutcome =
  | { status: "added"; card: Card; normalized?: NormalizedField[] }
  | { status: "skipped"; term: string; existing: Card; deckName: string };

/** Case and Unicode folding for search, the same rule as the duplicate key. */
export function foldForSearch(text: string): string {
  return normaliseTerm(text);
}

/**
 * The free-text search key: the duplicate-key fold, then NFKC so full- and half-width forms
 * meet, then katakana to hiragana so a kana query finds either script, then without a stress mark
 * left over from NFC, so замок finds за́мок while é and ѓ, which NFC composes, still count, and
 * with every apostrophe as ', so м'ясо finds м’ясо.
 */
export function searchKey(text: string): string {
  return foldApostrophes(
    foldForSearch(text.normalize("NFKC"))
      .replace(/[\u30a1-\u30f6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60))
      .replaceAll("\u0301", ""),
  );
}

/** True when the needle, a `searchKey`, occurs in the term, reading, meaning, example or notes. */
export function matchesSearch(
  card: Pick<
    Card,
    "normalizedTerm" | "pronunciation" | "meaning" | "example" | "notes" | "language"
  >,
  needle: string,
): boolean {
  const notes = card.notes && notesToText(card.notes);
  for (const field of [
    card.normalizedTerm,
    card.pronunciation,
    card.meaning,
    card.example && stripReadings(card.example, card.language),
    notes,
  ]) {
    if (field && searchKey(field).includes(needle)) return true;
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
export async function visibleCards({ db, userId }: ServiceContext, ids: readonly string[]) {
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
export function refusalOf(id: string, check: () => void): CardWriteError | null {
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
type CardWrite = {
  id: string;
  statements: Statement[];
  states: boolean;
  /** The tags the write set, which then move into `card_tags` after it. */
  tags?: readonly string[] | undefined;
  /** Tags the write archives from the card rather than drops. */
  archiveTags?: readonly string[] | undefined;
  /** What product analytics reports once the write lands. */
  reports?: AnalyticsEvent | undefined;
  /** The AI's text from each field the write rewrites, for the deck's style. */
  corrections?: readonly Correction[] | undefined;
  /** The card's language once the write lands. */
  language?: string | null | undefined;
  /** Fields the write converted to how Lymi stores them. */
  normalized?: NormalizedField[] | undefined;
};

type Correction = typeof schema.cardCorrections.$inferInsert;

/** Rows per insert, under D1's hundred bound parameters. */
const CORRECTIONS_PER_INSERT = 16;

/** The AI's text replaces any earlier correction of the same field, since the field was the AI's again. */
function correctionStatements(db: Db, rows: readonly Correction[]): Statement[] {
  const statements: Statement[] = [];
  for (let i = 0; i < rows.length; i += CORRECTIONS_PER_INSERT) {
    statements.push(
      db
        .insert(schema.cardCorrections)
        .values(rows.slice(i, i + CORRECTIONS_PER_INSERT))
        .onConflictDoUpdate({
          target: [schema.cardCorrections.cardId, schema.cardCorrections.field],
          set: {
            aiText: sql`excluded.ai_text`,
            createdAt: sql`excluded.created_at`,
          },
        }),
    );
  }
  return statements;
}

const CHANNEL = { user: "app", api: "api", mcp: "mcp" } as const;

/** Reports the writes that landed, one archive event per origin and one correction event for all. */
function reportWrites(ctx: ServiceContext, writes: CardWrite[], failed: ReadonlySet<string>) {
  const archived = new Map<CardOrigin, { count: number; ai_written: number }>();
  const corrected = { count: 0, meaning: 0, example: 0, notes: 0, pronunciation: 0 };
  const languages = [];
  for (const write of writes) {
    if (failed.has(write.id) || !write.corrections?.length) continue;
    corrected.count += 1;
    languages.push(write.language);
    for (const { field } of write.corrections) corrected[field] += 1;
  }
  const channel = CHANNEL[ctx.actor as keyof typeof CHANNEL];
  if (channel && corrected.count > 0) {
    track(ctx.analytics, {
      name: "ai_text_corrected",
      channel,
      ...corrected,
      languages: eventLanguages(languages),
    });
  }
  for (const write of writes) {
    const event = write.reports;
    if (!event || failed.has(write.id)) continue;
    if (event.name !== "cards_archived") {
      track(ctx.analytics, event);
      continue;
    }
    const total = archived.get(event.origin) ?? { count: 0, ai_written: 0 };
    total.count += event.count;
    total.ai_written += event.ai_written;
    archived.set(event.origin, total);
  }
  for (const [origin, total] of archived)
    track(ctx.analytics, { name: "cards_archived", origin, ...total });
}

type CardOrigin = Extract<AnalyticsEvent, { name: "cards_archived" }>["origin"];

/** How a card arrived, in the terms `cards_added` uses. */
function originOf(card: Card): CardOrigin {
  if (card.importId) return "import";
  return card.createdBy === "user"
    ? "typed"
    : card.createdBy === "api"
      ? "api"
      : card.createdBy === "mcp"
        ? "ai_mcp"
        : "other";
}

const aiWrote = (card: Card) =>
  [
    card.meaningSource,
    card.exampleSource,
    card.notesSource,
    card.pronunciationSource,
    card.hookSource,
  ].includes("ai");

/**
 * Cards per D1 batch. Each costs two statements, and the batch adds one set of state statements
 * and one of tag statements for all of them, which keeps a batch under the fifty `runInBatches` allows.
 */
export const CARDS_PER_BATCH = 20;

/** The writes, then the missing review states of every card that needs them, in one statement per mode. */
function batchOf(db: Db, writes: CardWrite[], now: Date): Statement[] {
  const stated = writes.filter((write) => write.states).map((write) => write.id);
  const tagged = writes.filter((write) => write.tags);
  return [
    ...writes.flatMap((write) => write.statements),
    ...correctionStatements(
      db,
      writes.flatMap((write) => write.corrections ?? []),
    ),
    ...(stated.length > 0 ? stateStatementsForCards(db, JSON.stringify(stated), now) : []),
    ...(tagged.length > 0
      ? syncTagStatements(
          db,
          tagged.map((write) => write.id),
          tagged.flatMap((write) => write.tags ?? []),
          now,
          tagged.flatMap((write) => write.archiveTags ?? []),
        )
      : []),
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

export function writeFailed(id: string): CardWriteError {
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
  const [deck] = await db
    .select({
      enrichFields: schema.decks.enrichFields,
      language: schema.decks.defaultLanguage,
      purpose: schema.decks.purpose,
    })
    .from(schema.decks)
    .where(eq(schema.decks.id, card.deckId));
  const fields = deckEnrichFields(deck?.enrichFields, deck?.language, deck?.purpose);
  if (!needsEnrichment(card, fields)) {
    throw new ServiceError("invalid", "This card has nothing left for the AI to fill in");
  }
  if (!enrichment) {
    throw new ServiceError("unavailable", "Enrichment is not configured on this server");
  }
  // A run already outstanding is the answer, so asking twice does not queue twice. A card
  // waiting long past any run has lost its run, so asking starts a new one.
  if (card.enrichmentStatus === "working" && !enrichmentStalled(card)) {
    return presentCard(db, card, userId);
  }
  // `updatedAt` moves because the card did, and because the screen stops waiting on a card
  // that has said `working` for too long: a card added months ago must not read as stale.
  // Asking is the learner changing their mind about a field they cleared, so blank becomes unset.
  const allowed = new Set<string>([...fields, "language"]);
  const reopened = Object.fromEntries(
    emptyFields(card)
      .filter((field) => card[field] !== null && allowed.has(field))
      .map((field) => [field, null]),
  );
  const working = {
    enrichmentStatus: "working" as const,
    enrichmentFields: fieldsToFill({ ...card, ...reopened }, fields),
    updatedAt: new Date(),
  };
  await db
    .update(schema.cards)
    .set({ ...working, ...reopened })
    .where(and(eq(schema.cards.id, id), eq(schema.cards.userId, userId)));
  const queued = await queueEnrichment(db, userId, [id], enrichment, "card");
  return presentCard(
    db,
    {
      ...card,
      ...working,
      ...reopened,
      ...(queued ? {} : { enrichmentStatus: "failed" as const }),
    },
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
function sourceAfter(text: string | null | undefined, stated: FieldSource | null | undefined) {
  if (stated !== undefined || text === undefined) return stated;
  return text ? ("manual" as const) : null;
}

export async function updateCard(ctx: ServiceContext, id: string, patch: ServerCardPatch) {
  const edit = { ...patch, cardId: id };
  const lookups = await editLookups(ctx, [edit]);
  const now = new Date();
  const write = editWrite(ctx, lookups, edit, now);
  await runBatch(ctx.db, batchOf(ctx.db, [write], now));
  reportWrites(ctx, [write], new Set());
  return showCard(ctx, id);
}

export type EditCardOutcome =
  | { id: string; status: "updated"; card: CardView; normalized?: NormalizedField[] }
  | CardWriteError;

/**
 * Edit many cards, each as `updateCard` would, with its own audit row. A card that is missing, not
 * the learner's, or refused its deck or section reports why, and so does a card whose batch failed
 * to save; the rest still land. Outcomes come back in the order of the edits.
 */
export async function updateCards(
  ctx: ServiceContext,
  edits: CardEditInput[],
  /** Tags the edits take off that are archived rather than dropped, for Restore. */
  options: { archiveTags?: readonly string[] } = {},
): Promise<EditCardOutcome[]> {
  const { db, userId } = ctx;
  if (edits.length === 0) return [];
  const lookups = await editLookups(ctx, edits);
  const now = new Date();
  const writes: CardWrite[] = [];
  const refusals = edits.map((edit) =>
    refusalOf(edit.cardId, () =>
      writes.push({ ...editWrite(ctx, lookups, edit, now), archiveTags: options.archiveTags }),
    ),
  );
  const failed = await runCardWrites(db, writes, now);
  reportWrites(ctx, writes, failed);
  const written = await visibleCards(
    ctx,
    writes.filter((write) => !failed.has(write.id)).map((write) => write.id),
  );
  const views = new Map(
    (await presentCards(db, [...written.values()], userId)).map((view) => [view.id, view]),
  );
  const normalized = new Map(writes.map((write) => [write.id, write.normalized]));
  return edits.map(({ cardId: id }, index) => {
    const refused = refusals[index];
    if (refused) return refused;
    const card = views.get(id);
    if (failed.has(id) || !card) return writeFailed(id);
    const fields = normalized.get(id);
    return fields?.length
      ? { id, status: "updated", card, normalized: fields }
      : { id, status: "updated", card };
  });
}

type EditLookups = {
  cards: Map<string, Card>;
  ownedDecks: Set<string>;
  sectionDecks: Map<string, string>;
};

/** Every card, target deck and section a set of edits names, read once for the whole set. */
async function editLookups(ctx: ServiceContext, edits: ServerCardEdit[]): Promise<EditLookups> {
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

/**
 * The AI's text from each field this edit rewrites: text the AI wrote that the owner changed,
 * emptying included. Null clears a field for a split or Undo, which says nothing about the text.
 */
function correctionsOf(
  { userId }: ServiceContext,
  current: Card,
  patch: Partial<Record<DeckEnrichField, string | null | undefined>>,
  sources: Partial<Record<`${DeckEnrichField}Source`, FieldSource | null | undefined>>,
  now: Date,
): Correction[] {
  return DECK_ENRICH_FIELDS.flatMap((field) => {
    const text = patch[field];
    const aiText = current[field] ?? "";
    if (typeof text !== "string" || current[`${field}Source`] !== "ai") return [];
    if (sources[`${field}Source`] === "ai" || text.trim() === aiText.trim()) return [];
    return [{ cardId: current.id, field, userId, aiText, createdAt: now }];
  });
}

/** One card's edit and its audit row, or the ServiceError that refuses it. */
function editWrite(
  ctx: ServiceContext,
  lookups: EditLookups,
  { cardId: id, revision, ...sent }: ServerCardEdit,
  now: Date,
): CardWrite {
  const { db } = ctx;
  const current = lookups.cards.get(id);
  if (!current) throw notFound("Card");
  assertOwner(ctx, current);
  // Converted against the pronunciation the card will have, so a split term keeps a Reading it already has.
  const text = normalizeCardText(sent.language === undefined ? current.language : sent.language, {
    term: sent.term,
    pronunciation: sent.pronunciation === undefined ? current.pronunciation : sent.pronunciation,
  });
  const patch = { ...sent };
  if (text.normalized.includes("term")) patch.term = text.fields.term;
  if (text.normalized.includes("pronunciation")) patch.pronunciation = text.fields.pronunciation;
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
  // Always recompute the duplicate key, so a card whose stored key predates termKey(), such as a
  // stressed Russian term the backfill left beside another pronunciation, is repaired by any edit.
  const language = patch.language === undefined ? current.language : patch.language;
  const normalizedTerm = termKey(language, patch.term ?? current.term);
  const pronunciationChanged =
    (patch.term !== undefined && patch.term !== current.term) ||
    (patch.language !== undefined && patch.language !== current.language);
  // A recording says the word, so only a new word drops it; generated speech follows the term,
  // the language and the fields its language makes a clip from. CONTEXT.md, Recording.
  const audioStale =
    current.audioSource === "recorded"
      ? normalizedTerm !== termKey(language, current.term)
      : pronunciationChanged ||
        speechInputs(current.language).some(
          (field) => patch[field] !== undefined && patch[field] !== current[field],
        );
  const { reviewModes, directions: _legacy, ...fields } = patch;
  const hook = patch.hook === undefined ? current.hook : patch.hook || null;
  // Changing a field's text changes where it came from, so an AI fill an app rewrites loses its badge.
  const sources = {
    meaningSource: sourceAfter(patch.meaning, patch.meaningSource),
    exampleSource: sourceAfter(patch.example, patch.exampleSource),
    pronunciationSource: sourceAfter(patch.pronunciation, patch.pronunciationSource),
    notesSource: sourceAfter(patch.notes, patch.notesSource),
    // Only a hook has a source, whatever the caller said about one that is not there. A hook saved
    // exactly as the AI drafted it is the AI's, whoever pressed Save.
    hookSource: !hook
      ? null
      : patch.hook !== undefined && hook === current.hookDraft
        ? ("ai" as const)
        : sourceAfter(patch.hook, patch.hookSource),
  };
  // A draft fits the text it was drafted for, so a new term or meaning sends the next one back to the AI.
  const draftStale =
    (patch.term !== undefined && patch.term !== current.term) ||
    (patch.meaning !== undefined && patch.meaning !== current.meaning);
  const modes = resolveCardModes(
    patch,
    current.directions ? (current.reviewModeKeys ?? null) : null,
  );
  const update = db
    .update(schema.cards)
    .set({
      ...fields,
      hook,
      ...sources,
      ...(modes ?? {}),
      ...section,
      ...(revision === undefined ? bumped("card", patch, current) : { revision }),
      normalizedTerm,
      ...(audioStale ? { audioKey: null, audioSource: null } : {}),
      ...(draftStale ? { hookDraft: null } : {}),
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
    tags: patch.tags,
    corrections: correctionsOf(ctx, current, patch, sources, now),
    language: patch.language === undefined ? current.language : patch.language,
    normalized: text.normalized,
    reports:
      hook && !current.hook && sources.hookSource
        ? { name: "hook_added", source: sources.hookSource }
        : undefined,
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
  if (!write) return;
  await runBatch(ctx.db, batchOf(ctx.db, [write], new Date()));
  reportWrites(ctx, [write], new Set());
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
  reportWrites(ctx, writes, failed);
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
    reports: archivedAt
      ? {
          name: "cards_archived",
          origin: originOf(current),
          count: 1,
          ai_written: aiWrote(current) ? 1 : 0,
        }
      : undefined,
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
        ...(outcome.normalized ? { normalized: outcome.normalized } : {}),
      };
    case "skipped":
      return {
        id: outcome.id,
        status: "skipped",
        enrichmentStatus: outcome.existing.enrichmentStatus,
        term: outcome.term,
        deckId: outcome.existing.deckId,
        deckName: outcome.deckName,
      };
    case "error":
      return { id: outcome.id, status: "error", code: outcome.code, error: outcome.error };
    case "updated":
      return {
        id: outcome.id,
        status: "updated",
        ...(outcome.normalized ? { normalized: outcome.normalized } : {}),
      };
    default:
      return { id: outcome.id, status: outcome.status };
  }
}
