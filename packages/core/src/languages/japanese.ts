import type { LanguageSupport } from "./types";

/** Japanese: kana readings drawn as furigana over kanji. docs/proposals/japanese.md. */
export const japanese = {
  tag: "ja",
  script: "Jpan",
  engine: "furigana",
  pronunciation: "reading",
  speech: "reading",
} as const satisfies LanguageSupport;
