import {
  arrivesKnown,
  type Directions,
  directionsFromModes,
  duplicateKey,
  EARLIER_EXAMPLE,
  emptyImportCounts,
  exampleFingerprint,
  IMAGE_LIMITS,
  IMPORT_LIMITS,
  type ImportCounts,
  type ImportedCard,
  type ImportedFields,
  type ImportPreviewOut,
  isImageMode,
  type NormalizedField,
  newDeckEnrichFields,
  newId,
  normaliseTerm,
  normalizeCardText,
  playableRecording,
  readingKey,
  replayProgress,
  revealedAnswer,
  sameExample,
  sameReading,
  serializeState,
  stateDirection,
  stripStress,
  TEXT_MODES,
  termKey,
} from "@lymi/core";
import { and, eq, inArray, isNotNull, isNull, ne, or, sql } from "@lymi/core/db";
import type { Import } from "@lymi/core/schema";
import { type BatchStatement, batchStatements } from "../batch";
import { schema } from "../db";
import type { ImportChoices, SourceAdapter, SourceSummary } from "../imports/adapter";
import { track } from "./analytics";
import { recordFirstDeck } from "./analytics-deck";
import { auditStatement } from "./audit";
import { selectIn } from "./batch";
import { type CardImageStorage, storeImportedImage } from "./card-images";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { stateStatementsForCards } from "./modes";
import { MAX_RECORDING_BYTES, storeExampleRecording, storeRecording } from "./recordings";
import { syncTagStatements } from "./tags";

/**
 * The one writer every source shares. It maps imported cards onto decks, cards, states,
 * reviews and pictures, applies the duplicate rule of ADR 0004, and makes each chunk one D1
 * batch guarded by the import's progress, so a retried step never writes a chunk twice.
 */

/** A stored summary: the adapter's, plus a first guess at each deck's language. */
export type StoredSummary = SourceSummary & { languages: Record<string, string | null> };

type Statement = BatchStatement;

/** The biggest JSON a single bound parameter carries, under D1's 2 MB value limit. */
const JSON_PARAM_BYTES = 900_000;
const DUPLICATE_EXAMPLES = 20;

export function noteChunkKey(objectKey: string, chunk: number) {
  return `${objectKey}.notes/${chunk}.json`;
}

export async function readNoteChunk<Note>(bucket: R2Bucket, objectKey: string, chunk: number) {
  const object = await bucket.get(noteChunkKey(objectKey, chunk));
  if (!object) throw new ServiceError("unavailable", "The import's stored notes are missing");
  return (await object.json()) as Note[];
}

/** The duplicate rule's key for an imported term, as in `addCards`. */
function dupKey(language: string | null, term: string) {
  return duplicateKey(language, termKey(language, term));
}

/** The deck path as a Lymi name: `Italian::Lesson 1` reads `Italian / Lesson 1`. */
export function deckName(path: string): string {
  const name =
    path
      .split("::")
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" / ") || path;
  const chars = [...name];
  // A long path keeps its end, where the deck's own name is.
  return chars.length <= IMPORT_LIMITS.deckName
    ? name
    : `…${chars.slice(-(IMPORT_LIMITS.deckName - 1)).join("")}`;
}

/** Sources whose repeated terms are each their own card rather than one duplicate. */
function keepsRepeats(row: Import) {
  return row.source === "quizlet";
}

function deckExternalId(source: string, key: string, name: string) {
  return `${source}:deck:${key}:${name}`;
}

/** Cards under one duplicate key, each with its reading, since homographs share a key. */
type Held = Map<string, { reading: string | null; deckName: string }[]>;

type Lookup = {
  /**
   * `recorded` when the card already has a recording, which an import never reads again, and
   * `exampleRecorded` likewise for its example's.
   */
  byExternal: Map<
    string,
    {
      id: string;
      deckId: string;
      term: string;
      example: string | null;
      language: string | null;
      recorded: boolean;
      exampleRecorded: boolean;
    }
  >;
  active: Held;
};

function hold(held: Held, key: string, reading: string | null, deckName: string) {
  held.set(key, [...(held.get(key) ?? []), { reading, deckName }]);
}

/** The deck of a held card this one duplicates, or undefined. */
function heldDeck(held: Held, key: string, reading: string | null) {
  return held.get(key)?.find((h) => sameReading(h.reading, reading))?.deckName;
}

/** The learner's cards that an import could meet: by external id, and active ones by term. */
async function lookup(ctx: ServiceContext, cards: ImportedCard[], exceptImport?: string) {
  const { db, userId } = ctx;
  const externalIds = [...new Set(cards.map((c) => c.externalId))];
  // Both keys a term may be stored under, since the stress fold depends on a language chosen later.
  const terms = [
    ...new Set(
      cards.flatMap((c) => [
        normaliseTerm(c.fields.term),
        stripStress(normaliseTerm(c.fields.term)),
      ]),
    ),
  ];
  const [external, active] = await Promise.all([
    selectIn(externalIds, (ids) =>
      db
        .select({
          id: schema.cards.id,
          deckId: schema.cards.deckId,
          externalId: schema.cards.externalId,
          audioSource: schema.cards.audioSource,
          term: schema.cards.term,
          example: schema.cards.example,
          language: schema.cards.language,
          exampleRecordingKey: schema.cards.exampleRecordingKey,
        })
        .from(schema.cards)
        .where(and(eq(schema.cards.userId, userId), inArray(schema.cards.externalId, ids))),
    ),
    selectIn(terms, (keys) =>
      db
        .select({
          term: schema.cards.term,
          language: schema.cards.language,
          normalizedTerm: schema.cards.normalizedTerm,
          pronunciation: schema.cards.pronunciation,
          deckName: schema.decks.name,
        })
        .from(schema.cards)
        .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
        .where(
          and(
            eq(schema.cards.userId, userId),
            isNull(schema.cards.archivedAt),
            inArray(schema.cards.normalizedTerm, keys),
            // Cards this import already wrote are its own repeats, not duplicates, where repeats stay.
            exceptImport
              ? or(isNull(schema.cards.importId), ne(schema.cards.importId, exceptImport))
              : undefined,
          ),
        ),
    ),
  ]);
  const result: Lookup = { byExternal: new Map(), active: new Map() };
  for (const row of external) {
    if (row.externalId) {
      result.byExternal.set(row.externalId, {
        id: row.id,
        deckId: row.deckId,
        term: row.term,
        example: row.example,
        language: row.language,
        recorded: row.audioSource === "recorded",
        exampleRecorded: row.exampleRecordingKey !== null,
      });
    }
  }
  for (const row of active) {
    hold(
      result.active,
      duplicateKey(row.language, row.normalizedTerm),
      readingKey(row),
      row.deckName,
    );
  }
  return result;
}

