import { missingReadings, stripReadings } from "@lymi/core";
import {
  hasToneMark,
  type PinyinSegment,
  parsePinyin,
  pinyinExampleSegments,
  pinyinTermReading,
  readingTokens,
} from "@lymi/core/pinyin";
import type { LanguagePrompts } from "./types";

/** Characters dictionaries read in the neutral tone in common words: particles (了, 吗), suffixes (们, 子) and second syllables (东西, 朋友). */
const NEUTRAL = new Set([
  ..."了的吗呢吧啊着过得地么们子头个西友气欢生亮候服字识诉上思系息睛白情方楚烦发户腐宜算意和戚呼娘矩实道里边量",
]);

/**
 * Whether every syllable over a Han character carries a tone mark, unless the character reads in
 * the neutral tone: one dictionaries write unmarked (东西 dōngxi, 我们 wǒmen) or one repeating the
 * character before it (妈妈 māma). A reading over several characters at once needs every mark.
 */
function tonedSegments(segments: readonly PinyinSegment[]): boolean {
  let before = "";
  for (const { text, reading } of segments) {
    if (reading === undefined) {
      before = "";
      continue;
    }
    const tokens = readingTokens(reading);
    if (tokens.some((token) => !token.syllables && !/^[A-Z]+$/.test(token.word))) return false;
    const syllables = tokens.flatMap((token) => token.syllables ?? []);
    const [char = ""] = text;
    if ([...text.replace(/[儿兒]$/u, "")].length === 1 && syllables.length === 1) {
      if (!hasToneMark(reading) && !NEUTRAL.has(char) && char !== before) return false;
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
  return !!segments?.some((segment) => segment.reading !== undefined) && tonedSegments(segments);
}

/** Whether every bracket of an example's pinyin is in tone marks, by the same rule as a term's. */
export function tonedExample(text: string): boolean {
  if (parsePinyin(text).some(({ reading }) => reading !== undefined && numbered(reading))) {
    return false;
  }
  return tonedSegments(pinyinExampleSegments(text));
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
