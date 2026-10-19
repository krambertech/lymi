/**
 * The Jyutping engine: one syllable over each Han character, with tone numbers 1 to 6 as learners
 * and dictionaries write them. docs/proposals/cantonese.md.
 */
import { isHan } from "../pinyin/align";
import { alignJyutping, type JyutpingSegment, jyutpingTermSegments } from "./align";
import { cleanJyutping, hasTone, jyutpingSyllables, readingTokens } from "./split";

export type { JyutpingSegment } from "./align";
export { alignJyutping, jyutpingTermSegments } from "./align";
export { formatJyutping, JYUTPING_BRACKET, parseJyutping, stripJyutping } from "./notation";
export { cleanJyutping, hasTone, jyutpingSyllables, readingTokens } from "./split";

/** Past this many characters a term is a passage, and any Jyutping reading fits it. */
const KEY_ALIGN_MAX = 80;

/** The term's first form, where it lists forms as 行 · 行路. */
function firstForm(term: string): string | null {
  const at = term.indexOf(" · ");
  return at > 0 ? term.slice(0, at) : null;
}

/** The term aligned with its reading, or its first form when it lists forms, keeping the rest plain. */
function aligned(term: string, reading: string): JyutpingSegment[] | null {
  const tokens = readingTokens(reading);
  const whole = alignJyutping(term, tokens);
  if (whole) return whole;
  const first = firstForm(term);
  const head = first ? alignJyutping(first, tokens) : null;
  return first && head ? [...head, { text: term.slice(first.length) }] : null;
}

/**
 * The term with its Jyutping drawn, or null when the pronunciation is not Jyutping or the term has
 * no Han character. A reading that does not fit the characters goes over the term whole; a term
 * that lists forms carries a one-form reading over its first.
 */
export function jyutpingTermReading(term: string, pronunciation: string): JyutpingSegment[] | null {
  const reading = cleanJyutping(pronunciation);
  if (!reading || ![...term].some(isHan)) return null;
  return (
    aligned(term, reading) ??
    (jyutpingSyllables(reading) ? jyutpingTermSegments(term, reading) : null)
  );
}

/**
 * The reading the duplicate rule compares: lower case, each syllable with its tone, without spaces
 * or punctuation, so 行 hong4 and 行 hang4 are two words. Changed tones are kept as written, since
 * a dictionary lists them as their own reading. Null unless it is Jyutping that fits the term with a
 * tone on every character, so a toneless reading, an IPA line or another word's reading never splits
 * one word into two cards.
 */
export function jyutpingKey(term: string, pronunciation: string): string | null {
  const reading = cleanJyutping(pronunciation);
  const text = term.normalize("NFC").trim();
  const segments = aligned(text, reading);
  if (segments) {
    const syllables = segments.flatMap(({ reading }) => (reading === undefined ? [] : [reading]));
    if (syllables.length === 0 || !syllables.every(hasTone)) return null;
    return syllables.join("").toLowerCase();
  }
  const passage = Array.from(text).length > KEY_ALIGN_MAX ? jyutpingSyllables(reading) : null;
  return passage?.every(hasTone) ? passage.join("").toLowerCase() : null;
}

/**
 * The Known pairs a term gives: each Han character with its syllable, keyed under the engine so
 * they never meet a pinyin or kana pair. A character keeps its reading across words, so a Known
 * 銀行 gives 行 hong4, which fades in 行業 but never 行 hang4 in 行路.
 */
export function jyutpingPairs(segments: readonly JyutpingSegment[]): string[] {
  return segments.flatMap(({ text, reading }) => {
    const chars = [...text];
    const char = chars[0];
    return reading !== undefined && char && chars.length === 1 && isHan(char) && hasTone(reading)
      ? [jyutpingPair(char, reading)]
      : [];
  });
}

/** One character and its syllable as a Known pair. */
export function jyutpingPair(char: string, syllable: string): string {
  return `jyutping:${char.normalize("NFC")}[${syllable.toLowerCase()}]`;
}

/**
 * A pronunciation as stored: raised tone numbers become digits (nei⁵ hou² → nei5 hou2), but only
 * when that gives toned Jyutping, so an IPA line with Chao tone numbers stays as written.
 */
export function jyutpingDigits(pronunciation: string): string {
  if (!/[¹²³⁴⁵⁶]/u.test(pronunciation)) return pronunciation;
  const clean = cleanJyutping(pronunciation);
  return jyutpingSyllables(clean)?.every(hasTone) ? clean : pronunciation;
}