/**
 * Every card of the learner an import could meet, read once. A preview reads every chunk, and a
 * query per chunk would be thousands of queries for a large collection.
 */
async function lookupAll(ctx: ServiceContext): Promise<Lookup> {
  const { db, userId } = ctx;
  const [external, active] = await Promise.all([
    db
      .select({
        id: schema.cards.id,
        deckId: schema.cards.deckId,
        externalId: schema.cards.externalId,
        audioSource: schema.cards.audioSource,
        term: schema.cards.term,
        example: schema.cards.example,
        language: schema.cards.language,
        exampleRecordingKey: schema.cards.exampleRecordingKey,
      })
      .from(schema.cards)
      .where(and(eq(schema.cards.userId, userId), isNotNull(schema.cards.externalId))),
    db
      .select({
        term: schema.cards.term,
        language: schema.cards.language,
        normalizedTerm: schema.cards.normalizedTerm,
        pronunciation: schema.cards.pronunciation,
        deckName: schema.decks.name,
      })
      .from(schema.cards)
      .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
      .where(and(eq(schema.cards.userId, userId), isNull(schema.cards.archivedAt))),
  ]);
  const result: Lookup = { byExternal: new Map(), active: new Map() };
  for (const row of external) {
    if (row.externalId) {
      result.byExternal.set(row.externalId, {
        id: row.id,
        deckId: row.deckId,
        term: row.term,
        example: row.example,
        language: row.language,
        recorded: row.audioSource === "recorded",
        exampleRecorded: row.exampleRecordingKey !== null,
      });
    }
  }
  for (const row of active) {
    hold(
      result.active,
      duplicateKey(row.language, row.normalizedTerm),
      readingKey(row),
      row.deckName,
    );
  }
  return result;
}

type Classified =
  | {
      kind: "existing";
      card: ImportedCard;
      id: string;
      /** The file's recording goes on the card: it has none, and it still says the same word. */
      takesRecording: boolean;
      /** The file's example recording goes on the card: it has none, and its example is the file's. */
      takesExampleRecording: boolean;
    }
  | { kind: "duplicate"; card: ImportedCard; deckName: string }
  | { kind: "added"; card: ImportedCard; language: string | null };

/**
 * Sorts one batch of imported cards by what the writer will do with each. `seen` carries the
 * terms added by earlier batches of the same import, so a term repeated in the file is added once.
 */
function classify(
  cards: ImportedCard[],
  found: Lookup,
  languages: ImportChoices["languages"],
  deckNames: Map<string, string>,
  seen: Held,
  /** Keep a term the file repeats, as Quizlet sets reuse terms for different meanings. */
  keepRepeats = false,
): Classified[] {
  return cards.map((card) => {
    const existing = found.byExternal.get(card.externalId);
    if (existing) {
      // A card whose word the learner changed since never gets the old word's clip.
      const takesRecording =
        !existing.recorded && normaliseTerm(existing.term) === normaliseTerm(card.fields.term);
      // A missing example is filled with the file's, so the clip says it too; a cleared one stays.
      const takesExampleRecording =
        !existing.exampleRecorded &&
        (existing.example === null ||
          sameExample(existing.language, existing.example, card.fields.example));
      return { kind: "existing", card, id: existing.id, takesRecording, takesExampleRecording };
    }
    const language = cardLanguage(card, languages);
    const key = dupKey(language, card.fields.term);
    const reading = readingKey({
      term: card.fields.term,
      language,
      pronunciation: card.fields.pronunciation,
    });
    const held =
      heldDeck(found.active, key, reading) ??
      (keepRepeats ? undefined : heldDeck(seen, key, reading));
    if (held !== undefined) return { kind: "duplicate", card, deckName: held };
    hold(seen, key, reading, deckNames.get(card.deckKey) ?? "");
    return { kind: "added", card, language };
  });
}

/** Adds a batch to the counts. Pictures and recordings count as they land, except in a preview. */
function tally(
  counts: ImportCounts,
  classified: Classified[],
  { pictures }: { pictures: boolean },
) {
  for (const item of classified) {
    if (item.kind === "existing") {
      counts.existing++;
      if (pictures && item.takesRecording) countRecording(counts, item.card);
      if (pictures && item.takesExampleRecording) countExampleRecording(counts, item.card);
    } else if (item.kind === "duplicate") {
      counts.duplicates++;
      if (counts.duplicateExamples.length < DUPLICATE_EXAMPLES) {
        counts.duplicateExamples.push({ term: item.card.fields.term, deckName: item.deckName });
      }
    } else {
      counts.added++;
      if (item.card.archived) counts.archived++;
      if (item.card.shortened) counts.shortened++;
      counts.reviews += item.card.progress.reduce((sum, p) => sum + p.reviews.length, 0);
      if (pictures && item.card.picture) counts.pictures++;
      if (pictures) countRecording(counts, item.card);
      if (pictures) countExampleRecording(counts, item.card);
      counts.soundsLeftOut += item.card.soundsLeftOut ?? 0;
      if (item.card.pitchLeftOut) counts.pitchSkipped++;
      if (converted.get(item.card)?.includes("pronunciation")) {
        counts.readingsConverted = (counts.readingsConverted ?? 0) + 1;
      }
    }
  }
}

