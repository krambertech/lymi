import type { LanguageSupport } from "./types";

export const russian = {
  tag: "ru",
  scripts: [],
  written: ["Cyrl"],
  engine: "stress",
  stress: { vowels: "аеёиоуыэюя", restores: { ё: "е" } },
  pronunciation: "stress",
  format: {
    name: "Russian",
    pronunciation:
      "The term with U+0301 over the stressed vowel of each word of two or more syllables, and ё where the term writes е.",
    empty: "every word of the term has one syllable or is written with ё, and none writes е for ё",
    never: "Not IPA.",
    sample: { term: "замок", pronunciation: "за́мок" },
    duplicates: "term-and-reading",
  },
  speech: { saysReading: true, leadIn: false },
} as const satisfies LanguageSupport;
