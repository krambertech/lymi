import {
  fieldsFromRoles,
  fitFields,
  htmlToText,
  type ImportedCard,
  type ImportedProgress,
  imageSources,
  type ReviewModeKey,
} from "@lymi/core";
import type { SourceAdapter, SourceNoteType, SourceSummary } from "../adapter";
import { clozeAnswer, clozeNumbers, revealCloze } from "../anki/text";
import {
  ImportFileError,
  openZip,
  type RandomAccess,
  readZipEntry,
  type ZipEntry,
  zipEntrySource,
  zipEntryStream,
  zstdDecompress,
} from "../files";
import { isAudio, isImage } from "../mochi/text";

/**
 * Noji publishes no specification for `.ofc`; the shape here follows the open-source Noji-to-Anki
 * converter, and docs/proposals/importing-from-other-apps.md records what is still unconfirmed.
 */

/** The largest deck data a Worker parses beside its own work, as for Mochi's `data.json`. */
export const MAX_DATA_BYTES = 20 * 1024 * 1024;

/** The largest compressed `attachments.zip` held in memory; a stored one is read in place at any size. */
export const MAX_ATTACHMENTS_BYTES = 48 * 1024 * 1024;

export const FRONT_AND_BACK = "content:two";
export const CLOZE = "noji:cloze";

const DAY_MS = 86_400_000;
const MINUTE_MS = 60_000;

/** A card's schedule as Noji left it, with no history behind it. */
type Schedule = { due: number; stability: number; lastReview: number };

/** One Noji note, as the server stores it between steps. */
export type NojiNote = {
  id: string;
  deck: string;
  type: typeof FRONT_AND_BACK | typeof CLOZE;
  /** Front and back as Noji's HTML. */
  fields: [string, string];
  /** Frozen in Noji, so it arrives archived. */
  frozen: boolean;
  /** One schedule per progress entry, in Noji's order; null for a card Noji treats as new. */
  schedules: (Schedule | null)[];
  picture?: string | undefined;
};

type Json = { [key: string]: unknown };

const isMap = (value: unknown): value is Json =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const text = (value: unknown) => (typeof value === "string" ? value : "");
const num = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);
const idOf = (value: unknown) =>
  typeof value === "number" || typeof value === "string" ? String(value) : "";
const basename = (path: string) => path.slice(path.lastIndexOf("/") + 1);
const isMacJunk = (name: string) => name.startsWith("__MACOSX/") || basename(name).startsWith("._");

async function openExport(file: RandomAccess) {
  const zip = await openZip(file);
  const find = (name: string) =>
    [...zip.values()].find((entry) => !isMacJunk(entry.name) && basename(entry.name) === name);
  const data = find("deck_export_data") ?? find("deck_data.json");
  if (!data) throw new ImportFileError("unrecognized", "The file holds no Noji deck data");
  return { data, attachments: find("attachments.zip") };
}

async function readData(file: RandomAccess, entry: ZipEntry): Promise<Json[]> {
  const bytes =
    basename(entry.name) === "deck_export_data"
      ? await zstdDecompress(() => zipEntryStream(file, entry), MAX_DATA_BYTES)
      : await readZipEntry(file, entry, MAX_DATA_BYTES);
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ImportFileError("damaged", "The export's deck data is damaged");
  }
  if (!Array.isArray(raw)) throw new ImportFileError("unrecognized", "The deck data is not Noji's");
  return raw.filter(isMap);
}

/** Picture file name to its entry in `attachments.zip`, with the reader that holds it. */
async function attachmentIndex(file: RandomAccess, entry: ZipEntry | undefined) {
  const index = new Map<string, ZipEntry>();
  if (!entry) return { index, source: null };
  const source = await zipEntrySource(file, entry, MAX_ATTACHMENTS_BYTES);
  if (!source) return { index, source: null };
  for (const inner of (await openZip(source)).values()) {
    if (inner.name.endsWith("/") || isMacJunk(inner.name) || inner.size === 0) continue;
    const name = basename(inner.name);
    if (!index.has(name)) index.set(name, inner);
  }
  return { index, source };
}

/**
 * Noji's progress for one card. Intervals are minutes and a forgotten card keeps its interval
 * while it relearns, so a graduated or relearning card has a schedule and a learning one starts new.
 */
