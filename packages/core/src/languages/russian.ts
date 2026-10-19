import type { LanguageSupport } from "./types";

/**
 * Russian: the term as natives write it, and the pronunciation with its stress marked in place,
 * за́мок or замо́к. ё is always stressed, so a pronunciation may restore it where the term writes е.
 * docs/proposals/russian-and-ukrainian.md.
 */
export const russian = {
  tag: "ru",
  // Onest draws Cyrillic and U+0301.
  scripts: [],
  engine: "stress",
  stress: { vowels: "аеёиоуыэюя", restores: { ё: "е" } },
  pronunciation: "stress",
  format: {
    name: "Russian",
    pronunciation:
      "The term with U+0301 over the stressed vowel of each word of two or more syllables, and ё where the term writes е.",
    empty: "every word of the term has one syllable and no ё",
    never: "Not IPA.",
    sample: { term: "замок", pronunciation: "за́мок" },
    duplicates: "term-and-reading",
  },
  // The listening test (PR #864) heard Nikolay stress 37 of 40 marked words, and plain text can't tell за́мок from замо́к.
  speech: { saysReading: true, leadIn: false },
} as const satisfies LanguageSupport;
