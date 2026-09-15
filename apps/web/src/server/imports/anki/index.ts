import {
  fieldsFromRoles,
  fitFields,
  guessFieldRoles,
  htmlToText,
  type ImportedCard,
  type ImportedProgress,
  imageSources,
  importTags,
  type Rating,
  type ReviewModeKey,
  soundCount,
} from "@lymi/core";
import type { SourceAdapter, SourceNoteType, SourceSummary } from "../adapter";
import {
  decodeProto,
  ImportFileError,
  isZstd,
  openZip,
  proto,
  type RandomAccess,
  readZipEntry,
  type ZipEntry,
  zipEntryStream,
  zstdDecompress,
  zstdDecompressBytes,
} from "../files";
import { SqliteFile, type SqlRow, type SqlValue } from "../sqlite";
import {
  clozeAnswer,
  clozeNumbers,
  furiganaBase,
  furiganaReading,
  hasFurigana,
  isImageOcclusion,
  questionField,
  revealCloze,
} from "./text";

/** The largest collection database a Worker can hold beside its own work. */
export const MAX_COLLECTION_BYTES = 80 * 1024 * 1024;

/** One Anki card of a note, as the server stores it between steps. */
export type AnkiCard = {
  ord: number;
  deck: string;
  suspended: boolean;
  /** Anki's card type: 0 new, 1 learning, 2 review, 3 relearning. */
  type: number;
  /** When Anki would next ask it, in ms. Null for a new card. */
  due: number | null;
  memory: { stability: number; difficulty: number; lastReview: number } | null;
  /** Grades as flat pairs of ms and ease, oldest first. */
  reviews: number[];
};

export type AnkiNote = {
  guid: string;
  type: string;
  fields: string[];
  tags: string[];
  cards: AnkiCard[];
};

const COLLECTIONS = ["collection.anki21b", "collection.anki21", "collection.anki2"];
const DAY_SECONDS = 86_400;
/** Anki joins note fields, and schema 18 joins deck path parts, with the unit separator. */
const SEPARATOR = String.fromCharCode(0x1f);

const text = (value: SqlValue | undefined) => (typeof value === "string" ? value : "");
const int = (value: SqlValue | undefined) => Number(value ?? 0);
const blob = (value: SqlValue | undefined) =>
  value instanceof Uint8Array ? value : new Uint8Array();

async function openPackage(file: RandomAccess) {
  const zip = await openZip(file);
  const entry = COLLECTIONS.map((name) => zip.get(name)).find(Boolean);
  if (!entry) throw new ImportFileError("unrecognized", "The file holds no Anki collection");
  return { zip, entry };
}

async function readCollection(file: RandomAccess, entry: ZipEntry): Promise<SqliteFile> {
  // A zstd collection's size is unknown until it is decompressed; a plain one's is in the zip.
  if (entry.name === "collection.anki21b") {
    return new SqliteFile(
      await zstdDecompress(() => zipEntryStream(file, entry), MAX_COLLECTION_BYTES),
    );
  }
  if (entry.size > MAX_COLLECTION_BYTES) {
    throw new ImportFileError("too_large", "The collection is too large");
  }
  return new SqliteFile(await readZipEntry(file, entry, MAX_COLLECTION_BYTES));
}

type Model = { name: string; cloze: boolean; fields: string[]; templates: string[] };
type Deck = { name: string; description: string | null };