/** A preview's guess from the clip's name; storing it reads the bytes and has the last word. */
function countRecording(counts: ImportCounts, card: ImportedCard) {
  if (!card.recording) return;
  if (playableRecording(card.recording)) counts.recordings++;
  else counts.recordingsSkipped++;
}

function countExampleRecording(counts: ImportCounts, card: ImportedCard) {
  if (!card.exampleRecording) return;
  if (playableRecording(card.exampleRecording)) {
    counts.exampleRecordings = (counts.exampleRecordings ?? 0) + 1;
  } else {
    counts.exampleRecordingsSkipped = (counts.exampleRecordingsSkipped ?? 0) + 1;
  }
}

export type ImportWork<Note> = {
  row: Import;
  summary: StoredSummary;
  choices: ImportChoices;
  adapter: SourceAdapter<Note>;
  bucket: R2Bucket;
};

function cardLanguage(card: ImportedCard, languages: ImportChoices["languages"]) {
  return card.language !== undefined ? card.language : (languages[card.deckKey] ?? null);
}

/** Cards whose text `stored` converted, with the fields it changed, for `cards_added` and the counts. */
const converted = new WeakMap<ImportedCard, NormalizedField[]>();

/** The card with its text as Lymi stores it, before anything compares or counts it. */
function stored(card: ImportedCard, languages: ImportChoices["languages"]): ImportedCard {
  const { fields, normalized } = normalizeCardText(cardLanguage(card, languages), card.fields);
  if (normalized.length === 0) return card;
  const changed = { ...card, fields };
  converted.set(changed, normalized);
  return changed;
}

async function* importedCards<Note>(work: ImportWork<Note>, from = 0) {
  if (!work.row.objectKey) throw new ServiceError("unavailable", "The import's file is gone");
  const leftOut = new Set(work.choices.skipDecks ?? []);
  for (let chunk = from; chunk < work.row.chunks; chunk++) {
    const notes = await readNoteChunk<Note>(work.bucket, work.row.objectKey, chunk);
    let skipped = 0;
    const cards = notes.flatMap((note) => {
      const made = work.adapter.cards(note, work.summary, work.choices);
      if (made.length === 0) skipped++;
      return made
        .filter((card) => !leftOut.has(card.deckKey))
        .map((card) => stored(card, work.choices.languages));
    });
    yield { chunk, cards, skipped };
  }
}

async function importedDecks(ctx: ServiceContext, row: Import, summary: StoredSummary) {
  const ids = summary.decks.map((deck) => deckExternalId(row.source, deck.key, deck.name));
  const rows = await selectIn(ids, (slice) =>
    ctx.db
      .select({ id: schema.decks.id, externalId: schema.decks.externalId })
      .from(schema.decks)
      .where(
        and(
          eq(schema.decks.userId, ctx.userId),
          // A deck this import made archived is still its own, so a retried step finds it.
          or(isNull(schema.decks.archivedAt), eq(schema.decks.importId, row.id)),
          inArray(schema.decks.externalId, slice),
        ),
      ),
  );
  const byExternal = new Map(rows.map((r) => [r.externalId, r.id]));
  // A deck the learner chose to add to, checked as theirs and active when the file was read.
  const targetIds = summary.decks.flatMap((deck) => (deck.targetDeckId ? [deck.targetDeckId] : []));
  const targets =
    targetIds.length === 0
      ? new Set<string>()
      : new Set(
          (
            await ctx.db
              .select({ id: schema.decks.id })
              .from(schema.decks)
              .where(
                and(
                  eq(schema.decks.userId, ctx.userId),
                  isNull(schema.decks.archivedAt),
                  inArray(schema.decks.id, targetIds),
                ),
              )
          ).map((r) => r.id),
        );
  return new Map(
    summary.decks.map((deck) => [
      deck.key,
      (deck.targetDeckId && targets.has(deck.targetDeckId) ? deck.targetDeckId : null) ??
        byExternal.get(deckExternalId(row.source, deck.key, deck.name)) ??
        null,
    ]),
  );
}

/**
 * What confirming would write, under the learner's current choices and the cards Lymi holds
 * now. It reads every stored chunk and writes nothing.
 */
