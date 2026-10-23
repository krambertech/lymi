import {
  AnkiConnectCall,
  AnkiConnectNote,
  CARD_LIMITS,
  fitsLanguage,
  type Scope,
  TAG_LIMITS,
  tagKey,
  termKey,
} from "@lymi/core";
import { and, asc, eq, inArray, isNull, selectIn, sql } from "@lymi/core/db";
import { schema } from "../db";
import { track } from "./analytics";
import { meaningText, plainText, soundFiles, sourceText } from "./anki-connect-text";
import { addCards, duplicatesAmong, type ServerCardInput } from "./cards";
import { type ServiceContext, ServiceError } from "./context";
import type { EnrichmentQueue } from "./enrichment";
import { MAX_RECORDING_BYTES, recordingFormat, storeRecording } from "./recordings";

/**
 * Lymi's side of the AnkiConnect protocol, written from its public description so Yomitan and
 * other reading tools add cards with a Lymi key. Each deck the learner owns is a deck, and one
 * note type, "Lymi card", is a card. The public guide is /docs/yomitan.
 */

export const PROTOCOL_VERSION = 6;
export const NOTE_TYPE = "Lymi card";
/** Named so Yomitan fills each with the right marker on its own: the first with the term. */
export const NOTE_FIELDS = ["Term", "Reading", "Meaning", "Sentence", "URL", "Audio"] as const;
type NoteField = (typeof NOTE_FIELDS)[number];

/** Yomitan looks for this wording to tell a duplicate from any other refusal. */
const DUPLICATE = "cannot create note because it is a duplicate";
/** Yomitan looks for this wording to tell an action Lymi lacks from a failure. */
const UNSUPPORTED = "unsupported action";
/** Yomitan's default tag, which Activity already says. */
const CLIENT_TAGS = new Set(["yomitan"]);
/** Notes in one call, as many as `POST /api/cards` takes, since each may queue enrichment. */
export const MAX_NOTES = 200;
/** Calls in one `multi`, which may not nest; the key's rate limit counts the request once. */
export const MAX_ACTIONS = 50;
/** Uploads wait here, in the imports bucket, until their note arrives or the hourly sweep. */
const STASH = "anki-connect/";
const STASH_HOURS = 1;

const SUPPORTED = [
  "version",
  "requestPermission",
  "apiReflect",
  "deckNames",
  "modelNames",
  "modelFieldNames",
  "canAddNotes",
  "canAddNotesWithErrorDetail",
  "addNote",
  "addNotes",
  "findNotes",
  "findCards",
  "notesInfo",
  "cardsInfo",
  "storeMediaFile",
  "guiBrowse",
  "guiEditNote",
  "sync",
  "multi",
] as const;

export type AnkiConnectDeps = {
  scope: Scope;
  enrichment: EnrichmentQueue | null;
  /** Where uploads wait, and where a term's recording is kept. */
  media: { stash: R2Bucket; audio: R2Bucket } | null;
};

/** A refusal the client shows the learner as it is, so it is written for them. */
class Refusal extends Error {}

type Reason = "deck" | "note_type" | "language" | "term" | "read_only";

/** Before version 5 a reply is the bare result, from 5 on `{ result, error }`; the default is 4. */
export function reply(version: number | undefined, result: unknown, error: string | null) {
  if ((version ?? 4) >= 5) return { result: error === null ? result : null, error };
  return error === null ? result : { result: null, error };
}

/** The one call an AnkiConnect client makes before it has a key. */
export function isOpenCall(call: AnkiConnectCall) {
  return call.action === "requestPermission";
}

export function answerOpenCall(call: AnkiConnectCall) {
  return reply(
    call.version,
    { permission: "granted", requireApikey: true, version: PROTOCOL_VERSION },
    null,
  );
}

/** Answers one call, and each call inside a `multi`, in the shape its version asks for. */
export async function answerCall(
  ctx: ServiceContext,
  call: AnkiConnectCall,
  deps: AnkiConnectDeps,
): Promise<unknown> {
  try {
    if (call.action === "multi") {
      const inner = AnkiConnectCall.array().max(MAX_ACTIONS).safeParse(call.params?.actions);
      if (!inner.success) {
        throw new Refusal(`multi takes a list of up to ${MAX_ACTIONS} actions.`);
      }
      if (inner.data.some((each) => each.action === "multi")) {
        throw new Refusal("multi can’t hold another multi.");
      }
      const results: unknown[] = [];
      for (const each of inner.data) results.push(await answerCall(ctx, each, deps));
      return reply(call.version, results, null);
    }
    return reply(call.version, await run(ctx, call, deps), null);
  } catch (error) {
    if (error instanceof Refusal || error instanceof ServiceError) {
      return reply(call.version, null, error.message);
    }
    throw error;
  }
}

