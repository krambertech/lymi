import {
  type Directions,
  directionsFromModes,
  emptyImportCounts,
  IMAGE_LIMITS,
  IMPORT_LIMITS,
  type ImportCounts,
  type ImportedCard,
  type ImportPreviewOut,
  isImageMode,
  newId,
  normaliseTerm,
  replayProgress,
  serializeState,
  stateDirection,
  TEXT_MODES,
} from "@lymi/core";
import { and, eq, inArray, isNotNull, isNull, or, sql } from "@lymi/core/db";
import type { Import } from "@lymi/core/schema";
import { auditStatement } from "../audit";
import { type BatchStatement, batchStatements } from "../batch";
import { type Db, schema } from "../db";
import type { ImportChoices, SourceAdapter, SourceSummary } from "../imports/adapter";
import { selectIn } from "./batch";
import { type CardImageStorage, uploadCardImage } from "./card-images";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { stateStatementsForCards } from "./modes";

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

/** A card with no language only matches other cards with no language, as in `addCards`. */
function dupKey(language: string | null, term: string) {
  return `${language ?? ""} ${normaliseTerm(term)}`;
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

function deckExternalId(source: string, key: string, name: string) {
  return `${source}:deck:${key}:${name}`;
}

type Lookup = {
  byExternal: Map<string, { id: string; deckId: string }>;
  active: Map<string, string>;
};

/** The learner's cards that an import could meet: by external id, and active ones by term. */
async function lookup(ctx: ServiceContext, cards: ImportedCard[]) {
  const { db, userId } = ctx;
  const externalIds = [...new Set(cards.map((c) => c.externalId))];
  const terms = [...new Set(cards.map((c) => normaliseTerm(c.fields.term)))];
  const [external, active] = await Promise.all([
    selectIn(externalIds, (ids) =>
      db
        .select({
          id: schema.cards.id,
          deckId: schema.cards.deckId,
          externalId: schema.cards.externalId,
        })
        .from(schema.cards)
        .where(and(eq(schema.cards.userId, userId), inArray(schema.cards.externalId, ids))),
    ),
    selectIn(terms, (keys) =>
      db
        .select({
          language: schema.cards.language,
          normalizedTerm: schema.cards.normalizedTerm,
          deckName: schema.decks.name,
        })
        .from(schema.cards)
        .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
        .where(
          and(
            eq(schema.cards.userId, userId),
            isNull(schema.cards.archivedAt),
            inArray(schema.cards.normalizedTerm, keys),
          ),
        ),
    ),
  ]);
  const result: Lookup = { byExternal: new Map(), active: new Map() };
  for (const row of external) {
    if (row.externalId) result.byExternal.set(row.externalId, { id: row.id, deckId: row.deckId });
  }
  for (const row of active) {
    result.active.set(`${row.language ?? ""} ${row.normalizedTerm}`, row.deckName);
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
      })
      .from(schema.cards)
      .where(and(eq(schema.cards.userId, userId), isNotNull(schema.cards.externalId))),
    db
      .select({
        language: schema.cards.language,
        normalizedTerm: schema.cards.normalizedTerm,
        deckName: schema.decks.name,
      })
      .from(schema.cards)
      .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
      .where(and(eq(schema.cards.userId, userId), isNull(schema.cards.archivedAt))),
  ]);
  const result: Lookup = { byExternal: new Map(), active: new Map() };
  for (const row of external) {
    if (row.externalId) result.byExternal.set(row.externalId, { id: row.id, deckId: row.deckId });
  }
  for (const row of active) {
    result.active.set(`${row.language ?? ""} ${row.normalizedTerm}`, row.deckName);
  }
  return result;
}

type Classified =
  | { kind: "existing"; card: ImportedCard; id: string }
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
  seen: Map<string, string>,
): Classified[] {
  return cards.map((card) => {
    const existing = found.byExternal.get(card.externalId);
    if (existing) return { kind: "existing", card, id: existing.id };
    const language =
      card.language !== undefined ? card.language : (languages[card.deckKey] ?? null);
    const key = dupKey(language, card.fields.term);
    const held = found.active.get(key) ?? seen.get(key);
    if (held !== undefined) return { kind: "duplicate", card, deckName: held };
    seen.set(key, deckNames.get(card.deckKey) ?? "");
    return { kind: "added", card, language };
  });
}

