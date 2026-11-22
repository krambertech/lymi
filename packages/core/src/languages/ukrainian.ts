import type { LanguageSupport } from "./types";

export const ukrainian = {
  tag: "uk",
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
  speech: { saysReading: true, leadIn: false, context: "Українською:" },
} as const satisfies LanguageSupport;