async function run(ctx: ServiceContext, call: AnkiConnectCall, deps: AnkiConnectDeps) {
  const params = call.params ?? {};
  switch (call.action) {
    case "version":
      return PROTOCOL_VERSION;
    case "requestPermission":
      return { permission: "granted", requireApikey: true, version: PROTOCOL_VERSION };
    case "apiReflect": {
      const asked = Array.isArray(params.actions) ? params.actions : null;
      return {
        scopes: ["actions"],
        actions: SUPPORTED.filter((action) => !asked || asked.includes(action)),
      };
    }
    case "deckNames":
      return (await ownedDecks(ctx)).map((deck) => deck.name);
    case "modelNames":
      return [NOTE_TYPE];
    case "modelFieldNames":
      if (params.modelName !== NOTE_TYPE) throw new Refusal(chooseNoteType());
      return [...NOTE_FIELDS];
    case "canAddNotes":
      return (await canAdd(ctx, notesOf(params.notes))).map((r) => r.canAdd);
    case "canAddNotesWithErrorDetail":
      return canAdd(ctx, notesOf(params.notes));
    case "addNote": {
      const [outcome] = await add(ctx, notesOf([params.note]), deps);
      if (!outcome || "error" in outcome) throw new Refusal(outcome?.error ?? noteUnreadable());
      return outcome.id;
    }
    case "addNotes":
      return (await add(ctx, notesOf(params.notes), deps)).map((o) => ("id" in o ? o.id : null));
    case "findNotes":
    case "findCards":
      return findNotes(ctx, typeof params.query === "string" ? params.query : "");
    case "notesInfo":
      return notesInfo(ctx, numbers(params.notes));
    case "cardsInfo":
      return (await notesInfo(ctx, numbers(params.cards))).map((note) =>
        "noteId" in note
          ? {
              cardId: note.noteId,
              note: note.noteId,
              deckName: note.deckName,
              modelName: NOTE_TYPE,
              queue: 0,
              flags: 0,
            }
          : {},
      );
    case "storeMediaFile":
      return storeMedia(ctx, params, deps);
    // Lymi has no window to open, so the client's View note does nothing rather than fail.
    case "guiBrowse":
      return [];
    case "guiEditNote":
    case "sync":
      return null;
    case "updateNoteFields":
    case "updateNote":
      throw new Refusal(
        "Lymi doesn’t change cards from here. In Yomitan’s Anki settings, set duplicates to add a new note, and edit the card in Lymi.",
      );
    default:
      throw new Refusal(UNSUPPORTED);
  }
}

function notesOf(value: unknown): (AnkiConnectNote | null)[] {
  const notes = Array.isArray(value) ? value : [];
  if (notes.length > MAX_NOTES) throw new Refusal(`Send at most ${MAX_NOTES} notes at a time.`);
  return notes.map((note) => {
    const parsed = AnkiConnectNote.safeParse(note);
    return parsed.success ? parsed.data : null;
  });
}

function numbers(value: unknown): number[] {
  const ids = (Array.isArray(value) ? value : []).filter((n): n is number => Number.isInteger(n));
  if (ids.length > MAX_NOTES) throw new Refusal(`Ask for at most ${MAX_NOTES} notes at a time.`);
  return ids;
}

type Deck = { id: string; name: string; language: string | null };

/** The learner's own active decks, oldest first. A name two decks share gets a number, so each is one choice. */
async function ownedDecks({ db, userId }: ServiceContext): Promise<Deck[]> {
  const rows = await db
    .select({
      id: schema.decks.id,
      name: schema.decks.name,
      language: schema.decks.defaultLanguage,
    })
    .from(schema.decks)
    .where(and(eq(schema.decks.userId, userId), isNull(schema.decks.archivedAt)))
    .orderBy(asc(schema.decks.createdAt), asc(schema.decks.id));
  const seen = new Map<string, number>();
  return rows.map((deck) => {
    const count = (seen.get(deck.name) ?? 0) + 1;
    seen.set(deck.name, count);
    return count === 1 ? deck : { ...deck, name: `${deck.name} (${count})` };
  });
}

