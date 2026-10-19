import type { LanguageSupport } from "./types";

/** Japanese: kana readings drawn as furigana over kanji. docs/proposals/japanese.md. */
export const japanese = {
  tag: "ja",
  script: "Jpan",
  engine: "furigana",
  pronunciation: "reading",
  speech: { saysReading: true, leadIn: true },
} as const satisfies LanguageSupport;