export async function previewImport<Note>(
  ctx: ServiceContext,
  work: ImportWork<Note>,
): Promise<ImportPreviewOut> {
  const counts = emptyImportCounts();
  const names = new Map(work.summary.decks.map((d) => [d.key, deckName(d.name)]));
  const existingDecks = await importedDecks(ctx, work.row, work.summary);
  const perDeck = new Map<string, number>();
  const addedByNoteType: Record<string, number> = {};
  const tags = new Set<string>();
  const seen: Held = new Map();
  const samples: ImportPreviewOut["samples"] = {};
  const found = await lookupAll(ctx);
  const now = new Date();
  let known = 0;
  for await (const { cards, skipped } of importedCards(work)) {
    counts.skipped += skipped;
    for (const card of cards) {
      const list = samples[card.noteTypeKey] ?? [];
      samples[card.noteTypeKey] = list;
      if (list.length >= 3) continue;
      list.push({
        term: card.fields.term,
        meaning: card.fields.meaning ?? null,
        pronunciation: card.fields.pronunciation ?? null,
        example: card.fields.example ?? null,
        exampleTranslation: card.fields.exampleTranslation ?? null,
        notes: card.fields.notes ?? null,
        tags: card.tags,
        modes: card.modes,
        picture: Boolean(card.picture),
      });
    }
    const classified = classify(
      cards,
      found,
      work.choices.languages,
      names,
      seen,
      keepsRepeats(work.row),
    );
    tally(counts, classified, { pictures: true });
    for (const item of classified) {
      if (item.kind !== "added") continue;
      if (arrivesKnown(item.card, now)) known++;
      perDeck.set(item.card.deckKey, (perDeck.get(item.card.deckKey) ?? 0) + 1);
      addedByNoteType[item.card.noteTypeKey] = (addedByNoteType[item.card.noteTypeKey] ?? 0) + 1;
      for (const tag of item.card.tags) tags.add(tag.toLowerCase());
    }
  }
  const decks = work.summary.decks
    .filter((deck) => (perDeck.get(deck.key) ?? 0) > 0)
    .map((deck) => ({
      key: deck.key,
      name: names.get(deck.key) ?? deck.name,
      cards: perDeck.get(deck.key) ?? 0,
      existingDeckId: existingDecks.get(deck.key) ?? null,
    }));
  counts.decks = decks.filter((deck) => !deck.existingDeckId).length;
  return {
    ...counts,
    decks,
    samples,
    known,
    tags: tags.size,
    addedByNoteType,
    // Clips that do not come across; the app before recordings named every clip here.
    audio: counts.soundsLeftOut,
    unsupported: work.summary.unsupported,
  };
}

/**
 * Creates the decks new cards go into, each once, and returns them by source key. A deck an
 * earlier import of the same file made is reused while it is active. Safe to run again.
 */
export async function prepareDecks<Note>(ctx: ServiceContext, work: ImportWork<Note>) {
  const { db, userId, actor } = ctx;
  const names = new Map(work.summary.decks.map((d) => [d.key, deckName(d.name)]));
  const modes = new Map<string, Map<Directions, number>>();
  const seen: Held = new Map();
  const found = await lookupAll(ctx);
  // What `writeChunk` will hand to `attachPictures`, so progress has its total before any lands.
  let media = 0;
  for await (const { cards } of importedCards(work)) {
    const classified = classify(
      cards,
      found,
      work.choices.languages,
      names,
      seen,
      keepsRepeats(work.row),
    );
    for (const item of classified) {
      if (item.kind === "existing" && item.takesRecording && item.card.recording) media++;
      if (item.kind === "existing" && item.takesExampleRecording && item.card.exampleRecording) {
        media++;
      }
      if (item.kind !== "added") continue;
      if (item.card.picture) media++;
      if (item.card.recording) media++;
      if (item.card.exampleRecording) media++;
      const tallyByDeck = modes.get(item.card.deckKey) ?? new Map<Directions, number>();
      const directions = directionsFromModes(item.card.modes);
      tallyByDeck.set(directions, (tallyByDeck.get(directions) ?? 0) + 1);
      modes.set(item.card.deckKey, tallyByDeck);
    }
  }

  const existing = await importedDecks(ctx, work.row, work.summary);
  const statements: Statement[] = [];
  for (const deck of work.summary.decks) {
    const tallyByDeck = modes.get(deck.key);
    if (!tallyByDeck || existing.get(deck.key)) continue;
    // A source that records how the deck itself is asked keeps that; otherwise its cards decide.
    const directions = deck.reviewModes
      ? directionsFromModes(deck.reviewModes)
      : ([...tallyByDeck].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "recognition");
    const id = newId();
    const language = work.choices.languages[deck.key] ?? null;
    const enrichFields = newDeckEnrichFields(language);
    const externalId = deckExternalId(work.row.source, deck.key, deck.name);
    const description = deck.description
      ? [...deck.description].slice(0, IMPORT_LIMITS.deckDescription).join("")
      : null;
    // Inserted only while no active deck holds the external id, so a retried step makes no second deck.
    statements.push(
      sql`insert into decks (id, user_id, name, description, default_language, directions, position, import_id, external_id, archived_at, enrich_fields)
        select ${id}, ${userId}, ${names.get(deck.key) ?? deck.name}, ${description},
          ${language}, ${directions}, 0, ${work.row.id}, ${externalId},
          ${deck.archived ? Date.now() : null}, ${enrichFields ? JSON.stringify(enrichFields) : null}
        where not exists (
          select 1 from decks where user_id = ${userId} and external_id = ${externalId}
            and (archived_at is null or import_id = ${work.row.id})
        )`,
      sql`insert into audit_log (id, user_id, actor, action, entity, entity_id, payload)
        select ${newId()}, ${userId}, ${actor}, 'create', 'deck', ${id}, ${JSON.stringify({ importId: work.row.id })}
        where exists (select 1 from decks where id = ${id})`,
    );
  }
  let created = 0;
  for (let i = 0; i < statements.length; i += 50) {
    const results = await batchStatements(db, statements.slice(i, i + 50));
    // Deck inserts are the even statements; a retry inserts none and adds nothing here.
    created += results.filter(
      (result, index) => index % 2 === 0 && result.meta.changes === 1,
    ).length;
  }
  if (created > 0) recordFirstDeck(ctx, { imported: work.row.id });
  await batchStatements(db, [
    // A run handed over meets this import's own cards as existing, so the first count stands.
    sql`update imports set media_total = max(media_total, ${media}), updated_at = ${Date.now()}
      where id = ${work.row.id}`,
    ...(created > 0
      ? [
          sql`update imports set counts = json_set(coalesce(counts, '{}'), '$.decks',
              coalesce(json_extract(counts, '$.decks'), 0) + ${created})
            where id = ${work.row.id}`,
        ]
      : []),
  ]);
  const decks = await importedDecks(ctx, work.row, work.summary);
  return Object.fromEntries([...decks].filter(([, id]) => id !== null)) as Record<string, string>;
}