const LANGUAGE_NAMES = new Intl.DisplayNames(["en"], { type: "language" });

function languageName(language: string) {
  try {
    return LANGUAGE_NAMES.of(language) ?? language;
  } catch {
    return language;
  }
}

const chooseNoteType = () => `In Yomitan’s Anki settings, choose the note type “${NOTE_TYPE}”.`;
const noteUnreadable = () =>
  `Lymi couldn’t read this note. In Yomitan’s Anki settings, choose a Lymi deck and the note type “${NOTE_TYPE}”.`;

type Prepared =
  | { ok: true; input: ServerCardInput; allowDuplicate: boolean; sound: string | undefined }
  | { ok: false; error: string; reason: Reason | null };

function field(note: AnkiConnectNote, name: NoteField) {
  return note.fields[name] ?? "";
}

/** A field cut to its limit, at the last line that fits. */
function fitted(text: string, limit: number) {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastLine = cut.lastIndexOf("\n");
  return (lastLine > 0 ? cut.slice(0, lastLine) : cut).trim();
}

/** The page, without its query when that is what makes it too long, or else its site. */
function fittedSource(url: string) {
  if (url.length <= CARD_LIMITS.source) return url;
  try {
    const parsed = new URL(url);
    const page = `${parsed.origin}${parsed.pathname}`;
    return page.length <= CARD_LIMITS.source ? page : parsed.host;
  } catch {
    return undefined;
  }
}

function tagsOf(note: AnkiConnectNote) {
  const kept = new Map<string, string>();
  for (const tag of note.tags ?? []) {
    const name = tag.trim();
    const key = tagKey(name);
    if (!name || name.length > TAG_LIMITS.length || CLIENT_TAGS.has(key) || kept.has(key)) continue;
    kept.set(key, name);
  }
  return [...kept.values()].slice(0, TAG_LIMITS.count);
}

function prepare(note: AnkiConnectNote | null, decks: Map<string, Deck>): Prepared {
  if (!note) return { ok: false, error: noteUnreadable(), reason: null };
  if (note.modelName !== NOTE_TYPE) {
    return { ok: false, error: chooseNoteType(), reason: "note_type" };
  }
  const deck = decks.get(note.deckName);
  if (!deck) {
    return {
      ok: false,
      error: `Lymi has no deck called “${note.deckName}”. In Yomitan’s Anki settings, choose one of your decks.`,
      reason: "deck",
    };
  }
  const term = plainText(field(note, "Term"));
  if (!term || term.length > CARD_LIMITS.term) {
    return {
      ok: false,
      error: term
        ? "This term is too long for a card. Look up a shorter one."
        : "This note has no term. In Yomitan’s Anki settings, set Term to {expression}.",
      reason: "term",
    };
  }
  if (deck.language && !fitsLanguage(term, deck.language)) {
    const language = languageName(deck.language);
    return {
      ok: false,
      error: `“${term}” isn’t ${language}, and “${deck.name}” is a ${language} deck. In Yomitan’s Anki settings, choose a deck for this language.`,
      reason: "language",
    };
  }
  const reading = plainText(field(note, "Reading"));
  const meaning = fitted(meaningText(field(note, "Meaning")), CARD_LIMITS.meaning);
  const example = fitted(plainText(field(note, "Sentence")), CARD_LIMITS.example);
  const source = fittedSource(sourceText(field(note, "URL")));
  const tags = tagsOf(note);
  return {
    ok: true,
    allowDuplicate: note.options?.allowDuplicate === true,
    sound: soundFiles(field(note, "Audio"))[0],
    input: {
      deckId: deck.id,
      term,
      ...(meaning ? { meaning } : {}),
      ...(reading && reading !== term && reading.length <= CARD_LIMITS.pronunciation
        ? { pronunciation: reading }
        : {}),
      ...(example ? { example } : {}),
      ...(source ? { source } : {}),
      ...(tags.length > 0 ? { tags } : {}),
      // Fields the dictionary left empty fill as the deck's enrichment says.
      enrich: true,
    },
  };
}

