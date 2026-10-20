import { missingReadings, stripReadings } from "@lymi/core";
import {
  alignPinyin,
  cleanPinyin,
  hasToneMark,
  type PinyinSegment,
  parsePinyin,
  pinyinTermReading,
  readingTokens,
} from "@lymi/core/pinyin";
import type { LanguagePrompts } from "./types";

/** Particles, which dictionaries write unmarked even as a word of their own. */
const PARTICLES = new Set([..."了的吗呢吧啊着过得地么"]);

/** Characters dictionaries read in the neutral tone after another in the same word: 东西 dōngxi, 我们 wǒmen, 晚上 wǎnshang. */
const NEUTRAL = new Set([
  ..."们子头个西友气欢生亮候服字识诉上思系息睛白情方楚烦发户腐宜算意和戚呼娘矩实道里边量",
]);

/**
 * Whether every syllable of one word's pinyin carries a tone mark, unless it is neutral: a
 * particle (了 le), or a character after another in the word that dictionaries write unmarked
 * (东西 dōngxi) or that repeats the one before it (妈妈 māma). A reading over several characters
 * at once needs every mark.
 */
function tonedWord(segments: readonly PinyinSegment[]): boolean {
  let before = "";
  for (const { text, reading } of segments) {
    if (reading === undefined) continue;
    const tokens = readingTokens(reading);
    if (tokens.some((token) => !token.syllables && !/^[A-Z]+$/.test(token.word))) return false;
    const syllables = tokens.flatMap((token) => token.syllables ?? []);
    const [char = ""] = text;
    if ([...text.replace(/[儿兒]$/u, "")].length === 1 && syllables.length === 1) {
      const neutral =
        PARTICLES.has(char) || (before !== "" && (NEUTRAL.has(char) || char === before));
      if (!hasToneMark(reading) && !neutral) return false;
    } else if (!syllables.length || !syllables.every((syllable) => hasToneMark(syllable.text))) {
      return false;
    }
    before = char;
  }
  return true;
}

const numbered = (reading: string) => /\d/.test(reading);

/** Whether a term's pinyin is in tone marks, never numbers, with a mark on every syllable that is not neutral. */
export function tonedPinyin(term: string, reading: string): boolean {
  const segments = numbered(reading) ? null : pinyinTermReading(term, reading);
  return !!segments?.some((segment) => segment.reading !== undefined) && tonedWord(segments);
}

/** Whether every bracket of an example's pinyin, each one word, is in tone marks by the same rule as a term's. */
export function tonedExample(text: string): boolean {
  return parsePinyin(text).every(({ text: word, reading }) => {
    if (reading === undefined) return true;
    if (numbered(reading)) return false;
    const clean = cleanPinyin(reading);
    return tonedWord(alignPinyin(word, readingTokens(clean)) ?? [{ text: word, reading: clean }]);
  });
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
    {
      field: "pronunciation",
      rule: "tone marks on every syllable",
      pass: (text, card) => tonedPinyin(card.term, text),
    },
    { field: "example", rule: "tone marks on every syllable", pass: tonedExample },
    { field: "example", rule: "pinyin over hanzi", pass: (text) => !missingReadings(text, "zh") },
    {
      field: "example",
      rule: "text unchanged under pinyin",
      pass: (text, card) => !card.example || stripReadings(text, "zh") === card.example,
    },
  ],
} as const satisfies LanguagePrompts;
