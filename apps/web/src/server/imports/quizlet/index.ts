import {
  decodeTextImport,
  detectSeparators,
  fieldsFromRoles,
  fitFields,
  guessFieldRoles,
  MAX_TEXT_IMPORT_BYTES,
  MAX_TEXT_IMPORT_CARDS,
  parseDelimited,
} from "@lymi/core";
import type { SourceAdapter, SourceNoteType, SourceSummary } from "../adapter";
import { ImportFileError } from "../files";

/**
 * Quizlet sets, as text. Quizlet's "Copy text" export is the only way out of Quizlet: no
 * file, no API, no pictures or audio. The web app uploads the pasted text with the
 * separators the learner confirmed (`encodeTextImport`); a bare .txt is read with detected
 * ones. Parsing is the shared `parseDelimited`, so the import matches the preview. Text only,
 * so every card starts new. Nothing here talks to quizlet.com.
 */

export const QUIZLET_DECK = "set";
export const QUIZLET_NOTE_TYPE = "quizlet:card";
const FIELDS = ["Term", "Definition"];
const DEFAULT_DECK_NAME = "Quizlet import";

/** One row of the set. `n` tells apart rows with the same text, so each is its own card. */
export type QuizletNote = { term: string; definition: string; n: number };

/** FNV-1a, so a card's id is the same each time the same set is imported. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

export const quizlet: SourceAdapter<QuizletNote> = {
  source: "quizlet",

  // Last in the list, and only by extension: archives always reach their own adapters first.
  async detect(_file, fileName) {
    return /\.(txt|tsv|csv)$/i.test(fileName);
  },

  async inspect(file) {
    // The header line adds a little to the text's own limit.
    if (file.size > MAX_TEXT_IMPORT_BYTES + 4096) {
      throw new ImportFileError("too_large", "The text is larger than a pasted import takes");
    }
    let raw: string;
    try {
      raw = new TextDecoder("utf-8", { fatal: true }).decode(await file.read(0, file.size));
    } catch {
      throw new ImportFileError("unrecognized", "The text is not UTF-8");
    }
    const { meta, text } = decodeTextImport(raw);
    const separators = meta?.separators ?? detectSeparators(text);
    const parsed = parseDelimited(text, separators);
    if (parsed.cards.length > MAX_TEXT_IMPORT_CARDS) {
      throw new ImportFileError("too_large", "The set has more cards than one import takes");
    }
    const type: SourceNoteType = {
      key: QUIZLET_NOTE_TYPE,
      name: "Quizlet",
      kind: "basic",
      fields: FIELDS,
      roles: guessFieldRoles(FIELDS),
      questions: [0],
      notes: parsed.cards.length,
      samples: parsed.cards.slice(0, 3).map((card) => [card.term, card.definition]),
    };
    const summary: SourceSummary = {
      decks: [
        {
          key: QUIZLET_DECK,
          name: meta?.deckName.trim() || DEFAULT_DECK_NAME,
          description: null,
          cards: parsed.cards.length,
          targetDeckId: meta?.deckId ?? undefined,
        },
      ],
      noteTypes: [type],
      notes: parsed.cards.length,
      reviews: 0,
      pictures: 0,
      audio: 0,
      unsupported: 0,
    };
    const seen = new Map<string, number>();
    const notes = parsed.cards.map((card) => {
      const key = `${card.term}\u0000${card.definition}`;
      const n = seen.get(key) ?? 0;
      seen.set(key, n + 1);
      return { term: card.term, definition: card.definition, n };
    });
    return { summary, notes };
  },

  cards(note, summary, choices) {
    const type = summary.noteTypes[0];
    const roles = (type && choices.roles[type.key]) ?? guessFieldRoles(FIELDS);
    const raw = fieldsFromRoles([note.term, note.definition], roles);
    const fitted = fitFields({ term: raw.term ?? "", ...raw });
    if (!fitted.fields.term) return [];
    return [
      {
        externalId: `quizlet:${hash(`${note.term}\u0000${note.definition}`)}:${note.n}`,
        deckKey: QUIZLET_DECK,
        noteTypeKey: QUIZLET_NOTE_TYPE,
        fields: fitted.fields,
        tags: [],
        modes: ["term_to_meaning"],
        archived: false,
        progress: [{ mode: "term_to_meaning", reviews: [], unstarted: true }],
        shortened: fitted.shortened,
      },
    ];
  },

  async media() {
    return async () => null;
  },
};