async function canAdd(ctx: ServiceContext, notes: (AnkiConnectNote | null)[]) {
  const decks = await ownedDecks(ctx);
  const byName = new Map(decks.map((d) => [d.name, d]));
  const languageOf = new Map(decks.map((d) => [d.id, d.language]));
  const prepared = notes.map((note) => prepare(note, byName));
  const held = await duplicatesAmong(
    ctx,
    prepared.flatMap((p) =>
      p.ok
        ? [
            {
              term: p.input.term,
              language: languageOf.get(p.input.deckId) ?? null,
              pronunciation: p.input.pronunciation,
            },
          ]
        : [],
    ),
  );
  let next = 0;
  return prepared.map((p) => {
    if (!p.ok) return { canAdd: false, error: p.error };
    const duplicate = held[next++];
    if (duplicate && !p.allowDuplicate) return { canAdd: false, error: DUPLICATE };
    return { canAdd: true, error: null };
  });
}

/** Adds the notes Lymi can read; a duplicate is skipped and answers with the card holding it. ADR 0004. */
function requireWrite(ctx: ServiceContext, deps: AnkiConnectDeps) {
  if (deps.scope === "write") return;
  track(ctx.analytics, { name: "anki_connect_refused", reason: "read_only" });
  throw new Refusal(
    "This Lymi key can only read. In Lymi’s Settings, make a key for Yomitan and paste it into Yomitan.",
  );
}

async function add(ctx: ServiceContext, notes: (AnkiConnectNote | null)[], deps: AnkiConnectDeps) {
  requireWrite(ctx, deps);
  const byName = new Map((await ownedDecks(ctx)).map((d) => [d.name, d]));
  const prepared = notes.map((note) => prepare(note, byName));
  for (const p of prepared) {
    if (!p.ok && p.reason) track(ctx.analytics, { name: "anki_connect_refused", reason: p.reason });
  }
  const valid = prepared.flatMap((p) => (p.ok ? [p] : []));
  const outcomes = await addCards(
    ctx,
    valid.map((p) => p.input),
    deps.enrichment,
    { fromAnkiConnect: true },
  );
  const { media } = deps;
  if (media) {
    await Promise.all(
      valid.map((p, index) => {
        const outcome = outcomes[index];
        if (!p.sound || !outcome) return undefined;
        return keepSound(ctx, outcome.status === "added" ? outcome.id : null, p.sound, media);
      }),
    );
  }
  const ids = await noteIds(
    ctx,
    outcomes.map((o) => o.id),
  );
  let next = 0;
  return prepared.map((p) => {
    if (!p.ok) return { error: p.error };
    const id = ids.get(outcomes[next++]?.id ?? "");
    return id === undefined ? { error: noteUnreadable() } : { id };
  });
}

