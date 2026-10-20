import { missingReadings, stripReadings } from "@lymi/core";
import { hasToneMark, parsePinyin, readingTokens } from "@lymi/core/pinyin";
import type { LanguagePrompts } from "./types";

/** Particles dictionaries write in the neutral tone, the only syllables that may open a reading unmarked. */
const PARTICLES = new Set(["a", "ba", "de", "guo", "le", "ma", "me", "ne", "zhe"]);

/**
 * Whether pinyin carries tone marks rather than numbers, with a mark on every syllable but a
 * neutral one: an unmarked syllable follows another (dōngxi, bù kèqi) or is a particle (le).
 * Letters the term writes as letters, such as the OK of 卡拉OK, need none.
 */
export function tonedPinyin(reading: string): boolean {
  if (/\d/.test(reading)) return false;
  let first = true;
  for (const token of readingTokens(reading.normalize("NFC").trim())) {
    if (!token.syllables) {
      if (!/^[A-Z]+$/.test(token.word)) return false;
      continue;
    }
    for (const syllable of token.syllables) {
      const plain = syllable.text.toLowerCase();
      if (!hasToneMark(syllable.text) && first && !PARTICLES.has(plain)) return false;
      first = false;
    }
  }
  return !first;
}

/** Chinese: pinyin in tone marks and citation tones, inline in examples after each word. docs/proposals/chinese.md. */
export const chinese = {
  tag: "zh",
  enrich: {
    guide: { notes: "Noun: its usual measure word (*一本书*: 本 for books)." },
    example: `Chinese deck, no samples, meaningLanguage en. Card "行", meaning "to walk; OK", mayFill: example, notes, pronunciation.
{"meaning": null, "example": "今天[jīntiān]不行[bù xíng]。", "notes": null, "pronunciation": "xíng", "language": null}
Why: the meaning says 行 is read xíng here, not háng. Every example carries pinyin after each word, one you write as much as the learner's, with 不 in its citation tone. A card with addReadings gets its own example back that way, with nothing else changed.`,
  },
  lesson: "pinyin over, under or beside the hanzi, in tone marks or tone numbers (xuéxí, xue2xi2)",
  hook: "Most words join two or more characters whose own meanings build the word's: 电脑 is electric + brain, 火车 is fire + vehicle. Try that route first. A sound-alike follows the pinyin syllable by syllable. Never write hanzi or pinyin in the hook.",
  checks: [
    { field: "pronunciation", rule: "tone marks on every syllable", pass: tonedPinyin },
    {
      field: "example",
      rule: "tone marks on every syllable",
      pass: (text) =>
        parsePinyin(text).every(({ reading }) => reading === undefined || tonedPinyin(reading)),
    },
    { field: "example", rule: "pinyin over hanzi", pass: (text) => !missingReadings(text, "zh") },
    {
      field: "example",
      rule: "text unchanged under pinyin",
      pass: (text, card) => !card.example || stripReadings(text, "zh") === card.example,
    },
  ],
} as const satisfies LanguagePrompts;