/** Splits rows into JSON arrays that each fit one bound parameter. */
function jsonParts(rows: unknown[]): string[] {
  const parts: string[] = [];
  let current: string[] = [];
  let size = 2;
  for (const row of rows) {
    const json = JSON.stringify(row);
    if (current.length > 0 && size + json.length + 1 > JSON_PARAM_BYTES) {
      parts.push(`[${current.join(",")}]`);
      current = [];
      size = 2;
    }
    current.push(json);
    size += json.length + 1;
  }
  if (current.length > 0) parts.push(`[${current.join(",")}]`);
  return parts;
}

/** Time-sortable like `newId`, derived from the state and the moment, so a re-run collides. */
async function reviewId(stateId: string, at: Date): Promise<string> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${stateId}:${at.getTime()}`)),
  );
  let hash = "";
  for (const b of digest.subarray(0, 10)) hash += (b % 36).toString(36);
  return at.getTime().toString(36).padStart(9, "0") + hash;
}

/** A picture, or the term's or the example's recording when `kind` says so, stored after its card is written. */
export type PendingPicture = {
  cardId: string;
  name: string;
  description?: string | undefined;
  kind?: "recording" | "exampleRecording" | undefined;
  /** The sentence an example's recording says, which the card must still say when it is stored. */
  example?: string | undefined;
};

/**
 * Writes one stored chunk as one D1 batch. Every statement runs only while the import's
 * `written` count still equals this chunk, and the last one moves it on, so the chunk lands
 * whole or not at all and a retry after it landed writes nothing.
 */
export async function writeChunk<Note>(
  ctx: ServiceContext,
  work: ImportWork<Note>,
  chunk: number,
  decks: Record<string, string>,
): Promise<{ pictures: PendingPicture[] }> {
  const { db, userId, actor } = ctx;
  const row = work.row;
  const names = new Map(work.summary.decks.map((d) => [d.key, deckName(d.name)]));
  const now = new Date();
  const guard = sql`exists (select 1 from imports where id = ${row.id} and written = ${chunk})`;

  // Terms added by earlier chunks are now cards, so the lookup covers them; `seen` covers this chunk.
  const iterator = importedCards(work, chunk);
  const next = await iterator.next();
  await iterator.return(undefined);
  if (next.done) return { pictures: [] };
  const { cards, skipped } = next.value;

  const deckRows = await selectIn(Object.values(decks), (ids) =>
    db
      .select({ id: schema.decks.id, directions: schema.decks.directions })
      .from(schema.decks)
      .where(inArray(schema.decks.id, ids)),
  );
  const deckDirections = new Map(deckRows.map((d) => [d.id, d.directions]));
  const classified = classify(
    cards,
    await lookup(ctx, cards, keepsRepeats(row) ? row.id : undefined),
    work.choices.languages,
    names,
    new Map(),
    keepsRepeats(row),
  );
  const counts = { ...emptyImportCounts(), ...((row.counts as ImportCounts | null) ?? {}) };
  counts.duplicateExamples = [...counts.duplicateExamples];
  counts.skipped += skipped;

  const cardRows: unknown[] = [];
  const stateRows: unknown[] = [];
  const reviewRows: unknown[] = [];
  const auditRows: unknown[] = [];
  const pictures: PendingPicture[] = [];
  const statements: Statement[] = [];
  const added: Classified[] = [];
  const existingRows: unknown[] = [];

  for (const item of classified) {
    if (item.kind === "existing") {
      const { fields, tags } = item.card;
      // A recording replaces generated speech on a card an earlier import brought without it.
      if (item.card.recording && item.takesRecording) {
        pictures.push({ cardId: item.id, name: item.card.recording, kind: "recording" });
      }
      if (item.card.exampleRecording && item.takesExampleRecording) {
        pictures.push({
          cardId: item.id,
          name: item.card.exampleRecording,
          kind: "exampleRecording",
          example: item.card.fields.example,
        });
      }
      existingRows.push({
        id: item.id,
        meaning: fields.meaning ?? null,
        pronunciation: fields.pronunciation ?? null,
        example: fields.example ?? null,
        ...translationOf(fields, item.card.translationStale),
        notes: fields.notes ?? null,
        hint: item.card.hint?.text ?? null,
        hintSource: item.card.hint?.source ?? null,
        tags: JSON.stringify(tags),
      });
      continue;
    }
    if (item.kind !== "added") continue;
    const deckId = decks[item.card.deckKey];
    // No deck was made for it, which only happens when the learner's cards changed during the
    // run; it is left out of the counts rather than reported as added.
    if (!deckId) continue;
    added.push(item);
    const id = newId();
    const directions = directionsFromModes(item.card.modes);
    // A card with picture modes keeps its own list, since a deck's modes are text modes only.
    const followsDeck =
      deckDirections.get(deckId) === directions && !item.card.modes.some(isImageMode);
    const { fields } = item.card;
    cardRows.push({
      id,
      deckId,
      term: fields.term,
      normalizedTerm: termKey(item.language, fields.term),
      meaning: fields.meaning ?? null,
      pronunciation: fields.pronunciation ?? null,
      example: fields.example ?? null,
      ...translationOf(fields, item.card.translationStale),
      exampleTranslationSource: fields.exampleTranslation
        ? (item.card.fieldSources?.exampleTranslation ?? "manual")
        : null,
      notes: fields.notes ?? null,
      hint: item.card.hint?.text ?? null,
      hintSource: item.card.hint?.source ?? null,
      language: item.language,
      tags: JSON.stringify(item.card.tags),
      directions: followsDeck ? null : directions,
      reviewModes: followsDeck ? null : JSON.stringify(item.card.modes),
      meaningSource: fields.meaning ? (item.card.fieldSources?.meaning ?? "manual") : null,
      exampleSource: fields.example ? (item.card.fieldSources?.example ?? "manual") : null,
      pronunciationSource: fields.pronunciation
        ? (item.card.fieldSources?.pronunciation ?? "manual")
        : null,
      notesSource: fields.notes ? (item.card.fieldSources?.notes ?? "manual") : null,
      source: item.card.origin ?? null,
      archivedAt: item.card.archived ? now.getTime() : null,
      externalId: item.card.externalId,
    });
    auditRows.push({ id: newId(), entityId: id });
    if (item.card.picture) {
      pictures.push({
        cardId: id,
        name: item.card.picture,
        ...(item.card.pictureDescription ? { description: item.card.pictureDescription } : {}),
      });
    }
    if (item.card.recording) {
      pictures.push({ cardId: id, name: item.card.recording, kind: "recording" });
    }
    if (item.card.exampleRecording) {
      pictures.push({
        cardId: id,
        name: item.card.exampleRecording,
        kind: "exampleRecording",
        example: fields.example,
      });
    }

    for (const progress of item.card.progress) {
      const stateId = newId();
      const replay = replayProgress(progress, now);
      stateRows.push({
        id: stateId,
        cardId: id,
        direction: stateDirection(progress.mode),
        mode: progress.mode,
        due: replay.state.due.getTime(),
        state: replay.state.state,
        fsrs: serializeState(replay.state),
        lastReview: replay.state.last_review?.getTime() ?? null,
      });
      for (const review of replay.reviews) {
        reviewRows.push({
          id: await reviewId(stateId, review.reviewedAt),
          cardId: id,
          stateId,
          direction: stateDirection(progress.mode),
          mode: progress.mode,
          rating: review.rating,
          state: review.state,
          elapsedDays: review.elapsedDays,
          scheduledDays: review.scheduledDays,
          stability: review.stability,
          difficulty: review.difficulty,
          reviewedAt: review.reviewedAt.getTime(),
        });
      }
    }
  }
  tally(
    counts,
    classified.filter((item) => item.kind !== "added" || added.includes(item)),
    { pictures: false },
  );

  const j = (path: string) => sql.raw(`json_extract(value, '$.${path}')`);
  for (const part of jsonParts(existingRows)) {
    // Only blank fields are filled: whatever the learner wrote since the first import stays.
    const rows = sql`(select json_extract(value, '$.id') as id, json_extract(value, '$.meaning') as meaning,
        json_extract(value, '$.pronunciation') as pronunciation, json_extract(value, '$.example') as example,
        json_extract(value, '$.exampleTranslation') as example_translation,
        json_extract(value, '$.exampleTranslationOf') as example_translation_of,
        json_extract(value, '$.notes') as notes, json_extract(value, '$.hint') as hint,
        json_extract(value, '$.hintSource') as hint_source, json_extract(value, '$.tags') as tags
      from json_each(${part}))`;
    statements.push(
      sql`update cards set
          meaning_source = case when cards.meaning is null and incoming.meaning is not null then 'manual' else cards.meaning_source end,
          example_source = case when cards.example is null and incoming.example is not null then 'manual' else cards.example_source end,
          -- A translation lands only beside the example it translates, and never over the learner's.
          example_translation_source = case when cards.example_translation is null and incoming.example_translation is not null
              and (cards.example is null or cards.example = incoming.example) then 'manual' else cards.example_translation_source end,
          example_translation_of = case when cards.example_translation is null and incoming.example_translation is not null
              and (cards.example is null or cards.example = incoming.example) then incoming.example_translation_of else cards.example_translation_of end,
          example_translation = case when cards.example_translation is null and incoming.example_translation is not null
              and (cards.example is null or cards.example = incoming.example) then incoming.example_translation else cards.example_translation end,
          meaning = coalesce(cards.meaning, incoming.meaning),
          pronunciation = coalesce(cards.pronunciation, incoming.pronunciation),
          example = coalesce(cards.example, incoming.example),
          notes = coalesce(cards.notes, incoming.notes),
          hook_source = case when cards.hook is null and incoming.hint is not null then incoming.hint_source else cards.hook_source end,
          hook = coalesce(cards.hook, incoming.hint),
          tags = case when cards.tags = '[]' then incoming.tags else cards.tags end,
          -- Filling a blank field is text an edition translates, so its localization goes stale.
          revision = case when (cards.meaning is null and incoming.meaning is not null)
              or (cards.pronunciation is null and incoming.pronunciation is not null)
              or (cards.example is null and incoming.example is not null)
              or (cards.notes is null and incoming.notes is not null)
            then cards.revision + 1 else cards.revision end,
          updated_at = ${now.getTime()}
        from ${rows} as incoming
        where cards.id = incoming.id and cards.user_id = ${userId} and ${guard}`,
    );
  }
  for (const part of jsonParts(cardRows)) {
    statements.push(
      sql`insert into cards (id, user_id, deck_id, term, normalized_term, meaning, pronunciation, example,
          example_translation, example_translation_source, example_translation_of, notes,
          hook, hook_source, language, tags, directions, review_modes, meaning_source, example_source,
          pronunciation_source, notes_source, source, created_by, archived_at, import_id, external_id, created_at, updated_at)
        select ${j("id")}, ${userId}, ${j("deckId")}, ${j("term")}, ${j("normalizedTerm")}, ${j("meaning")},
          ${j("pronunciation")}, ${j("example")}, ${j("exampleTranslation")}, ${j("exampleTranslationSource")},
          ${j("exampleTranslationOf")}, ${j("notes")}, ${j("hint")}, ${j("hintSource")}, ${j("language")},
          ${j("tags")}, ${j("directions")}, ${j("reviewModes")}, ${j("meaningSource")}, ${j("exampleSource")},
          ${j("pronunciationSource")}, ${j("notesSource")}, ${j("source")}, ${actor}, ${j("archivedAt")},
          ${row.id}, ${j("externalId")}, ${now.getTime()}, ${now.getTime()}
        from json_each(${part}) where ${guard}`,
    );
  }
  for (const part of jsonParts(stateRows)) {
    statements.push(
      sql`insert into card_states (id, card_id, user_id, direction, mode, due, state, fsrs, last_review, created_at, updated_at)
        select ${j("id")}, ${j("cardId")}, ${userId}, ${j("direction")}, ${j("mode")}, ${j("due")}, ${j("state")},
          ${j("fsrs")}, ${j("lastReview")}, ${now.getTime()}, ${now.getTime()}
        from json_each(${part}) where ${guard}`,
    );
  }
  for (const part of jsonParts(reviewRows)) {
    statements.push(
      sql`insert or ignore into reviews (id, user_id, card_id, card_state_id, direction, mode, rating, state,
          elapsed_days, scheduled_days, stability_after, difficulty_after, reviewed_at, source, review_day_id, state_before)
        select ${j("id")}, ${userId}, ${j("cardId")}, ${j("stateId")}, ${j("direction")}, ${j("mode")}, ${j("rating")},
          ${j("state")}, ${j("elapsedDays")}, ${j("scheduledDays")}, ${j("stability")}, ${j("difficulty")},
          ${j("reviewedAt")}, 'import', null, null
        from json_each(${part}) where ${guard}`,
    );
  }
  if (cardRows.length > 0) {
    const ids = JSON.stringify(cardRows.map((c) => (c as { id: string }).id));
    // The imported modes have their states; this adds any other mode the deck asks.
    statements.push(...stateStatementsForCards(db, ids, now, TEXT_MODES));
    for (const part of jsonParts(auditRows)) {
      statements.push(
        sql`insert into audit_log (id, user_id, actor, action, entity, entity_id, payload, created_at)
          select ${j("id")}, ${userId}, ${actor}, 'create', 'card', ${j("entityId")},
            ${JSON.stringify({ importId: row.id })}, ${now.getTime()}
          from json_each(${part}) where ${guard}`,
      );
    }
  }
  const tagged = [...cardRows, ...existingRows].filter(
    (c) => (c as { tags: string }).tags !== "[]",
  ) as { id: string; tags: string }[];
  // Idempotent, so a chunk the guard refuses only rewrites what is already there.
  if (tagged.length > 0)
    statements.push(
      ...syncTagStatements(
        db,
        tagged.map((c) => c.id),
        tagged.flatMap((c) => JSON.parse(c.tags) as string[]),
        now,
      ),
    );
  statements.push(
    sql`update imports set written = ${chunk + 1}, counts = ${JSON.stringify(counts)}, updated_at = ${now.getTime()}
      where id = ${row.id} and written = ${chunk}`,
  );

  const results = await batchStatements(db, statements);
  const moved = results.at(-1)?.meta.changes === 1;
  const addedCount = counts.added - ((row.counts as ImportCounts | null)?.added ?? 0);
  if (moved && addedCount > 0)
    track(ctx.analytics, { name: "card_added", count: addedCount, source: "import" });
  const normalized = added.filter((item) => converted.has(item.card)).length;
  if (moved && addedCount > 0)
    track(ctx.analytics, {
      name: "cards_added",
      count: addedCount,
      source: row.source,
      ...(normalized > 0 ? { normalized } : {}),
    });
  return { pictures: moved ? pictures : [] };
}

type Totals = { stored: number; skipped: number };
export type MediaTotals = Totals & {
  /** Absent in a run handed over before recordings were kept. */
  recordings?: Totals | undefined;
  /** Absent in a run handed over before examples' recordings were kept. */
  exampleRecordings?: Totals | undefined;
};
export type AttachedMedia = Totals & { recordings: Totals; exampleRecordings: Totals };

/** Pictures and recordings stored at once, matching the six connections a Worker keeps open. */
export const MEDIA_CONCURRENCY = 6;

/**
 * Stores pictures for cards this import added, and the term's and the example's recordings for
 * cards it added or met again, several at a time. Returns how many of each landed and how many did not.
 */
export async function attachPictures<Note>(
  ctx: ServiceContext,
  work: ImportWork<Note>,
  file: Parameters<SourceAdapter<Note>["media"]>[0],
  pending: PendingPicture[],
  storage: Partial<CardImageStorage> & { audio?: R2Bucket | undefined },
): Promise<AttachedMedia> {
  const read = await work.adapter.media(file);
  const images = imageStorage(storage);
  const pictureIds = images
    ? pending.filter((item) => item.kind === undefined).map((item) => item.cardId)
    : [];
  // One read for the step's cards, rather than one per picture.
  const cards = new Map(
    (
      await selectIn([...new Set(pictureIds)], (ids) =>
        ctx.db
          .select()
          .from(schema.cards)
          .where(
            and(
              inArray(schema.cards.id, ids),
              eq(schema.cards.userId, ctx.userId),
              eq(schema.cards.importId, work.row.id),
            ),
          ),
      )
    ).map((card) => [card.id, card]),
  );
  let stored = 0;
  let skipped = 0;
  const recordings = { stored: 0, skipped: 0 };
  const exampleRecordings = { stored: 0, skipped: 0 };

  const attach = async (picture: PendingPicture) => {
    if (picture.kind !== undefined) {
      const { audio } = storage;
      // A damaged clip is left out like an unplayable one; a storage failure still retries.
      const load = () => read(picture.name, MAX_RECORDING_BYTES).catch(() => null);
      const outcome = !audio
        ? "skipped"
        : picture.kind === "recording"
          ? await storeRecording(ctx, picture.cardId, load, audio)
          : await storeExampleRecording(ctx, picture.cardId, picture.example, load, audio);
      // A card a retried step already recorded was counted then.
      if (outcome !== "kept") {
        (picture.kind === "recording" ? recordings : exampleRecordings)[outcome]++;
      }
      return;
    }
    const card = cards.get(picture.cardId);
    if (!images || !card) {
      skipped++;
      return;
    }
    if (card.imageVersion) {
      stored++;
      return;
    }
    try {
      const bytes = await read(picture.name, IMAGE_LIMITS.maxBytes);
      if (!bytes) {
        skipped++;
        return;
      }
      // A description that names the answer is dropped; the picture still comes across.
      const description =
        picture.description && !revealedAnswer(card, picture.description)
          ? picture.description
          : undefined;
      await storeImportedImage(ctx, card, bytes, description, images);
      stored++;
    } catch (err) {
      if (!(err instanceof ServiceError)) throw err;
      skipped++;
    }
  };

  // An unexpected error stops every worker and fails the step, whose retry finds what was stored.
  let next = 0;
  let failure: { error: unknown } | null = null;
  const worker = async () => {
    while (!failure && next < pending.length) {
      const picture = pending[next++] as PendingPicture;
      try {
        await attach(picture);
      } catch (error) {
        failure ??= { error };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(MEDIA_CONCURRENCY, pending.length) }, worker));
  if (failure) throw (failure as { error: unknown }).error;
  return { stored, skipped, recordings, exampleRecordings };
}

function imageStorage(storage: Partial<CardImageStorage>): CardImageStorage | null {
  return storage.bucket && storage.images ? (storage as CardImageStorage) : null;
}

/**
 * Archives every card the import added that is still active, and each deck it made that is
 * left with no active card, all stamped with one moment so restore brings back exactly those.
 */
export async function archiveImport(ctx: ServiceContext, id: string) {
  const { db, userId, actor } = ctx;
  const row = await ownedImport(ctx, id);
  if (row.archivedAt) return row;
  if (row.status !== "done" && row.status !== "failed") {
    throw new ServiceError("conflict", "An import can be archived once it has finished.");
  }
  const at = Date.now();
  await batchStatements(db, [
    sql`update imports set archived_at = ${at}, updated_at = ${at} where id = ${id} and archived_at is null`,
    sql`update cards set archived_at = ${at}, updated_at = ${at}
      where import_id = ${id} and user_id = ${userId} and archived_at is null`,
    sql`update decks set archived_at = ${at}, updated_at = ${at}
      where import_id = ${id} and user_id = ${userId} and archived_at is null
        and not exists (select 1 from cards where cards.deck_id = decks.id and cards.archived_at is null)`,
    sql`insert into audit_log (id, user_id, actor, action, entity, entity_id, payload, created_at)
      select lower(hex(randomblob(10))), ${userId}, ${actor}, 'archive', 'card', id, ${JSON.stringify({ importId: id })}, ${at}
      from cards where import_id = ${id} and user_id = ${userId} and archived_at = ${at}`,
    auditStatement(ctx, { entity: "import", action: "archive", id }),
  ]);
  return ownedImport(ctx, id);
}

/** Brings back the cards and decks the import's archive hid, and their review states. */
export async function restoreImport(ctx: ServiceContext, id: string) {
  const { db, userId, actor } = ctx;
  const row = await ownedImport(ctx, id);
  if (!row.archivedAt) return row;
  const at = row.archivedAt.getTime();
  const now = Date.now();
  const restored = await db
    .select({ id: schema.cards.id })
    .from(schema.cards)
    .where(
      and(
        eq(schema.cards.importId, id),
        eq(schema.cards.userId, userId),
        eq(schema.cards.archivedAt, new Date(at)),
      ),
    );
  await batchStatements(db, [
    sql`update decks set archived_at = null, updated_at = ${now}
      where import_id = ${id} and user_id = ${userId} and archived_at = ${at}`,
    sql`update cards set archived_at = null, updated_at = ${now}
      where import_id = ${id} and user_id = ${userId} and archived_at = ${at}`,
    ...stateStatementsForCards(db, JSON.stringify(restored.map((c) => c.id)), new Date(now)),
    sql`insert into audit_log (id, user_id, actor, action, entity, entity_id, payload, created_at)
      select lower(hex(randomblob(10))), ${userId}, ${actor}, 'restore', 'card', value, ${JSON.stringify({ importId: id })}, ${now}
      from json_each(${JSON.stringify(restored.map((c) => c.id))})`,
    sql`update imports set archived_at = null, updated_at = ${now} where id = ${id}`,
    auditStatement(ctx, { entity: "import", action: "restore", id }),
  ]);
  return ownedImport(ctx, id);
}

export async function ownedImport(ctx: ServiceContext, id: string): Promise<Import> {
  const [row] = await ctx.db
    .select()
    .from(schema.imports)
    .where(and(eq(schema.imports.id, id), eq(schema.imports.userId, ctx.userId)));
  if (!row) throw notFound("Import");
  return row;
}

/** An imported translation with the fingerprint of the example it came with, or of none when the file says it was stale. */
function translationOf(fields: ImportedFields, stale = false) {
  const text = fields.example && fields.exampleTranslation;
  return {
    exampleTranslation: text || null,
    exampleTranslationOf:
      text && fields.example
        ? stale
          ? EARLIER_EXAMPLE
          : exampleFingerprint(fields.example)
        : null,
  };
}