async function stashKey(userId: string, fileName: string) {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fileName)),
  );
  const hex = [...digest.subarray(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${STASH}${userId}/${hex}`;
}

/**
 * An upload arrives before the note that plays it. A clip in a format both apps play waits for
 * its note; anything else, such as a screenshot, is answered and dropped.
 */
async function storeMedia(
  ctx: ServiceContext,
  params: Record<string, unknown>,
  deps: AnkiConnectDeps,
) {
  requireWrite(ctx, deps);
  const fileName = typeof params.filename === "string" ? params.filename : "";
  if (!fileName) throw new Refusal("storeMediaFile needs a filename.");
  const { data } = params;
  if (!deps.media || typeof data !== "string") return fileName;
  if (data.length > Math.ceil(MAX_RECORDING_BYTES / 3) * 4) return fileName;
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  } catch {
    return fileName;
  }
  if (!recordingFormat(bytes)) return fileName;
  await deps.media.stash.put(await stashKey(ctx.userId, fileName), bytes);
  return fileName;
}

/** Keeps a waiting clip as the new card's recording, then lets it go either way. */
async function keepSound(
  ctx: ServiceContext,
  cardId: string | null,
  fileName: string,
  media: NonNullable<AnkiConnectDeps["media"]>,
) {
  const key = await stashKey(ctx.userId, fileName);
  if (cardId) {
    await storeRecording(
      ctx,
      cardId,
      async () => {
        const object = await media.stash.get(key);
        return object ? new Uint8Array(await object.arrayBuffer()) : null;
      },
      media.audio,
    );
  }
  await media.stash.delete(key);
}

/** Deletes uploads whose note never came. Run from the cron. */
export async function sweepAnkiConnectUploads(stash: R2Bucket, at: Date) {
  const before = at.getTime() - STASH_HOURS * 60 * 60 * 1000;
  let cursor: string | undefined;
  do {
    const page = await stash.list({ prefix: STASH, ...(cursor ? { cursor } : {}) });
    const stale = page.objects.filter((o) => o.uploaded.getTime() < before).map((o) => o.key);
    if (stale.length > 0) await stash.delete(stale);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

const rowid = sql<number>`${schema.cards}.rowid`;

/** AnkiConnect ids are whole numbers, so a card's is its row number. Clients keep it only while a popup is open. */
async function noteIds({ db, userId }: ServiceContext, cardIds: string[]) {
  if (cardIds.length === 0) return new Map<string, number>();
  const rows = await selectIn(cardIds, (slice) =>
    db
      .select({ id: schema.cards.id, note: rowid })
      .from(schema.cards)
      .where(and(eq(schema.cards.userId, userId), inArray(schema.cards.id, slice))),
  );
  return new Map(rows.map((r) => [r.id, r.note]));
}

type Query = { deck?: string; field?: string; notes?: number[] };

/**
 * The searches Yomitan writes to find a duplicate's note: `"deck:Name" "term:value"`, `nid:1,2`,
 * and alternatives joined as `(a) or (b)`. Any other field name is read as the term.
 */
export function parseQuery(query: string): Query[] {
  const alternatives = /\)\s+or\s+\(/i.test(query)
    ? query
        .trim()
        .replace(/^\(|\)$/g, "")
        .split(/\)\s+or\s+\(/i)
    : [query];
  return alternatives.map((alternative) => {
    const parsed: Query = {};
    // Parentheses group outside quotes only, so "term:(笑)" keeps its own.
    for (const [, quoted, bare] of alternative.matchAll(/"([^"]*)"|([^\s()"]+)/g)) {
      const token = quoted ?? bare ?? "";
      const colon = token.indexOf(":");
      if (colon < 0) continue;
      const name = token.slice(0, colon).toLowerCase();
      const value = token.slice(colon + 1);
      if (name === "deck") parsed.deck = value;
      else if (name === "nid" || name === "cid") {
        parsed.notes = value.split(",").map(Number).filter(Number.isInteger);
      } else parsed.field = value;
    }
    return parsed;
  });
}

async function findNotes(ctx: ServiceContext, query: string) {
  const decks = await ownedDecks(ctx);
  const byName = new Map(decks.map((d) => [d.name, d]));
  const languages = [...new Set(decks.map((d) => d.language))];
  const found = new Set<number>();
  for (const q of parseQuery(query)) {
    if (q.deck === undefined && q.field === undefined && q.notes === undefined) continue;
    const where = [eq(schema.cards.userId, ctx.userId), isNull(schema.cards.archivedAt)];
    if (q.deck !== undefined) {
      const deck = byName.get(q.deck);
      if (!deck) continue;
      where.push(eq(schema.cards.deckId, deck.id));
    }
    if (q.field !== undefined) {
      const term = plainText(q.field);
      const keys = new Set(languages.map((language) => termKey(language, term)));
      where.push(inArray(schema.cards.normalizedTerm, [...keys]));
    }
    const search = (notes?: number[]) =>
      ctx.db
        .select({ note: rowid })
        .from(schema.cards)
        .where(and(...where, ...(notes ? [inArray(rowid, notes)] : [])));
    const rows = q.notes ? await selectIn(q.notes, search) : await search();
    for (const row of rows) found.add(row.note);
  }
  return [...found];
}

async function notesInfo({ db, userId }: ServiceContext, ids: number[]) {
  if (ids.length === 0) return [];
  const rows = await selectIn(ids, (slice) =>
    db
      .select({ note: rowid, card: schema.cards, deckName: schema.decks.name })
      .from(schema.cards)
      .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
      .where(and(eq(schema.cards.userId, userId), inArray(rowid, slice))),
  );
  const byNote = new Map(rows.map((row) => [row.note, row]));
  return ids.map((id) => {
    const row = byNote.get(id);
    if (!row) return {};
    const values: Record<NoteField, string> = {
      Term: row.card.term,
      Reading: row.card.pronunciation ?? "",
      Meaning: row.card.meaning ?? "",
      Sentence: row.card.example ?? "",
      URL: row.card.source ?? "",
      Audio: "",
    };
    return {
      noteId: id,
      modelName: NOTE_TYPE,
      deckName: row.deckName,
      tags: row.card.tags,
      fields: Object.fromEntries(
        NOTE_FIELDS.map((name, order) => [name, { value: values[name], order }]),
      ),
      cards: [id],
      mod: Math.floor(row.card.updatedAt.getTime() / 1000),
    };
  });
}
