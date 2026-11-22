import {
  AnkiConnectCall,
  type AnkiConnectMedia,
  AnkiConnectNote,
  AnkiConnectNoteUpdate,
  CARD_LIMITS,
  fitsLanguage,
  IMAGE_LIMITS,
  inspectImage,
  pronunciationText,
  type Scope,
  TAG_LIMITS,
  tagKey,
  termKey,
} from "@lymi/core";
import { and, asc, eq, gte, inArray, isNull, selectIn, sql } from "@lymi/core/db";
import type { Card } from "@lymi/core/schema";
import { schema } from "../db";
import {
  ankiConnectUploadKey,
  type ObjectKey,
  type ObjectStore,
  putObject,
  STORED,
} from "../storage";
import { track } from "./analytics";
import { meaningText, pictureFiles, plainText, soundFiles, sourceText } from "./anki-connect-text";
import { type CardImageStorage, storeImportedImage } from "./card-images";
import {
  addCards,
  duplicatesAmong,
  type ServerCardInput,
  type ServerCardPatch,
  updateCard,
} from "./cards";
import { type ServiceContext, ServiceError } from "./context";
import type { EnrichmentQueue } from "./enrichment";
import {
  MAX_RECORDING_BYTES,
  recordingFormat,
  storeExampleRecording,
  storeRecording,
} from "./recordings";

/**
 * Lymi's side of the AnkiConnect protocol, written from its public description so Yomitan and
 * other reading tools add cards with a Lymi key. Each deck the learner owns is a deck, and one
 * note type, "Lymi card", is a card. The public guide is /docs/yomitan.
 */

export const PROTOCOL_VERSION = 6;
/**
 * The audit client of an AnkiConnect write: one per key name, so a replaced key keeps its app's
 * Activity and another AnkiConnect tool's key stays apart from it.
 */
export const ankiConnectClient = (keyName: string | undefined) =>
  keyName ? `anki-connect:${keyName}` : "anki-connect";
export const NOTE_TYPE = "Lymi card";
/**
 * Named so Yomitan fills each with the right marker on its own: the first with the term. Sentence
 * audio and Picture are for a capture tool such as asbplayer, and keep what it sends for the
 * card's owner alone. CONTEXT.md, Recording.
 */
export const NOTE_FIELDS = [
  "Term",
  "Reading",
  "Meaning",
  "Sentence",
  "URL",
  "Audio",
  "Sentence audio",
  "Picture",
] as const;
type NoteField = (typeof NOTE_FIELDS)[number];

/** Yomitan looks for this wording to tell a duplicate from any other refusal. */
const DUPLICATE = "cannot create note because it is a duplicate";
/** Yomitan looks for this wording to tell an action Lymi lacks from a failure. */
const UNSUPPORTED = "unsupported action";
/** Yomitan's default tag, which Activity already says. */
const CLIENT_TAGS = new Set(["yomitan"]);
/** Notes in one call, as many as `POST /api/cards` takes, since each may queue enrichment. */
export const MAX_NOTES = 200;
/** Files one request may upload, inside notes or by `storeMediaFile`; asbplayer sends two a card. */
export const MAX_FILES = 20;
/** Calls in one `multi`, which may not nest; the key's rate limit counts the request once. */
export const MAX_ACTIONS = 50;
/** Search alternatives in one request, each a query; a popup sends one or two per entry. */
export const MAX_SEARCHES = 100;
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
  "updateNoteFields",
  "addTags",
  "guiBrowse",
  "guiEditNote",
  "sync",
  "multi",
] as const;

