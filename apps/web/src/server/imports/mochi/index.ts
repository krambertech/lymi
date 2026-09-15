import {
  type FieldRole,
  fieldsFromRoles,
  fitFields,
  guessFieldRoles,
  type ImportedProgress,
  importTags,
  namedFieldRole,
  type ReviewModeKey,
} from "@lymi/core";
import type { SourceAdapter, SourceDeck, SourceNoteType, SourceSummary } from "../adapter";
import { ImportFileError, openZip, type RandomAccess, readZipEntry, type ZipEntry } from "../files";
import {
  attachments,
  furigana,
  isAudio,
  isImage,
  markdownToText,
  questionFields,
  splitSides,
} from "./text";
import { decodeTransit, type TransitValue } from "./transit";

/**
 * The largest `data.json` a Worker can parse beside its own work. A real 6 MB export of 1,600
 * Japanese cards peaked at about 23 MB while parsing, so 20 MB stays under 128 MB.
 */
export const MAX_DATA_BYTES = 20 * 1024 * 1024;

/** Keys holding generated speech, images and AI text, or links, none of which an import uses. */
const UNREAD = new Set(["component-cache", "references", "filters"]);

/** The kinds of card whose text is the content itself rather than a template's fields. */
export const TWO_SIDED = "content:two";
export const ONE_SIDED = "content:one";

/** One Mochi card, as the server stores it between steps. */
export type MochiNote = {
  id: string;
  deck: string;
  type: string;
  /** Markdown per field of the note type. */
  fields: string[];
  tags: string[];
  archived: boolean;
  /** Asked from the other side too, with its own log. */
  reverse: boolean;
  /** Grades as flat pairs of ms and rating, oldest first. */
  reviews: number[];
  due: number | null;
  reverseReviews: number[];
  reverseDue: number | null;
  picture?: string | undefined;
};

type TransitMap = { [key: string]: TransitValue };

const isMap = (value: TransitValue | undefined): value is TransitMap =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const list = (value: TransitValue | undefined): TransitValue[] =>
  Array.isArray(value) ? value : [];
const text = (value: TransitValue | undefined) => (typeof value === "string" ? value : "");
const flag = (value: TransitValue | undefined) => value === true || typeof value === "number";

async function openExport(file: RandomAccess) {
  const zip = await openZip(file);
  const data = [...zip.values()]
    .filter((entry) => /(^|\/)data\.json$/.test(entry.name))
    .sort((a, b) => a.name.length - b.name.length)[0];
  if (!data) throw new ImportFileError("unrecognized", "The file holds no Mochi data");
  return { zip, data };
}

async function readData(file: RandomAccess, entry: ZipEntry): Promise<TransitMap> {
  if (entry.size > MAX_DATA_BYTES) {
    throw new ImportFileError("too_large", "The export's data is too large");
  }
  let raw: unknown;
  try {
    raw = JSON.parse(new TextDecoder().decode(await readZipEntry(file, entry, MAX_DATA_BYTES)));
  } catch (err) {
    if (err instanceof ImportFileError) throw err;
    throw new ImportFileError("damaged", "The export's data is damaged");
  }
  const root = decodeTransit(raw, UNREAD);
  if (!isMap(root) || root.version !== 2) {
    throw new ImportFileError("unrecognized", "The export is not Mochi's version 2");
  }
  return root;
}

/** Attachment file name to zip entry, wherever in the zip the file sits. */
function mediaIndex(zip: Map<string, ZipEntry>) {
  const index = new Map<string, ZipEntry>();
  for (const entry of zip.values()) {
    if (entry.name.endsWith("/") || /(^|\/)data\.(json|edn)$/.test(entry.name)) continue;
    const name = entry.name.slice(entry.name.lastIndexOf("/") + 1);
    if (!index.has(name)) index.set(name, entry);
  }
  return index;
}

/** Mochi dates a review by its day, so grades on one day are spaced this far apart to keep each. */
const SAME_DAY_STEP_MS = 60_000;

/** A log as flat pairs, Remembered as Good and Forgot as Again, and the due date it left. */
function logOf(value: TransitValue | undefined) {
  const reviews: number[] = [];
  let due: number | null = null;
  let last = Number.NEGATIVE_INFINITY;
  const entries = list(value)
    .filter(isMap)
    .filter((review) => typeof review.date === "number")
    .sort((a, b) => (a.date as number) - (b.date as number));
  for (const review of entries) {
    last = Math.max(review.date as number, last + SAME_DAY_STEP_MS);
    reviews.push(last, review["remembered?"] === true ? 3 : 1);
    if (typeof review.due === "number") due = review.due;
  }
  return { reviews, due };
}

function progressOf(mode: ReviewModeKey, reviews: number[], due: number | null): ImportedProgress {
  const log = [];
  for (let i = 0; i + 1 < reviews.length; i += 2) {
    log.push({ at: new Date(reviews[i] as number), rating: reviews[i + 1] as 1 | 3 });
  }
  return {
    mode,
    reviews: log,
    unstarted: log.length === 0,
    due: log.length > 0 && due !== null ? new Date(due) : undefined,
  };
}

