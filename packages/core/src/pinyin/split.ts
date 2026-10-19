import { INTERJECTIONS, SYLLABLE_MAX, SYLLABLES } from "./syllables";
import { toneMarks, untoned } from "./tones";

/** One syllable as written, with whether it ends in an erhua r that a following 儿 shares. */
export type Syllable = { text: string; erhua: boolean };

/** A word of the reading: its syllables, or the word whole when it is not pinyin, such as OK. */
export type ReadingToken = { word: string; syllables: Syllable[] | null };

/** Where words part: spaces, apostrophes and hyphens. */
const BREAK = /[\s'’ʼ‘-]+/u;
/** Punctuation a word may carry that is no part of its sound. */
const EDGE = /^[\p{P}]+|[\p{P}]+$/gu;

/**
 * A word written solid as syllables, or null. Each takes the longest syllable that lets the rest
 * split, holds at most one tone mark, and, past the first, starts with a, o or e only where
 * `loose` allows it, since pinyin writes an apostrophe there: xian is one syllable, xi'an two.
 */
function splitWord(word: string, loose: boolean): Syllable[] | null {
  const chars = [...word];
  const letters = chars.map((char) => untoned(char));
  const plain = letters.map((letter) => letter.plain.toLowerCase());
  const failed = new Set<number>();
  const visit = (at: number): Syllable[] | null => {
    if (at === chars.length) return [];
    if (failed.has(at)) return null;
    for (let end = Math.min(chars.length, at + SYLLABLE_MAX); end > at; end--) {
      const base = plain.slice(at, end).join("");
      const tones = letters.slice(at, end).filter((letter) => letter.toned).length;
      if (tones > 1) continue;
      if (at > 0 && !loose && /^[aoe]/.test(base)) continue;
      const own = SYLLABLES.has(base);
      const erhua =
        !own && base.length > 1 && base.endsWith("r") && SYLLABLES.has(base.slice(0, -1));
      if (!own && !erhua) continue;
      const rest = visit(end);
      if (rest) return [{ text: chars.slice(at, end).join(""), erhua }, ...rest];
    }
    failed.add(at);
    return null;
  };
  return visit(0);
}

/** A word's syllables: an interjection whole, else split strictly, else with a missing apostrophe allowed. */
function syllablesOf(word: string): Syllable[] | null {
  const lower = [...word].map((char) => untoned(char).plain.toLowerCase()).join("");
  if (INTERJECTIONS.has(lower)) return [{ text: word, erhua: false }];
  return splitWord(word, false) ?? splitWord(word, true);
}

/** A reading cleaned for drawing and splitting: NFC, tone numbers as marks, single spaces. */
export function cleanPinyin(reading: string): string {
  return toneMarks(reading.normalize("NFC").trim()).replace(/\s+/gu, " ");
}

/**
 * A reading as its words, each split into syllables when it is pinyin. An erhua r written apart,
 * as in yī diǎn r, joins the syllable before it.
 */
export function readingTokens(reading: string): ReadingToken[] {
  const out: ReadingToken[] = [];
  for (const piece of cleanPinyin(reading).split(BREAK)) {
    const word = piece.replace(EDGE, "");
    if (!word) continue;
    const last = out.at(-1)?.syllables?.at(-1);
    if (word.toLowerCase() === "r" && last && !last.erhua) {
      last.text += word;
      last.erhua = true;
      continue;
    }
    out.push({ word, syllables: syllablesOf(word) });
  }
  return out;
}

/** The reading's syllables in order, or null unless every word of it is pinyin. */
export function pinyinSyllables(reading: string): Syllable[] | null {
  const tokens = readingTokens(reading);
  if (tokens.length === 0 || tokens.some((token) => !token.syllables)) return null;
  return tokens.flatMap((token) => token.syllables ?? []);
}