export type AnkiConnectDeps = {
  scope: Scope;
  enrichment: EnrichmentQueue | null;
  /** Where uploads wait, where recordings are kept, and, when configured, where pictures are. */
  media: { stash: ObjectStore; audio: ObjectStore; pictures?: CardImageStorage | null } | null;
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

/** How many notes or note ids one request may still carry, shared by every call in a `multi`. */
class Budget {
  notes = MAX_NOTES;
  searches = MAX_SEARCHES;
  files = MAX_FILES;
  file() {
    if (this.files === 0) throw new Refusal(`Send at most ${MAX_FILES} files in one request.`);
    this.files--;
  }
  take(count: number, refusal: string) {
    if (count > this.notes) throw new Refusal(refusal);
    this.notes -= count;
  }
  search(count: number) {
    if (count > this.searches) {
      throw new Refusal(`Search for at most ${MAX_SEARCHES} alternatives in one request.`);
    }
    this.searches -= count;
  }
}

const tooManyNotes = () => `Send at most ${MAX_NOTES} notes in one request.`;
const tooManyIds = () => `Ask for at most ${MAX_NOTES} notes in one request.`;

/** Answers one call, and each call inside a `multi`, in the shape its version asks for. */
export async function answerCall(
  ctx: ServiceContext,
  call: AnkiConnectCall,
  deps: AnkiConnectDeps,
  budget = new Budget(),
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
      for (const each of inner.data) results.push(await answerCall(ctx, each, deps, budget));
      return reply(call.version, results, null);
    }
    return reply(call.version, await run(ctx, call, deps, budget), null);
  } catch (error) {
    if (error instanceof Refusal || error instanceof ServiceError) {
      return reply(call.version, null, error.message);
    }
    throw error;
  }
}

async function run(
  ctx: ServiceContext,
  call: AnkiConnectCall,
  deps: AnkiConnectDeps,
  budget: Budget,
) {
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
      return (await canAdd(ctx, notesOf(params.notes, budget))).map((r) => r.canAdd);
    case "canAddNotesWithErrorDetail":
      return canAdd(ctx, notesOf(params.notes, budget));
    case "addNote": {
      const [outcome] = await add(ctx, notesOf([params.note], budget), deps, budget);
      if (!outcome || "error" in outcome) throw new Refusal(outcome?.error ?? noteUnreadable());
      return outcome.id;
    }
    case "addNotes":
      return (await add(ctx, notesOf(params.notes, budget), deps, budget)).map((o) =>
        "id" in o ? o.id : null,
      );
    case "findNotes":
    case "findCards":
      return findNotes(ctx, typeof params.query === "string" ? params.query : "", budget);
    case "notesInfo":
      return notesInfo(ctx, numbers(params.notes, budget));
    case "cardsInfo":
      return (await notesInfo(ctx, numbers(params.cards, budget))).map((note) =>
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
      return storeMedia(ctx, params, deps, budget);
    // Lymi has no window to open, so the client's View note does nothing rather than fail.
    case "guiBrowse":
      return [];
    case "guiEditNote":
    case "sync":
      return null;
    case "updateNoteFields":
      return updateNoteFields(ctx, params.note, deps, budget);
    case "addTags":
      return addTags(ctx, params, deps, budget);
    case "updateNote":
      throw new Refusal(
        "Lymi doesn’t change a card’s tags and fields together. In Yomitan’s Anki settings, set duplicates to add a new note, and edit the card in Lymi.",
      );
    default:
      throw new Refusal(UNSUPPORTED);
  }
}

function notesOf(value: unknown, budget: Budget): (AnkiConnectNote | null)[] {
  const notes = Array.isArray(value) ? value : [];
  budget.take(notes.length, tooManyNotes());
  return notes.map((note) => {
    const parsed = AnkiConnectNote.safeParse(note);
    return parsed.success ? parsed.data : null;
  });
}

