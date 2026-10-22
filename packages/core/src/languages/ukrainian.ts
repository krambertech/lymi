import type { LanguageSupport } from "./types";

/**
 * Ukrainian: the term as natives write it, and the pronunciation with its stress marked in place,
 * за́мок or замо́к. ї's dots are part of the letter, not a mark, so nothing is restored.
 * docs/proposals/russian-and-ukrainian.md.
 */
export const ukrainian = {
  tag: "uk",
  // Onest draws Cyrillic and U+0301.
  scripts: [],
  written: ["Cyrl"],
  engine: "stress",
  stress: { vowels: "аеєиіїоуюя", apostrophes: true },
  pronunciation: "stress",
  format: {
    name: "Ukrainian",
    pronunciation:
      "The term with U+0301 over the stressed vowel of each word of two or more syllables.",
    empty: "every word of the term has one syllable",
    never: "Not IPA.",
    sample: { term: "замок", pronunciation: "за́мок" },
    duplicates: "term-and-reading",
  },
  // The listening test (PR #864) heard this voice stress 8 of 8 marked words, and plain text can't tell за́мок from замо́к.
  speech: { saysReading: true, leadIn: false },
} as const satisfies LanguageSupport;