/** A small stable id for a card a hand-made export gave none. */
function contentId(deck: string, content: string) {
  let hash = 0x811c9dc5;
  for (const char of `${deck}\n${content}`) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return `${deck}-${hash.toString(36)}`;
}

/**
 * Roles for a template's fields. The field its first side shows is the term unless its name
 * says it is the meaning, and a field named as the meaning is never taken for the term.
 */
function guessRoles(names: string[], question: number | null): FieldRole[] {
  const named = names.map(namedFieldRole);
  const order = names.map((_, i) => i);
  const rank = (i: number) =>
    i === question && named[i] !== "meaning" ? 0 : named[i] === "meaning" ? 2 : 1;
  order.sort((a, b) => rank(a) - rank(b) || a - b);
  const guessed = guessFieldRoles(order.map((i) => names[i] as string));
  const roles: FieldRole[] = [];
  order.forEach((field, at) => {
    roles[field] = guessed[at] ?? "notes";
  });
  return roles;
}

type Template = { name: string; question: string | null; fields: { id: string; name: string }[] };

function readTemplates(root: TransitMap) {
  const templates = new Map<string, Template>();
  for (const template of list(root.templates).filter(isMap)) {
    const fields = Object.values(isMap(template.fields) ? template.fields : {})
      .filter(isMap)
      .filter((field) => text(field.id) && field.type !== "boolean")
      .sort((a, b) => (text(a.pos) < text(b.pos) ? -1 : text(a.pos) > text(b.pos) ? 1 : 0))
      .map((field) => ({ id: text(field.id), name: text(field.name) || text(field.id) }));
    templates.set(text(template.id), {
      name: text(template.name) || "Template",
      question: questionFields(text(template.content))[0] ?? null,
      fields,
    });
  }
  return templates;
}

type Deck = { name: string; parent: string | null; trashed: boolean; archived: boolean };

function readDecks(root: TransitMap) {
  const decks = new Map<string, Deck>();
  const cards: { card: TransitMap; deck: string }[] = [];
  for (const deck of list(root.decks).filter(isMap)) {
    const id = text(deck.id) || text(deck.name);
    decks.set(id, {
      name: text(deck.name) || "Mochi",
      parent: text(deck["parent-id"]) || null,
      trashed: flag(deck["trashed?"]),
      archived: deck["archived?"] === true,
    });
    for (const card of list(deck.cards).filter(isMap)) cards.push({ card, deck: id });
  }
  for (const card of list(root.cards).filter(isMap)) {
    cards.push({ card, deck: text(card["deck-id"]) });
  }
  /** A deck's path, and whether it or a parent is trashed or archived. */
  const walk = (id: string) => {
    const names: string[] = [];
    let trashed = false;
    let archived = false;
    const seen = new Set<string>();
    for (let at: string | null = id; at && !seen.has(at); ) {
      seen.add(at);
      const deck = decks.get(at);
      if (!deck) break;
      names.unshift(deck.name);
      trashed ||= deck.trashed;
      archived ||= deck.archived;
      at = deck.parent;
    }
    return { name: names.join("::") || "Mochi", trashed, archived };
  };
  return { cards, walk };
}

