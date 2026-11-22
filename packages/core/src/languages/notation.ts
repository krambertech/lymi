import { JYUTPING_BRACKET } from "../jyutping/notation";
import { PINYIN_BRACKET } from "../pinyin/notation";
import type { ReadingEngine } from "./types";

export interface ExampleNotation {
  format: string;
  pattern: RegExp;
  sample: string;
}

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
  jyutping: {
    format:
      "Jyutping with tone numbers in square brackets right after each word of every example, one syllable for each character, and nothing after punctuation, letters or digits.",
    pattern: JYUTPING_BRACKET,
    sample: "我[ngo5]去[heoi3]銀行[ngan4 hong4]攞錢[lo2 cin2]。",
  },
  stress: null,
  indic: null,
} as const satisfies Record<ReadingEngine, ExampleNotation | null>;
