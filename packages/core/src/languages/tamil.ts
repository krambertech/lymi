import type { LanguageSupport } from "./types";

export const tamil = {
  tag: "ta",
  scripts: ["Taml"],
  engine: "indic",
  pronunciation: "reading",
  format: {
    name: "Tamil",
    pronunciation:
      "Only for a word not said as spelled, mostly a loanword, the reading in Latin letters: long vowels with a macron (ā ī ū ē ō), retroflex consonants with a dot below (ṭ ḍ ṇ ḷ), ழ as zh, ஷ as sh, and each stop voiced where it is said voiced. A word in grantha letters (ஜ ஷ ஸ ஹ) is said as spelled too.",
    empty: "the word is said as spelled, because Lymi reads the spelling itself",
    never: "Not IPA, and not the source word's own spelling: bēg for பேக், never bag.",
    sample: { term: "பஸ்", pronunciation: "bas" },
    duplicates: "term",
  },
  speech: { saysReading: false, leadIn: false },
} as const satisfies LanguageSupport;
