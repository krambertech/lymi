import type { LanguageSupport } from "./types";

/** Japanese: kana readings drawn as furigana over kanji. docs/proposals/japanese.md. */
export const japanese = {
  tag: "ja",
  scripts: ["Jpan"],
  engine: "furigana",
  pronunciation: "reading",
  format: {
    name: "Japanese",
    pronunciation:
      "The reading in hiragana, even for a term written only in kana, then the word's Tokyo pitch accent in square brackets: [0] when the voice stays up onto a particle after the word, otherwise the number of the mora the voice falls after. When a word has two accepted accents, write the most common.",
    empty: null,
    never: null,
    sample: { term: "食べる", pronunciation: "たべる [2]" },
    duplicates: "term-and-reading",
  },
  speech: { saysReading: true, leadIn: true },
} as const satisfies LanguageSupport;