function scheduleOf(progress: unknown): Schedule | null {
  if (!isMap(progress)) return null;
  const state = text(progress.learning_state);
  const due = Date.parse(text(progress.next_review_at));
  const interval = num(progress.interval);
  if (!state || state === "new" || !Number.isFinite(due) || interval <= 0) return null;
  const relearning = progress.learning_steps_index == null && progress.ease_factor != null;
  if (state !== "graduated" && !relearning) return null;
  return {
    due,
    stability: Math.max(interval / (DAY_MS / MINUTE_MS), 1),
    lastReview: due - interval * MINUTE_MS,
  };
}

function progressOf(mode: ReviewModeKey, schedule: Schedule | null | undefined): ImportedProgress {
  if (!schedule) return { mode, reviews: [], unstarted: true };
  return {
    mode,
    reviews: [],
    due: new Date(schedule.due),
    // Noji's ease has no FSRS meaning, so difficulty starts in the middle as for Anki without FSRS.
    memory: {
      stability: schedule.stability,
      difficulty: 5,
      lastReview: new Date(schedule.lastReview),
    },
  };
}

/** A small stable id for a note the export gave none. */
function contentId(deck: string, content: string) {
  let hash = 0x811c9dc5;
  for (const char of `${deck}\n${content}`) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${deck}-${hash.toString(36)}`;
}

/** Each deck's path by key, parents first, from the ids in its `ancestry`. */
function deckPaths(decks: Json[]) {
  const names = new Map(decks.map((deck) => [idOf(deck.id), text(deck.name).trim() || "Noji"]));
  const paths = new Map<string, string>();
  for (const deck of decks) {
    const id = idOf(deck.id);
    const parents = text(deck.ancestry)
      .split("/")
      .filter((part) => part && part !== id && names.has(part))
      .map((part) => names.get(part) as string);
    paths.set(id, [...parents, names.get(id) ?? "Noji"].join("::"));
  }
  return paths;
}

const NOTE_TYPES: Record<NojiNote["type"], () => SourceNoteType> = {
  [FRONT_AND_BACK]: () => ({
    key: FRONT_AND_BACK,
    name: "Front and back",
    kind: "basic",
    fields: ["Front", "Back"],
    roles: ["term", "meaning"],
    questions: [0],
    notes: 0,
    samples: [],
  }),
  [CLOZE]: () => ({
    key: CLOZE,
    name: "Cloze",
    kind: "cloze",
    fields: ["Text", "Back"],
    roles: ["term", "meaning"],
    questions: [0],
    notes: 0,
    samples: [],
  }),
};

export const noji: SourceAdapter<NojiNote> = {
  source: "noji",

  async detect(file) {
    try {
      await openExport(file);
      return true;
    } catch {
      return false;
    }
  },

  async inspect(file) {
    const { data, attachments } = await openExport(file);
    // Pictures are indexed first, so a compressed attachments.zip is let go before the JSON is parsed.
    const pictures = new Set((await attachmentIndex(file, attachments)).index.keys());
    const decks = await readData(file, data);
    const paths = deckPaths(decks);

    const summary: SourceSummary = {
      decks: [],
      noteTypes: [],
      notes: 0,
      reviews: 0,
      pictures: 0,
      audio: 0,
      unsupported: 0,
    };
    const noteTypes = new Map<string, SourceNoteType>();
    const deckCounts = new Map<string, number>();
    const notes: NojiNote[] = [];

    for (const deck of decks) {
      const deckKey = idOf(deck.id) || "noji";
      for (const note of list(deck.notes).filter(isMap)) {
        const fields = isMap(note.fields) ? note.fields : {};
        const front = text(fields.front_side);
        const back = text(fields.back_side);
        const files = list(note.note_attachments)
          .filter(isMap)
          .map((attachment) => {
            const media = isMap(attachment.attachment) ? attachment.attachment.media_file : null;
            return {
              side: text(attachment.field_name),
              name: basename(text(isMap(media) ? media.url : "")),
            };
          })
          .filter((attachment) => attachment.name)
          .sort((a, b) => Number(a.side !== "front_side") - Number(b.side !== "front_side"));
        summary.audio += files.filter((f) => isAudio(f.name)).length;

        // A note with no text on either side is image occlusion or a picture alone, which Lymi can't ask.
        if (!htmlToText(front) && !htmlToText(back)) {
          summary.unsupported++;
          continue;
        }
        const type = clozeNumbers(front).length > 0 ? CLOZE : FRONT_AND_BACK;
        let noteType = noteTypes.get(type);
        if (!noteType) {
          noteType = NOTE_TYPES[type]();
          noteTypes.set(type, noteType);
        }
        noteType.notes++;
        if (noteType.samples.length < 3) noteType.samples.push([front, back].map(htmlToText));

        const picture = [...files.map((f) => f.name), ...imageSources(front), ...imageSources(back)]
          .map(basename)
          .find((name) => isImage(name) && pictures.has(name));
        if (picture) summary.pictures++;

        const schedules = list(note.progresses).map(scheduleOf);
        const frozen = list(note.progresses).some((p) => isMap(p) && p.frozen === true);
        const cards = type === CLOZE ? clozeNumbers(front).length : 1;
        deckCounts.set(deckKey, (deckCounts.get(deckKey) ?? 0) + cards);
        summary.notes++;
        notes.push({
          id: idOf(note.id) || contentId(deckKey, `${front}\n${back}`),
          deck: deckKey,
          type,
          fields: [front, back],
          frozen,
          schedules,
          picture,
        });
      }
    }
    if (summary.notes === 0) {
      throw new ImportFileError("unrecognized", "The export holds no cards Lymi can import");
    }

    summary.noteTypes = [...noteTypes.values()].sort((a, b) => b.notes - a.notes);
    summary.decks = [...deckCounts]
      .map(([key, cards]) => ({
        key,
        name: paths.get(key) ?? "Noji",
        description: null,
        cards,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return { summary, notes };
  },

  cards(note, summary, choices) {
    const type = summary.noteTypes.find((t) => t.key === note.type);
    if (!type) return [];
    const roles = choices.roles[type.key] ?? type.roles;
    const base = fieldsFromRoles(note.fields.map(htmlToText), roles);

    const build = (
      externalId: string,
      raw: Partial<ReturnType<typeof fieldsFromRoles>>,
      progress: ImportedProgress,
    ): ImportedCard[] => {
      const fitted = fitFields({
        term: raw.term ?? "",
        meaning: raw.meaning,
        pronunciation: raw.pronunciation,
        example: raw.example,
        notes: raw.notes,
      });
      if (!fitted.fields.term) return [];
      return [
        {
          externalId,
          deckKey: note.deck,
          noteTypeKey: type.key,
          fields: fitted.fields,
          tags: [],
          modes: [progress.mode],
          archived: note.frozen,
          picture: note.picture,
          progress: [progress],
          shortened: fitted.shortened,
        },
      ];
    };

    if (type.kind === "cloze") {
      const termField = roles.indexOf("term");
      const source = termField >= 0 ? (note.fields[termField] ?? "") : "";
      return clozeNumbers(source).flatMap((number, i) => {
        const { answers, hint } = clozeAnswer(source, number);
        const notes = [hint ? htmlToText(hint) : "", base.notes ?? ""].filter(Boolean);
        const raw = {
          ...base,
          term: answers.map(htmlToText).join(" … "),
          example: htmlToText(revealCloze(source)),
          notes: notes.length > 0 ? notes.join("\n\n") : undefined,
        };
        const mode: ReviewModeKey = raw.meaning ? "meaning_to_term" : "term_to_meaning";
        return build(`noji:${note.id}:c${number}`, raw, progressOf(mode, note.schedules[i]));
      });
    }

    const question = type.questions[0] ?? null;
    const mode: ReviewModeKey =
      question !== null && roles[question] === "meaning" ? "meaning_to_term" : "term_to_meaning";
    return build(`noji:${note.id}`, base, progressOf(mode, note.schedules[0]));
  },

  async media(file) {
    const { attachments } = await openExport(file);
    const { index, source } = await attachmentIndex(file, attachments);
    return async (name, limit) => {
      const entry = index.get(name);
      if (!entry || !source) return null;
      try {
        return await readZipEntry(source, entry, limit);
      } catch (err) {
        if (err instanceof ImportFileError && err.failure === "too_large") return null;
        throw err;
      }
    };
  },
};
