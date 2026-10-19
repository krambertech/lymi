import type { LanguageSupport } from "./types";

/** Japanese: kana readings drawn as furigana over kanji. docs/proposals/japanese.md. */
export const japanese = {
  tag: "ja",
  script: "Jpan",
  engine: "furigana",
  pronunciation: "reading",
  format: {
    name: "Japanese",
    pronunciation: "The reading in hiragana. Null when the term is written only in kana.",
    sample: { term: "食べる", pronunciation: "たべる" },
    duplicates: "term-and-reading",
  },
  speech: { saysReading: true, leadIn: true },
} as const satisfies LanguageSupport;
