import { missingReadings } from "@lymi/core";
import type { LanguagePrompts } from "./types";

/** Japanese: readings in hiragana, inline in examples as furigana. docs/proposals/japanese.md. */
export const japanese = {
  tag: "ja",
  enrich: {
    guide: {
      example:
        "Put the reading in hiragana in square brackets right after each run of kanji, and nothing over kana: 毎朝[まいあさ]パンを食[た]べます。",
      notes:
        "Verb or adjective: its type and polite form on one line (*ichidan verb · 食べます*, *i-adjective · 高いです*), and its transitive or intransitive pair if it has one (*開ける / 開く*).",
      pronunciation: "The reading in hiragana (たべる). Null if the term is written only in kana.",
    },
    example: `Japanese deck, no samples, meaningLanguage en. Card "食べる", example "毎朝パンを食べます。", addReadings, mayFill: meaning.
{"meaning": "to eat", "example": "毎朝[まいあさ]パンを食[た]べます。", "notes": null, "pronunciation": null, "language": null}
Why: addReadings asks for the same example with a reading after each run of kanji, and nothing else changed.`,
  },
  lesson: "furigana over or beside kanji, a kana gloss in brackets",
  hook: null,
  checks: [
    { field: "example", rule: "readings over kanji", pass: (text) => !missingReadings(text) },
  ],
} as const satisfies LanguagePrompts;
