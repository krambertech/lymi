import type { ReadingEngine } from "./types";

/** How an example carries its readings inline: the words that say so, a match for one reading, and a sentence. */
export interface ExampleNotation {
  format: string;
  /** One inline reading, with the reading in group 1. */
  pattern: RegExp;
  sample: string;
}

/** Each reading style's inline notation, or null while its examples stay plain sentences. */
export const EXAMPLE_NOTATION = {
  furigana: {
    format:
      "The reading in hiragana in square brackets right after each run of kanji, and nothing over kana.",
    pattern: /\[([\p{Script=Hiragana}\p{Script=Katakana}ー]{1,30})\]/gu,
    sample: "毎朝[まいあさ]パンを食[た]べます。",
  },
  // Null until Chinese slice 4 draws `PINYIN_BRACKET` and strips it for older phones; filling it publishes the notation.
  pinyin: null,
} as const satisfies Record<ReadingEngine, ExampleNotation | null>;
