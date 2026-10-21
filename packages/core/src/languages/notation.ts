import { PINYIN_BRACKET } from "../pinyin/notation";
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
  pinyin: {
    format:
      "Pinyin in square brackets right after each word of every example, one syllable for each character, in tone marks, and nothing after punctuation, letters or digits.",
    pattern: PINYIN_BRACKET,
    sample: "我[wǒ]去[qù]银行[yínháng]取钱[qǔqián]。",
  },
  // Stress marks stay in the sentence as written, with nothing in brackets.
  stress: null,
  // Each word's reading comes from its spelling at display, so examples are plain sentences.
  indic: null,
} as const satisfies Record<ReadingEngine, ExampleNotation | null>;