/** Adds a batch to the counts. Pictures count as they land, except in a preview. */
function tally(
  counts: ImportCounts,
  classified: Classified[],
  { pictures }: { pictures: boolean },
) {
  for (const item of classified) {
    if (item.kind === "existing") counts.existing++;
    else if (item.kind === "duplicate") {
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
    }
  }
}

export type ImportWork<Note> = {
  row: Import;
  summary: StoredSummary;
  choices: ImportChoices;
  adapter: SourceAdapter<Note>;
  bucket: R2Bucket;
};

async function* importedCards<Note>(work: ImportWork<Note>, from = 0) {
  if (!work.row.objectKey) throw new ServiceError("unavailable", "The import's file is gone");
  for (let chunk = from; chunk < work.row.chunks; chunk++) {
    const notes = await readNoteChunk<Note>(work.bucket, work.row.objectKey, chunk);
    let skipped = 0;
    const cards = notes.flatMap((note) => {
      const made = work.adapter.cards(note, work.summary, work.choices);
      if (made.length === 0) skipped++;
      return made;
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
  return new Map(
    summary.decks.map((deck) => [
      deck.key,
      byExternal.get(deckExternalId(row.source, deck.key, deck.name)) ?? null,
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
  const seen = new Map<string, string>();
  const samples: ImportPreviewOut["samples"] = {};
  const found = await lookupAll(ctx);
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
        notes: card.fields.notes ?? null,
        tags: card.tags,
        modes: card.modes,
        picture: Boolean(card.picture),
      });
    }
    const classified = classify(cards, found, work.choices.languages, names, seen);
    tally(counts, classified, { pictures: true });
    for (const item of classified) {
      if (item.kind !== "added") continue;
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
    tags: tags.size,
    addedByNoteType,
    audio: work.summary.audio,
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
  const seen = new Map<string, string>();
  const found = await lookupAll(ctx);
  for await (const { cards } of importedCards(work)) {
    const classified = classify(cards, found, work.choices.languages, names, seen);
    for (const item of classified) {
      if (item.kind !== "added") continue;
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
    const externalId = deckExternalId(work.row.source, deck.key, deck.name);
    const description = deck.description
      ? [...deck.description].slice(0, IMPORT_LIMITS.deckDescription).join("")
      : null;
    // Inserted only while no active deck holds the external id, so a retried step makes no second deck.
    statements.push(
      sql`insert into decks (id, user_id, name, description, default_language, directions, position, import_id, external_id, archived_at)
        select ${id}, ${userId}, ${names.get(deck.key) ?? deck.name}, ${description},
          ${work.choices.languages[deck.key] ?? null}, ${directions}, 0, ${work.row.id}, ${externalId},
          ${deck.archived ? Date.now() : null}
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
  if (created > 0) {
    await batchStatements(db, [
      sql`update imports set counts = json_set(coalesce(counts, '{}'), '$.decks',
          coalesce(json_extract(counts, '$.decks'), 0) + ${created})
        where id = ${work.row.id}`,
    ]);
  }
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

export type PendingPicture = { cardId: string; name: string; description?: string | undefined };

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
    await lookup(ctx, cards),
    work.choices.languages,
    names,
    new Map(),
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
      existingRows.push({
        id: item.id,
        meaning: fields.meaning ?? null,
        pronunciation: fields.pronunciation ?? null,
        example: fields.example ?? null,
        notes: fields.notes ?? null,
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
      normalizedTerm: normaliseTerm(fields.term),
      meaning: fields.meaning ?? null,
      pronunciation: fields.pronunciation ?? null,
      example: fields.example ?? null,
      notes: fields.notes ?? null,
      language: item.language,
      tags: JSON.stringify(item.card.tags),
      directions: followsDeck ? null : directions,
      reviewModes: followsDeck ? null : JSON.stringify(item.card.modes),
      meaningSource: fields.meaning ? (item.card.fieldSources?.meaning ?? "manual") : null,
      exampleSource: fields.example ? (item.card.fieldSources?.example ?? "manual") : null,
      pronunciationSource: fields.pronunciation
        ? (item.card.fieldSources?.pronunciation ?? "manual")
        : null,
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
        json_extract(value, '$.notes') as notes, json_extract(value, '$.tags') as tags
      from json_each(${part}))`;
    statements.push(
      sql`update cards set
          meaning_source = case when cards.meaning is null and incoming.meaning is not null then 'manual' else cards.meaning_source end,
          example_source = case when cards.example is null and incoming.example is not null then 'manual' else cards.example_source end,
          meaning = coalesce(cards.meaning, incoming.meaning),
          pronunciation = coalesce(cards.pronunciation, incoming.pronunciation),
          example = coalesce(cards.example, incoming.example),
          notes = coalesce(cards.notes, incoming.notes),
          tags = case when cards.tags = '[]' then incoming.tags else cards.tags end,
          updated_at = ${now.getTime()}
        from ${rows} as incoming
        where cards.id = incoming.id and cards.user_id = ${userId} and ${guard}`,
    );
  }
  for (const part of jsonParts(cardRows)) {
    statements.push(
      sql`insert into cards (id, user_id, deck_id, term, normalized_term, meaning, pronunciation, example, notes,
          language, tags, directions, review_modes, meaning_source, example_source, pronunciation_source, source,
          created_by, archived_at, import_id, external_id, created_at, updated_at)
        select ${j("id")}, ${userId}, ${j("deckId")}, ${j("term")}, ${j("normalizedTerm")}, ${j("meaning")},
          ${j("pronunciation")}, ${j("example")}, ${j("notes")}, ${j("language")}, ${j("tags")}, ${j("directions")},
          ${j("reviewModes")}, ${j("meaningSource")}, ${j("exampleSource")}, ${j("pronunciationSource")},
          ${j("source")}, ${actor}, ${j("archivedAt")},
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
    // The imported modes have their states; this adds any other mode the deck asks, and every member's.
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
  statements.push(
    sql`update imports set written = ${chunk + 1}, counts = ${JSON.stringify(counts)}, updated_at = ${now.getTime()}
      where id = ${row.id} and written = ${chunk}`,
  );

  const results = await batchStatements(db, statements);
  const moved = results.at(-1)?.meta.changes === 1;
  return { pictures: moved ? pictures : [] };
}

/** Stores pictures for cards this import added. Returns how many landed and how many did not. */
export async function attachPictures<Note>(
  ctx: ServiceContext,
  work: ImportWork<Note>,
  file: Parameters<SourceAdapter<Note>["media"]>[0],
  pending: PendingPicture[],
  storage: CardImageStorage,
) {
  const read = await work.adapter.media(file);
  let stored = 0;
  let skipped = 0;
  for (const picture of pending) {
    const [card] = await ctx.db
      .select({ imageVersion: schema.cards.imageVersion })
      .from(schema.cards)
      .where(and(eq(schema.cards.id, picture.cardId), eq(schema.cards.importId, work.row.id)));
    if (!card) {
      skipped++;
      continue;
    }
    if (card.imageVersion) {
      stored++;
      continue;
    }
    try {
      const bytes = await read(picture.name, IMAGE_LIMITS.maxBytes);
      if (!bytes) {
        skipped++;
        continue;
      }
      try {
        await uploadCardImage(
          ctx,
          picture.cardId,
          bytes,
          { version: null, description: picture.description },
          storage,
        );
      } catch (err) {
        // A description that names the answer is refused; the picture still comes across without it.
        if (!(picture.description && err instanceof ServiceError && err.code === "invalid"))
          throw err;
        await uploadCardImage(ctx, picture.cardId, bytes, { version: null }, storage);
      }
      stored++;
    } catch (err) {
      if (!(err instanceof ServiceError)) throw err;
      skipped++;
    }
  }
  return { stored, skipped };
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
    auditStatement(db, { userId, actor, action: "archive", entity: "import", entityId: id }),
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
    auditStatement(db, { userId, actor, action: "restore", entity: "import", entityId: id }),
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
