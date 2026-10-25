import { missingReadings } from "@lymi/core";
import type { LanguagePrompts } from "./types";

/** Japanese: readings in hiragana, inline in examples as furigana. docs/proposals/japanese.md. */
export const japanese = {
  tag: "ja",
  enrich: {
    guide: {
      notes:
        "Never the reading, which is the pronunciation, and never romaji. Verb or adjective: its type alone on the first line (Godan verb, Ichidan verb, Irregular verb, I-adjective, Na-adjective), then Polite: *食べます*, and Transitive: *開ける* or Intransitive: *開く* when it has a pair. Noun: Counter: *一枚* when it takes a special one, and With する: *勉強する* for a suru noun. Usage: a particle trap (Wait for someone: 友達*を*待つ, not に), or for a word of two or more kanji, what each means (Characters: 果 fruit, 物 thing).",
    },
    example: `Japanese deck, no samples, meaningLanguage en. Card "食べる", example "毎朝パンを食べます。", addReadings, mayFill: meaning.
{"meaning": "to eat", "example": "毎朝[まいあさ]パンを食[た]べます。", "notes": null, "pronunciation": null, "language": null}
Why: addReadings asks for the same example with a reading after each run of kanji, and nothing else changed.`,
  },
  lesson: "furigana over or beside kanji, a kana gloss in brackets",
  hint: null,
  checks: [
    { field: "example", rule: "readings over kanji", pass: (text) => !missingReadings(text, "ja") },
  ],
} as const satisfies LanguagePrompts;
