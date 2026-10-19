import { type FieldRole, fieldsFromRoles, fitFields, IMPORT_LIMITS, importTags } from "@lymi/core";
import type { SourceAdapter, SourceNoteType, SourceSummary } from "../adapter";
import { ImportFileError } from "../files";
import { decodePleco, looksLikePleco, type PlecoLine, parsePleco } from "./text";

/**
 * Pleco flashcards, from the text file Pleco's Export Cards writes. One deck, each category a
 * tag, and a card Pleco wrote under several categories arrives once with each of them. The text
 * holds no scores, so every card starts new. Tone numbers stay as written; `normalizeCardText`
 * marks them while writing. docs/proposals/chinese.md, Import.
 */

export const PLECO_DECK = "pleco";
/** Simplified and traditional, from a file exported with both character sets. */
export const PLECO_BOTH = "pleco:both";
/** One script, from a file exported with only simplified or only traditional characters. */
export const PLECO_ONE = "pleco:one";
const DECK_NAME = "Pleco flashcards";
/** Larger than a Worker holds as text; Pleco exports a few hundred bytes a card. */
export const MAX_PLECO_BYTES = 24 * 1024 * 1024;
/** Enough to tell a Pleco export from any other text. */
const SNIFF_BYTES = 64 * 1024;

const BOTH_FIELDS = ["Simplified", "Traditional", "Pinyin", "Definition"];
const BOTH_ROLES: FieldRole[] = ["term", "notes", "pronunciation", "meaning"];
const ONE_FIELDS = ["Characters", "Pinyin", "Definition"];
const ONE_ROLES: FieldRole[] = ["term", "pronunciation", "meaning"];

/** One card of the export, with every category Pleco listed it under. `n` tells apart cards with the same characters and pinyin. */
export type PlecoNote = {
  simplified: string;
  traditional: string;
  pinyin: string;
  definition: string;
  categories: string[];
  n: number;
};

/** FNV-1a, so a card's id is the same each time the same export is imported. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

/** A category path as a tag; a path past the tag limit keeps its end, where the category's own name is. */
function categoryTag(path: string): string {
  const chars = [...path];
  return chars.length <= IMPORT_LIMITS.tag
    ? path
    : `…${chars.slice(-(IMPORT_LIMITS.tag - 1)).join("")}`;
}

/**
 * The export's cards, each once: a repeat under another category adds that category. A line with
 * no characters stays its own note, which makes no card and counts as skipped.
 */
function notesOf(lines: PlecoLine[]): PlecoNote[] {
  const byText = new Map<string, PlecoNote>();
  const perId = new Map<string, number>();
  for (const [i, line] of lines.entries()) {
    const key = line.simplified
      ? [line.simplified, line.traditional, line.pinyin, line.definition].join("\u0000")
      : `\u0000${i}`;
    const found = byText.get(key);
    if (found) {
      if (line.category && !found.categories.includes(line.category)) {
        found.categories.push(line.category);
      }
      continue;
    }
    const id = [line.simplified, line.traditional, line.pinyin].join("\u0000");
    const n = perId.get(id) ?? 0;
    perId.set(id, n + 1);
    byText.set(key, {
      simplified: line.simplified,
      traditional: line.traditional,
      pinyin: line.pinyin,
      definition: line.definition,
      categories: line.category ? [line.category] : [],
      n,
    });
  }
  return [...byText.values()];
}

export const pleco: SourceAdapter<PlecoNote> = {
  source: "pleco",

  // Before Quizlet, which takes any .txt: a Pleco export is told by what it holds.
  async detect(file, fileName) {
    if (!/\.txt$/i.test(fileName) || file.size === 0) return false;
    const head = await file.read(0, Math.min(file.size, SNIFF_BYTES));
    return looksLikePleco(decodePleco(head, false));
  },

  async inspect(file) {
    if (file.size > MAX_PLECO_BYTES) {
      throw new ImportFileError("too_large", "The export is larger than one import takes");
    }
    let text: string;
    try {
      text = decodePleco(await file.read(0, file.size));
    } catch {
      throw new ImportFileError("unrecognized", "The export is not UTF-8 or UTF-16");
    }
    const { lines, categories } = parsePleco(text);
    const notes = notesOf(lines);
    const both = lines.some((line) => line.bracketed);
    const type: SourceNoteType = {
      key: both ? PLECO_BOTH : PLECO_ONE,
      name: "Pleco",
      kind: "basic",
      fields: both ? BOTH_FIELDS : ONE_FIELDS,
      roles: both ? BOTH_ROLES : ONE_ROLES,
      questions: [0],
      notes: notes.length,
      samples: notes
        .slice(0, 3)
        .map((note) =>
          both
            ? [note.simplified, note.traditional, note.pinyin, note.definition]
            : [note.simplified, note.pinyin, note.definition],
        ),
    };
    const summary: SourceSummary = {
      decks: [{ key: PLECO_DECK, name: DECK_NAME, description: null, cards: notes.length }],
      noteTypes: [type],
      notes: notes.length,
      reviews: 0,
      pictures: 0,
      audio: 0,
      unsupported: 0,
      // Pleco is a Chinese dictionary, so its cards are Chinese whatever the deck's name says.
      languages: { [PLECO_DECK]: "zh" },
      tags: categories.map(categoryTag),
    };
    return { summary, notes };
  },

  cards(note, summary, choices) {
    const type = summary.noteTypes[0];
    const both = type?.key === PLECO_BOTH;
    const roles = (type && choices.roles[type.key]) ?? (both ? BOTH_ROLES : ONE_ROLES);
    const values = both
      ? [note.simplified, note.traditional, note.pinyin, note.definition]
      : [note.simplified, note.pinyin, note.definition];
    // A word written alike in both scripts gets no notes line repeating its term.
    const term = roles.indexOf("term");
    if (both && (term === 0 || term === 1) && note.simplified === note.traditional) {
      values[1 - term] = "";
    }
    const raw = fieldsFromRoles(values, roles);
    const fitted = fitFields({ term: raw.term ?? "", ...raw });
    if (!fitted.fields.term) return [];
    const tags = importTags(note.categories.map(categoryTag));
    const id = hash([note.simplified, note.traditional, note.pinyin].join("\u0000"));
    return [
      {
        externalId: `pleco:${id}:${note.n}`,
        deckKey: PLECO_DECK,
        noteTypeKey: type?.key ?? PLECO_ONE,
        fields: fitted.fields,
        tags: tags.tags,
        modes: ["term_to_meaning"],
        archived: false,
        progress: [{ mode: "term_to_meaning", reviews: [], unstarted: true }],
        shortened: fitted.shortened || tags.shortened,
      },
    ];
  },

  async media() {
    return async () => null;
  },
};
