import { INTERJECTIONS, SYLLABLE_MAX, SYLLABLES, TONE } from "./syllables";

/** A word of the reading: its syllables as written, or the word whole when it is not Jyutping, such as OK. */
export type ReadingToken = { word: string; syllables: string[] | null };

/** Where words part: spaces, apostrophes and hyphens. */
const BREAK = /[\s'’ʼ‘-]+/u;
/** Punctuation a word may carry that is no part of its sound. */
const EDGE = /^[\p{P}]+|[\p{P}]+$/gu;
/** Tone numbers some sources write raised, as in nei⁵ hou², in tone order. */
const RAISED = "¹²³⁴⁵⁶";

/**
 * A word written solid as syllables, or null. Each takes the longest syllable that lets the rest
 * split, with the tone digit after it when there is one, so nei5hou2 and neihou both part in two.
 */
function splitWord(word: string): string[] | null {
  const lower = word.toLowerCase();
  const failed = new Set<number>();
  const visit = (at: number): string[] | null => {
    if (at === lower.length) return [];
    if (failed.has(at)) return null;
    for (let end = Math.min(lower.length, at + SYLLABLE_MAX); end > at; end--) {
      if (!SYLLABLES.has(lower.slice(at, end))) continue;
      const stop = TONE.test(lower[end] ?? "") ? end + 1 : end;
      const rest = visit(stop);
      if (rest) return [word.slice(at, stop), ...rest];
    }
    failed.add(at);
    return null;
  };
  return visit(0);
}

/** A word's syllables: an interjection whole, else split by the syllable list. */
function syllablesOf(word: string): string[] | null {
  if (INTERJECTIONS.has(word.toLowerCase().replace(/[1-6]$/u, ""))) return [word];
  return /^[a-z1-6]+$/iu.test(word) ? splitWord(word) : null;
}

/** A reading cleaned for drawing and splitting: NFC, raised tone numbers as digits, single spaces. */
export function cleanJyutping(reading: string): string {
  return reading
    .normalize("NFC")
    .trim()
    .replace(/[¹²³⁴⁵⁶]/gu, (digit) => String(RAISED.indexOf(digit) + 1))
    .replace(/\s+/gu, " ");
}

/** A reading as its words, each split into syllables when it is Jyutping. */
export function readingTokens(reading: string): ReadingToken[] {
  const out: ReadingToken[] = [];
  for (const piece of cleanJyutping(reading).split(BREAK)) {
    const word = piece.replace(EDGE, "");
    if (word) out.push({ word, syllables: syllablesOf(word) });
  }
  return out;
}

/** The reading's syllables in order, or null unless every word of it is Jyutping. */
export function jyutpingSyllables(reading: string): string[] | null {
  const tokens = readingTokens(reading);
  if (tokens.length === 0 || tokens.some((token) => !token.syllables)) return null;
  return tokens.flatMap((token) => token.syllables ?? []);
}

/** Whether a syllable as written ends in its tone number. */
export const hasTone = (syllable: string) => TONE.test(syllable.slice(-1));