/** Note types and decks, from JSON columns in schema 11 or from tables in schema 18. */
function readModels(db: SqliteFile) {
  const models = new Map<string, Model>();
  const decks = new Map<string, Deck>();
  if (db.hasTable("notetypes")) {
    const fields = new Map<string, string[]>();
    for (const row of db.rows("fields")) {
      const list = fields.get(String(row.ntid)) ?? [];
      list[int(row.ord)] = text(row.name);
      fields.set(String(row.ntid), list);
    }
    const templates = new Map<string, string[]>();
    for (const row of db.rows("templates")) {
      const list = templates.get(String(row.ntid)) ?? [];
      list[int(row.ord)] = proto.text(decodeProto(blob(row.config)), 1) ?? "";
      templates.set(String(row.ntid), list);
    }
    for (const row of db.rows("notetypes")) {
      const id = String(row.id);
      models.set(id, {
        name: text(row.name),
        cloze: proto.varint(decodeProto(blob(row.config)), 1) === 1,
        fields: fields.get(id) ?? [],
        templates: templates.get(id) ?? [],
      });
    }
    for (const row of db.rows("decks")) {
      const normal = proto.message(decodeProto(blob(row.kind)), 1);
      decks.set(String(row.id), {
        name: text(row.name).split(SEPARATOR).join("::"),
        description: normal ? (proto.text(normal, 4) ?? null) : null,
      });
    }
    return { models, decks };
  }

  const [col] = db.rows("col");
  const json = <T>(value: SqlValue | undefined): T => {
    try {
      return JSON.parse(text(value) || "{}") as T;
    } catch {
      throw new ImportFileError("damaged", "The collection's note types are damaged");
    }
  };
  type LegacyModel = {
    name: string;
    type: number;
    flds: { name: string; ord: number }[];
    tmpls: { ord: number; qfmt: string }[];
  };
  for (const [id, model] of Object.entries(json<Record<string, LegacyModel>>(col?.models))) {
    const fields: string[] = [];
    for (const field of model.flds) fields[field.ord] = field.name;
    const templates: string[] = [];
    for (const template of model.tmpls) templates[template.ord] = template.qfmt;
    models.set(id, { name: model.name, cloze: model.type === 1, fields, templates });
  }
  type LegacyDeck = { name: string; desc?: string };
  for (const [id, deck] of Object.entries(json<Record<string, LegacyDeck>>(col?.decks))) {
    decks.set(id, { name: deck.name, description: deck.desc || null });
  }
  return { models, decks };
}

/** A card's due date in ms from Anki's mix of day numbers and timestamps. */
function dueOf(row: SqlRow, crt: number): number | null {
  if (int(row.type) === 0) return null;
  // A card in a filtered deck keeps its home deck's due date in `odue`.
  const raw = int(row.odid) ? int(row.odue) : int(row.due);
  // Learning steps store a Unix time in seconds; review days count from the collection's start.
  return raw > 1_000_000_000 ? raw * 1000 : (crt + raw * DAY_SECONDS) * 1000;
}

function memoryOf(row: SqlRow, due: number | null, reviews: number[]) {
  const type = int(row.type);
  if (type !== 2 && type !== 3) return null;
  let data: { s?: number; d?: number; lrt?: number } = {};
  try {
    data = JSON.parse(text(row.data) || "{}");
  } catch {}
  const interval = Math.max(int(row.ivl), 1);
  const lastReview = data.lrt
    ? data.lrt * 1000
    : reviews.length >= 2
      ? (reviews[reviews.length - 2] as number)
      : (due ?? 0) - interval * DAY_SECONDS * 1000;
  // A collection scheduled without FSRS has no memory state; its interval is the closest stand-in.
  return { stability: data.s ?? interval, difficulty: data.d ?? 5, lastReview };
}

function progressOf(card: AnkiCard, mode: ReviewModeKey): ImportedProgress {
  const reviews = [];
  for (let i = 0; i + 1 < card.reviews.length; i += 2) {
    reviews.push({
      at: new Date(card.reviews[i] as number),
      rating: card.reviews[i + 1] as Rating,
    });
  }
  return {
    mode,
    reviews,
    unstarted: card.type === 0,
    due: card.due === null ? undefined : new Date(card.due),
    memory: card.memory
      ? {
          stability: card.memory.stability,
          difficulty: card.memory.difficulty,
          lastReview: new Date(card.memory.lastReview),
        }
      : undefined,
  };
}

function withoutReadings(value: string | undefined): string | undefined {
  return value && hasFurigana(value) ? furiganaBase(value) : value;
}

/** The mode a card template asks: from the meaning when its question shows the meaning field. */
function modeOfTemplate(type: SourceNoteType, roles: readonly string[], ord: number) {
  const field = type.questions[ord] ?? null;
  return field !== null && roles[field] === "meaning" ? "meaning_to_term" : "term_to_meaning";
}

/** Anki's cloze note type keeps the meaning in Back Extra, which a name alone reads as notes. */
function guessRoles(model: Model) {
  const roles = guessFieldRoles(model.fields);
  if (model.cloze && !roles.includes("meaning")) {
    const extra = model.fields.findIndex((name, i) => roles[i] === "notes" && /extra/i.test(name));
    if (extra >= 0) roles[extra] = "meaning";
  }
  return roles;
}