function numbers(value: unknown, budget: Budget): number[] {
  const ids = (Array.isArray(value) ? value : []).filter((n): n is number => Number.isInteger(n));
  budget.take(ids.length, tooManyIds());
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

/** The files a note's fields play or show, by the role each has on the card. */
type NoteMedia = { sound: string[]; exampleSound: string[]; picture: string[] };

function mediaOf(fields: Record<string, string>): NoteMedia {
  return {
    sound: soundFiles(fields.Audio ?? ""),
    exampleSound: soundFiles(fields["Sentence audio"] ?? ""),
    picture: pictureFiles(fields.Picture ?? ""),
  };
}

type Prepared =
  | { ok: true; input: ServerCardInput; allowDuplicate: boolean; media: NoteMedia }
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

function tagsOf(note: Pick<AnkiConnectNote, "tags">) {
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
    media: mediaOf(note.fields),
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

async function add(
  ctx: ServiceContext,
  sent: (AnkiConnectNote | null)[],
  deps: AnkiConnectDeps,
  budget: Budget,
) {
  requireWrite(ctx, deps);
  // One note's files at a time, so a request never holds every upload in memory at once.
  const notes: (AnkiConnectNote | null)[] = [];
  for (const note of sent) {
    notes.push(
      note ? { ...note, fields: await withFiles(ctx, note.fields, note, deps, budget) } : null,
    );
  }
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
    // One note at a time: a note may name files earlier requests stashed, so this is not bounded
    // by the files this request carried.
    for (const [index, p] of valid.entries()) {
      const outcome = outcomes[index];
      // A duplicate's card keeps its own media; the uploads go either way.
      const cardId = outcome?.status === "added" ? outcome.id : null;
      if (cardId) await keepMedia(ctx, cardId, p.media, media, "add");
      await dropUploads(ctx, p.media, media);
    }
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

async function stashKey(userId: string, fileName: string): Promise<ObjectKey> {
  const digest = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(fileName)),
  );
  const hex = [...digest.subarray(0, 16)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return ankiConnectUploadKey(userId, hex);
}

/** What an upload is, by its bytes, or null for anything Lymi keeps neither as a clip nor as a picture. */
function uploadKind(bytes: Uint8Array): "audio" | "picture" | null {
  if (recordingFormat(bytes)) return bytes.byteLength <= MAX_RECORDING_BYTES ? "audio" : null;
  return inspectImage(bytes).ok ? "picture" : null;
}

/**
 * An upload arrives before the note that plays or shows it. A clip in a format both apps play, or
 * a still picture, waits for its note; anything else is answered and dropped.
 */
async function stash(
  ctx: ServiceContext,
  fileName: string,
  data: unknown,
  deps: AnkiConnectDeps,
): Promise<void> {
  if (!deps.media || typeof data !== "string") return;
  if (data.length > Math.ceil(IMAGE_LIMITS.maxBytes / 3) * 4) return;
  let bytes: Uint8Array;
  try {
    bytes = Uint8Array.from(atob(data), (c) => c.charCodeAt(0));
  } catch {
    return;
  }
  if (!uploadKind(bytes)) return;
  await putObject(deps.media.stash, await stashKey(ctx.userId, fileName), bytes);
}

async function storeMedia(
  ctx: ServiceContext,
  params: Record<string, unknown>,
  deps: AnkiConnectDeps,
  budget: Budget,
) {
  requireWrite(ctx, deps);
  const fileName = typeof params.filename === "string" ? params.filename : "";
  if (!fileName) throw new Refusal("storeMediaFile needs a filename.");
  budget.file();
  await stash(ctx, fileName, params.data, deps);
  return fileName;
}

/**
 * A note's `audio` and `picture` entries, as AnkiConnect reads them: each file is saved, then
 * referenced at the end of every field it names, as `storeMediaFile` and a field would. Only a
 * capture tool sends files this way, so one aimed at Audio, the term's recording that the deck's
 * members hear, is left out rather than shared.
 */
async function withFiles(
  ctx: ServiceContext,
  fields: Record<string, string>,
  files: { audio?: AnkiConnectMedia[] | undefined; picture?: AnkiConnectMedia[] | undefined },
  deps: AnkiConnectDeps,
  budget: Budget,
): Promise<Record<string, string>> {
  const result = { ...fields };
  const entries = [
    ...(files.audio ?? []).map((file) => ({ file, marker: `[sound:${file.filename}]` })),
    ...(files.picture ?? []).map((file) => ({
      file,
      marker: `<img src="${file.filename.replace(/"/g, "&quot;")}">`,
    })),
  ];
  for (const { file, marker } of entries) {
    const names = (file.fields ?? []).filter((name) => name !== "Audio");
    if (!file.filename || names.length === 0) continue;
    budget.file();
    await stash(ctx, file.filename, file.data, deps);
    for (const name of names) result[name] = `${result[name] ?? ""}${marker}`;
  }
  return result;
}

/** The waiting upload of the first of these files that has one, as bytes. */
async function firstUpload(
  ctx: ServiceContext,
  files: string[],
  stashed: ObjectStore,
): Promise<Uint8Array | null> {
  for (const fileName of files) {
    const object = await stashed.get(await stashKey(ctx.userId, fileName));
    if (object) return new Uint8Array(await object.arrayBuffer());
  }
  return null;
}

/**
 * Keeps a note's waiting files on its card: the term's clip as the card's recording, and the
 * sentence's clip and the picture as the owner's captured media. Each takes the first of its
 * field's files that arrived, since a client may write an old reference before the new one.
 */
async function keepMedia(
  ctx: ServiceContext,
  cardId: string,
  files: NoteMedia,
  media: NonNullable<AnkiConnectDeps["media"]>,
  action: "add" | "update",
) {
  if (files.sound.length > 0) {
    await storeRecording(
      ctx,
      cardId,
      () => firstUpload(ctx, files.sound, media.stash),
      media.audio,
    );
  }
  if (files.exampleSound.length > 0) {
    const [card] = await ctx.db
      .select({ example: schema.cards.example })
      .from(schema.cards)
      .where(and(eq(schema.cards.id, cardId), eq(schema.cards.userId, ctx.userId)));
    const stored = await storeExampleRecording(
      ctx,
      cardId,
      card?.example ?? undefined,
      () => firstUpload(ctx, files.exampleSound, media.stash),
      media.audio,
      true,
    );
    if (stored === "stored") {
      track(ctx.analytics, { name: "anki_connect_media", kind: "sentence_audio", action });
    }
  }
  if (files.picture.length > 0 && media.pictures && (await pictureSlotOpen(ctx, cardId))) {
    const bytes = await firstUpload(ctx, files.picture, media.stash);
    if (bytes) {
      const [card] = await ctx.db
        .select()
        .from(schema.cards)
        .where(and(eq(schema.cards.id, cardId), eq(schema.cards.userId, ctx.userId)));
      try {
        if (card) {
          await storeImportedImage(ctx, card, bytes, undefined, media.pictures, true);
          track(ctx.analytics, { name: "anki_connect_media", kind: "picture", action });
        }
      } catch (error) {
        // A picture the Images binding cannot read, or one a newer write replaced, is left out.
        if (!(error instanceof ServiceError)) throw error;
      }
    }
  }
}

/**
 * Whether a captured frame may take the card's picture: only when the card has none, or has only
 * an earlier captured one. A picture the learner chose or an import brought, active or archived
 * for restore, stays.
 */
async function pictureSlotOpen(ctx: ServiceContext, cardId: string) {
  const [held] = await ctx.db
    .select({ id: schema.cardImages.id })
    .from(schema.cardImages)
    .where(
      and(
        eq(schema.cardImages.cardId, cardId),
        eq(schema.cardImages.userId, ctx.userId),
        inArray(schema.cardImages.status, ["active", "archived"]),
        eq(schema.cardImages.captured, false),
      ),
    )
    .limit(1);
  return !held;
}

/** Lets a note's uploads go once its card has what it keeps. */
async function dropUploads(
  ctx: ServiceContext,
  files: NoteMedia,
  media: NonNullable<AnkiConnectDeps["media"]>,
) {
  const names = [...files.sound, ...files.exampleSound, ...files.picture];
  if (names.length === 0) return;
  await media.stash.delete(await Promise.all(names.map((name) => stashKey(ctx.userId, name))));
}

/** The learner's own card behind a note id, or a refusal naming the id as AnkiConnect does. */
async function ownCardOf(ctx: ServiceContext, note: number): Promise<Card> {
  const [row] = await ctx.db
    .select({ card: schema.cards })
    .from(schema.cards)
    .where(and(eq(schema.cards.userId, ctx.userId), eq(rowid, note)));
  if (!row) throw new Refusal(`Note was not found: ${note}`);
  return row.card;
}

/**
 * Changes a card's text from the fields a client sends, as asbplayer's update of the last card
 * does. The term stays, and an empty field clears nothing. The sentence lands before its clip,
 * because a new sentence drops the clip that said the old one.
 */
async function updateNoteFields(
  ctx: ServiceContext,
  value: unknown,
  deps: AnkiConnectDeps,
  budget: Budget,
) {
  requireWrite(ctx, deps);
  const parsed = AnkiConnectNoteUpdate.safeParse(value);
  if (!parsed.success) throw new Refusal("updateNoteFields needs a note with an id and fields.");
  const card = await ownCardOf(ctx, parsed.data.id);
  const fields = await withFiles(ctx, parsed.data.fields ?? {}, parsed.data, deps, budget);
  const patch: ServerCardPatch = {};
  const text = (name: NoteField) => fields[name] ?? "";
  const meaning = fitted(meaningText(text("Meaning")), CARD_LIMITS.meaning);
  if (meaning && meaning !== card.meaning) patch.meaning = meaning;
  const reading = plainText(text("Reading"));
  if (
    reading &&
    reading !== card.term &&
    reading !== (pronunciationText(card) ?? "") &&
    reading.length <= CARD_LIMITS.pronunciation
  ) {
    patch.pronunciation = reading;
  }
  const example = fitted(plainText(text("Sentence")), CARD_LIMITS.example);
  if (example && example !== card.example) patch.example = example;
  const source = fittedSource(sourceText(text("URL")));
  if (source && source !== card.source) patch.source = source;
  if (Object.keys(patch).length > 0) await updateCard(ctx, card.id, patch, deps.enrichment);
  // The uploads stay for the hourly sweep: asbplayer updates every card on the same line with the
  // same files, one call each.
  if (deps.media) await keepMedia(ctx, card.id, mediaOf(fields), deps.media, "update");
  return null;
}

/** Adds tags, written as one space-separated string, to each of the learner's own notes. */
async function addTags(
  ctx: ServiceContext,
  params: Record<string, unknown>,
  deps: AnkiConnectDeps,
  budget: Budget,
) {
  requireWrite(ctx, deps);
  const ids = numbers(params.notes, budget);
  const sent = typeof params.tags === "string" ? params.tags.split(/\s+/) : [];
  const added = tagsOf({ tags: sent });
  for (const id of ids) {
    // A note that is gone or not the learner's is passed over, as AnkiConnect does.
    const card = await ownCardOf(ctx, id).catch((error: unknown) => {
      if (error instanceof Refusal) return null;
      throw error;
    });
    if (!card) continue;
    const held = new Set(card.tags.map(tagKey));
    const tags = [...card.tags, ...added.filter((tag) => !held.has(tagKey(tag)))];
    if (tags.length > card.tags.length && tags.length <= TAG_LIMITS.count) {
      await updateCard(ctx, card.id, { tags });
    }
  }
  return null;
}

/** Deletes uploads whose note never came. Run from the cron. */
export async function sweepAnkiConnectUploads(stash: ObjectStore, at: Date) {
  const before = at.getTime() - STASH_HOURS * 60 * 60 * 1000;
  let cursor: string | undefined;
  do {
    const page = await stash.list({
      prefix: STORED.ankiConnectUploads.prefix,
      ...(cursor ? { cursor } : {}),
    });
    const stale = page.objects.filter((o) => o.uploaded.getTime() < before).map((o) => o.key);
    if (stale.length > 0) await stash.delete(stale);
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}

const rowid = sql<number>`${schema.cards}.rowid`;
const DAY = 24 * 60 * 60 * 1000;

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

type Query = { deck?: string; field?: string; notes?: number[]; added?: number };

/**
 * The searches Yomitan writes to find a duplicate's note: `"deck:Name" "term:value"`, `nid:1,2`,
 * and alternatives joined as `(a) or (b)`, and asbplayer's `added:1` for the notes added in the
 * last day. Any other field name is read as the term.
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
      else if (name === "added") {
        const days = Number(value);
        if (Number.isInteger(days) && days > 0) parsed.added = days;
      } else if (name === "nid" || name === "cid") {
        parsed.notes = value.split(",").map(Number).filter(Number.isInteger);
      } else parsed.field = value;
    }
    return parsed;
  });
}

async function findNotes(ctx: ServiceContext, query: string, budget: Budget) {
  const queries = parseQuery(query);
  budget.search(queries.length);
  budget.take(
    queries.reduce((sum, q) => sum + (q.notes?.length ?? 0), 0),
    tooManyIds(),
  );
  const decks = await ownedDecks(ctx);
  const byName = new Map(decks.map((d) => [d.name, d]));
  const languages = [...new Set(decks.map((d) => d.language))];
  const found = new Set<number>();
  for (const q of queries) {
    if (
      q.deck === undefined &&
      q.field === undefined &&
      q.notes === undefined &&
      q.added === undefined
    ) {
      continue;
    }
    const where = [eq(schema.cards.userId, ctx.userId), isNull(schema.cards.archivedAt)];
    if (q.added !== undefined) {
      where.push(gte(schema.cards.createdAt, new Date(Date.now() - q.added * DAY)));
    }
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
      Reading: pronunciationText(row.card) ?? "",
      Meaning: row.card.meaning ?? "",
      Sentence: row.card.example ?? "",
      URL: row.card.source ?? "",
      // A client reads these to add to them, and Lymi's files never leave it under a client's name.
      Audio: "",
      "Sentence audio": "",
      Picture: "",
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
