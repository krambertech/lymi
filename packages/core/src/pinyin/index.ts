/**
 * The pinyin engine: one syllable over each Han character, in citation tones as dictionaries
 * write them. docs/proposals/chinese.md.
 */
import { alignPinyin, isHan, type PinyinSegment, pinyinTermSegments } from "./align";
import { cleanPinyin, pinyinSyllables, readingTokens } from "./split";
import { hasToneMark, toneMarks } from "./tones";

export type { PinyinSegment } from "./align";
export { alignPinyin, pinyinTermSegments } from "./align";
export { formatPinyin, PINYIN_BRACKET, parsePinyin, stripPinyin } from "./notation";
export { cleanPinyin, pinyinSyllables, readingTokens, type Syllable } from "./split";
export { hasToneMark, toneMarks } from "./tones";

/** Past this many characters a term is a passage, and any pinyin reading fits it. */
const KEY_ALIGN_MAX = 80;

/** The term's first form, where it lists forms as 行 · 行走. */
function firstForm(term: string): string | null {
  const at = term.indexOf(" · ");
  return at > 0 ? term.slice(0, at) : null;
}

/**
 * The term with its pinyin drawn, or null when the pronunciation is not pinyin or the term has no
 * Han character. A reading that does not fit the characters goes over the term whole; a term that
 * lists forms carries a one-form reading over its first.
 */
export function pinyinTermReading(term: string, pronunciation: string): PinyinSegment[] | null {
  const reading = cleanPinyin(pronunciation);
  if (!reading || ![...term].some(isHan)) return null;
  const tokens = readingTokens(reading);
  const aligned = alignPinyin(term, tokens);
  if (aligned) return aligned;
  const first = firstForm(term);
  const head = first ? alignPinyin(first, tokens) : null;
  if (first && head) return [...head, { text: term.slice(first.length) }];
  return pinyinSyllables(reading) ? pinyinTermSegments(term, reading) : null;
}

/**
 * The reading the duplicate rule compares: NFC, lower case, tone marks, without spaces or
 * apostrophes. Null unless it is pinyin that fits the term and carries a tone, so a toneless
 * reading, an IPA line or another word's pinyin never splits one word into two cards.
 */
export function pinyinKey(term: string, pronunciation: string): string | null {
  const reading = cleanPinyin(pronunciation);
  if (!hasToneMark(reading)) return null;
  const text = term.normalize("NFC").trim();
  const tokens = readingTokens(reading);
  const form = firstForm(text);
  const fits =
    alignPinyin(text, tokens) !== null ||
    (form !== null && alignPinyin(form, tokens) !== null) ||
    (Array.from(text).length > KEY_ALIGN_MAX && pinyinSyllables(reading) !== null);
  return fits ? reading.toLowerCase().replace(/[\s'’ʼ‘-]/gu, "") : null;
}

/**
 * The Known pairs a term gives: each Han character with its syllable, keyed under the engine so
 * they never meet a kana pair. A character keeps its reading across words, so a Known 银行 gives
 * 行 háng, which fades in 行长 but never 行 xíng in 不行.
 */
export function pinyinPairs(segments: readonly PinyinSegment[]): string[] {
  const out: string[] = [];
  for (const { text, reading } of segments) {
    const [char, er, ...rest] = [...text];
    if (reading === undefined || !char || !isHan(char) || rest.length > 0) continue;
    if (er === undefined) out.push(pinyinPair(char, reading));
    else if (/[儿兒]/u.test(er) && /r$/iu.test(reading)) {
      out.push(pinyinPair(char, reading.slice(0, -1)));
    }
  }
  return out;
}

/** One character and its syllable as a Known pair. */
export function pinyinPair(char: string, syllable: string): string {
  return `pinyin:${char.normalize("NFC")}[${toneMarks(syllable.normalize("NFC")).toLowerCase()}]`;
}