/** Media file name to zip entry name, from a JSON map or Anki's protobuf list. */
async function mediaIndex(file: RandomAccess, zip: Map<string, ZipEntry>) {
  const index = new Map<string, string>();
  const entry = zip.get("media");
  if (!entry) return index;
  let bytes = await readZipEntry(file, entry, 32 * 1024 * 1024);
  if (isZstd(bytes)) bytes = await zstdDecompressBytes(bytes, 64 * 1024 * 1024);
  if (bytes[0] === 0x7b) {
    try {
      for (const [zipName, name] of Object.entries(JSON.parse(new TextDecoder().decode(bytes)))) {
        if (typeof name === "string") index.set(name, zipName);
      }
    } catch {
      throw new ImportFileError("damaged", "The file's media list is damaged");
    }
    return index;
  }
  proto.all(decodeProto(bytes), 1).forEach((raw, position) => {
    const fields = decodeProto(raw);
    const name = proto.text(fields, 1);
    if (name) index.set(name, String(proto.varint(fields, 255) ?? position));
  });
  return index;
}

export const anki: SourceAdapter<AnkiNote> = {
  source: "anki",

  async detect(file) {
    try {
      await openPackage(file);
      return true;
    } catch {
      return false;
    }
  },

  async inspect(file) {
    const { zip, entry } = await openPackage(file);
    const db = await readCollection(file, entry);
    const media = await mediaIndex(file, zip);
    const { models, decks } = readModels(db);
    const crt = int([...db.rows("col")][0]?.crt);

    const reviewsByCard = new Map<string, [number, number][]>();
    for (const row of db.rows("revlog")) {
      const ease = int(row.ease);
      // Ease 0 and types past 3 are manual reschedules, not recalls.
      if (ease < 1 || ease > 4 || int(row.type) > 3) continue;
      const key = String(row.cid);
      const list = reviewsByCard.get(key) ?? [];
      list.push([int(row.id), ease]);
      reviewsByCard.set(key, list);
    }

    const cardsByNote = new Map<string, AnkiCard[]>();
    for (const row of db.rows("cards")) {
      const pairs = (reviewsByCard.get(String(row.id)) ?? []).sort((a, b) => a[0] - b[0]);
      const reviews = pairs.flat();
      const due = dueOf(row, crt);
      const list = cardsByNote.get(String(row.nid)) ?? [];
      list.push({
        ord: int(row.ord),
        deck: String(int(row.odid) || int(row.did)),
        suspended: int(row.queue) === -1,
        type: int(row.type),
        due,
        memory: memoryOf(row, due, reviews),
        reviews,
      });
      cardsByNote.set(String(row.nid), list);
    }
    reviewsByCard.clear();

    const noteTypes = new Map<string, SourceNoteType>();
    const deckCounts = new Map<string, number>();
    const summary: SourceSummary = {
      decks: [],
      noteTypes: [],
      notes: 0,
      reviews: 0,
      pictures: 0,
      audio: 0,
      unsupported: 0,
    };
    const notes: AnkiNote[] = [];
    for (const row of db.rows("notes")) {
      const typeKey = String(row.mid);
      const model = models.get(typeKey);
      const cards = (cardsByNote.get(String(row.id)) ?? []).sort((a, b) => a.ord - b.ord);
      if (!model || cards.length === 0 || model.templates.some(isImageOcclusion)) {
        summary.unsupported++;
        continue;
      }
      const fields = text(row.flds).split(SEPARATOR);
      let type = noteTypes.get(typeKey);
      if (!type) {
        type = {
          key: typeKey,
          name: model.name,
          kind: model.cloze ? "cloze" : "basic",
          fields: model.fields,
          roles: guessRoles(model),
          questions: model.templates.map((template) => questionField(template, model.fields)),
          notes: 0,
          samples: [],
        };
        noteTypes.set(typeKey, type);
      }
      type.notes++;
      if (type.samples.length < 3) type.samples.push(fields.map(htmlToText));
      summary.notes++;
      for (const card of cards) {
        summary.reviews += card.reviews.length / 2;
        deckCounts.set(card.deck, (deckCounts.get(card.deck) ?? 0) + 1);
      }
      if (fields.some((field) => imageSources(field).some((src) => media.has(src)))) {
        summary.pictures++;
      }
      summary.audio += fields.reduce((sum, field) => sum + soundCount(field), 0);
      notes.push({
        guid: text(row.guid),
        type: typeKey,
        fields,
        tags: text(row.tags).split(/\s+/).filter(Boolean),
        cards,
      });
    }
    if (summary.notes === 0) {
      throw new ImportFileError("unrecognized", "The collection holds no cards Lymi can import");
    }

    summary.noteTypes = [...noteTypes.values()];
    summary.decks = [...deckCounts]
      .map(([key, cards]) => {
        const deck = decks.get(key);
        return {
          key,
          name: deck?.name ?? "Default",
          description: deck?.description ? htmlToText(deck.description) || null : null,
          cards,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
    return { summary, notes };
  },

  cards(note, summary, choices) {
    const type = summary.noteTypes.find((t) => t.key === note.type);
    if (!type) return [];
    const roles = choices.roles[type.key] ?? type.roles;
    const values = note.fields.map(htmlToText);
    const tags = importTags(note.tags);
    const picture = note.fields.flatMap(imageSources)[0];
    const base = fieldsFromRoles(values, roles);

    const build = (
      externalId: string,
      cards: AnkiCard[],
      modes: ReviewModeKey[],
      raw: Partial<ReturnType<typeof fieldsFromRoles>>,
    ): ImportedCard[] => {
      const term = raw.term ?? "";
      const fitted = fitFields({
        term: withoutReadings(term) ?? "",
        meaning: withoutReadings(raw.meaning),
        pronunciation: raw.pronunciation || (hasFurigana(term) ? furiganaReading(term) : undefined),
        example: withoutReadings(raw.example),
        notes: raw.notes,
      });
      if (!fitted.fields.term) return [];
      // A suspended template leaves its mode out unless every template is suspended.
      const active = cards.filter((card) => !card.suspended);
      const progress = new Map<ReviewModeKey, ImportedProgress>();
      for (const card of active.length > 0 ? active : cards) {
        const mode = modes[cards.indexOf(card)] as ReviewModeKey;
        if (!progress.has(mode)) progress.set(mode, progressOf(card, mode));
      }
      return [
        {
          externalId,
          deckKey: (cards[0] as AnkiCard).deck,
          fields: fitted.fields,
          tags: tags.tags,
          modes: [...progress.keys()],
          archived: active.length === 0,
          picture,
          progress: [...progress.values()],
          shortened: fitted.shortened || tags.shortened,
        },
      ];
    };

    if (type.kind === "cloze") {
      const termField = roles.indexOf("term");
      const source = termField >= 0 ? (note.fields[termField] ?? "") : "";
      const numbers = new Set(clozeNumbers(source));
      return note.cards.flatMap((card) => {
        const number = card.ord + 1;
        if (!numbers.has(number)) return [];
        const { answers, hint } = clozeAnswer(source, number);
        const notes = [hint ? htmlToText(hint) : "", base.notes ?? ""].filter(Boolean);
        const raw = {
          ...base,
          term: answers.map(htmlToText).join(" … "),
          example: htmlToText(revealCloze(source)),
          notes: notes.length > 0 ? notes.join("\n\n") : undefined,
        };
        // A cloze asks for the word; without a meaning to cue it, the term is shown instead.
        const mode: ReviewModeKey = raw.meaning ? "meaning_to_term" : "term_to_meaning";
        return build(`anki:${note.guid}:c${number}`, [card], [mode], raw);
      });
    }

    const modes = note.cards.map((card) => modeOfTemplate(type, roles, card.ord));
    return build(`anki:${note.guid}`, note.cards, modes, base);
  },

  async media(file) {
    const { zip } = await openPackage(file);
    const index = await mediaIndex(file, zip);
    return async (name, limit) => {
      const entryName = index.get(name);
      const entry = entryName === undefined ? undefined : zip.get(entryName);
      if (!entry) return null;
      try {
        const bytes = await readZipEntry(file, entry, limit);
        return isZstd(bytes) ? await zstdDecompressBytes(bytes, limit) : bytes;
      } catch (err) {
        if (err instanceof ImportFileError && err.failure === "too_large") return null;
        throw err;
      }
    };
  },
};