export const mochi: SourceAdapter<MochiNote> = {
  source: "mochi",

  async detect(file) {
    try {
      await openExport(file);
      return true;
    } catch {
      return false;
    }
  },

  async inspect(file) {
    const { zip, data } = await openExport(file);
    const root = await readData(file, data);
    const media = mediaIndex(zip);
    const templates = readTemplates(root);
    const { cards, walk } = readDecks(root);
    const paths = new Map<string, ReturnType<typeof walk>>();
    const pathOf = (deck: string) => {
      let path = paths.get(deck);
      if (!path) {
        path = walk(deck);
        paths.set(deck, path);
      }
      return path;
    };

    const live = cards.filter(({ card, deck }) => !flag(card["trashed?"]) && !pathOf(deck).trashed);
    const templateOf = (card: TransitMap) => {
      const template = templates.get(text(card["template-id"]));
      return template && isMap(card.fields) ? template : null;
    };
    const fieldValue = (card: TransitMap, id: string) => {
      const field = isMap(card.fields) ? card.fields[id] : undefined;
      return isMap(field) ? text(field.value) : "";
    };

    // A template field no card fills, such as one Mochi generates, is left out of the preview.
    const filled = new Map<string, Set<string>>();
    for (const { card } of live) {
      const template = templateOf(card);
      if (!template) continue;
      const key = text(card["template-id"]);
      const set = filled.get(key) ?? new Set<string>();
      for (const field of template.fields) {
        if (!set.has(field.id) && markdownToText(fieldValue(card, field.id))) set.add(field.id);
      }
      filled.set(key, set);
    }
    const fieldsOf = (key: string, template: Template) =>
      template.fields.filter((field) => filled.get(key)?.has(field.id));

    const noteTypes = new Map<string, SourceNoteType>();
    const typeFor = (card: TransitMap): { key: string; values: string[] } => {
      const template = templateOf(card);
      if (template) {
        const key = `template:${text(card["template-id"])}`;
        const fields = fieldsOf(text(card["template-id"]), template);
        if (!noteTypes.has(key)) {
          const names = fields.map((field) => field.name);
          const question = template.question ? names.indexOf(template.question) : -1;
          noteTypes.set(key, {
            key,
            name: template.name,
            kind: "basic",
            fields: names,
            roles: guessRoles(names, question >= 0 ? question : null),
            questions: [question >= 0 ? question : null],
            notes: 0,
            samples: [],
          });
        }
        return { key, values: fields.map((field) => fieldValue(card, field.id)) };
      }
      const sides = splitSides(text(card.content));
      const key = sides.length === 2 ? TWO_SIDED : ONE_SIDED;
      if (!noteTypes.has(key)) {
        noteTypes.set(key, {
          key,
          name: sides.length === 2 ? "Front and back" : "One side",
          kind: "basic",
          fields: sides.length === 2 ? ["Front", "Back"] : ["Text"],
          roles: sides.length === 2 ? ["term", "meaning"] : ["term"],
          questions: [0],
          notes: 0,
          samples: [],
        });
      }
      return { key, values: sides };
    };

    const summary: SourceSummary = {
      decks: [],
      noteTypes: [],
      notes: 0,
      reviews: 0,
      pictures: 0,
      audio: 0,
      unsupported: 0,
    };
    const deckCounts = new Map<string, number>();
    const notes: MochiNote[] = [];
    for (const { card, deck } of live) {
      const { key, values } = typeFor(card);
      const type = noteTypes.get(key) as SourceNoteType;
      const names = [text(card.content), ...values].flatMap(attachments);
      const picture = names.find((name) => isImage(name) && media.has(name));
      const reverse = card["review-reverse?"] === true;
      const log = logOf(card.reviews);
      const reverseLog = reverse ? logOf(card["reverse-reviews"]) : { reviews: [], due: null };

      type.notes++;
      if (type.samples.length < 3) type.samples.push(values.map(markdownToText));
      summary.notes++;
      summary.reviews += (log.reviews.length + reverseLog.reviews.length) / 2;
      if (picture) summary.pictures++;
      summary.audio += new Set(names.filter(isAudio)).size;
      deckCounts.set(deck, (deckCounts.get(deck) ?? 0) + 1);

      const content = text(card.content);
      notes.push({
        id: text(card.id) || contentId(deck, content || values.join("\n")),
        deck,
        type: key,
        fields: values,
        tags: [...list(card.tags), ...list(card["manual-tags"])].map(text).filter(Boolean),
        archived: card["archived?"] === true || pathOf(deck).archived,
        reverse,
        reviews: log.reviews,
        due: log.due,
        reverseReviews: reverseLog.reviews,
        reverseDue: reverseLog.due,
        picture,
      });
    }
    if (summary.notes === 0) {
      throw new ImportFileError("unrecognized", "The export holds no cards Lymi can import");
    }

    summary.noteTypes = [...noteTypes.values()].sort((a, b) => b.notes - a.notes);
    summary.decks = [...deckCounts]
      .map(
        ([key, count]): SourceDeck => ({
          key,
          name: pathOf(key).name,
          description: null,
          cards: count,
        }),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
    return { summary, notes };
  },

  cards(note, summary, choices) {
    const type = summary.noteTypes.find((t) => t.key === note.type);
    if (!type) return [];
    const roles = choices.roles[type.key] ?? type.roles;
    const raw = fieldsFromRoles(note.fields.map(markdownToText), roles);
    const reading = furigana(raw.term ?? "");
    const fitted = fitFields({
      term: reading?.base ?? raw.term ?? "",
      meaning: raw.meaning && (furigana(raw.meaning)?.base ?? raw.meaning),
      pronunciation: raw.pronunciation || reading?.reading,
      example: raw.example && (furigana(raw.example)?.base ?? raw.example),
      notes: raw.notes,
    });
    if (!fitted.fields.term) return [];
    const tags = importTags(note.tags);
    const question = type.questions[0] ?? null;
    const first: ReviewModeKey =
      question !== null && roles[question] === "meaning" ? "meaning_to_term" : "term_to_meaning";
    const other: ReviewModeKey =
      first === "term_to_meaning" ? "meaning_to_term" : "term_to_meaning";
    const progress = [progressOf(first, note.reviews, note.due)];
    if (note.reverse) progress.push(progressOf(other, note.reverseReviews, note.reverseDue));
    return [
      {
        externalId: `mochi:${note.id}`,
        deckKey: note.deck,
        noteTypeKey: type.key,
        fields: fitted.fields,
        tags: tags.tags,
        modes: progress.map((p) => p.mode),
        archived: note.archived,
        picture: note.picture,
        progress,
        shortened: fitted.shortened || tags.shortened,
      },
    ];
  },

  async media(file) {
    const { zip } = await openExport(file);
    const index = mediaIndex(zip);
    return async (name, limit) => {
      const entry = index.get(name);
      if (!entry) return null;
      try {
        return await readZipEntry(file, entry, limit);
      } catch (err) {
        if (err instanceof ImportFileError && err.failure === "too_large") return null;
        throw err;
      }
    };
  },
};
