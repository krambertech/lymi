import { alignPinyin, isHan, type PinyinSegment, pinyinTermSegments } from "./align";
import { cleanPinyin, pinyinSyllables, readingTokens } from "./split";
import { hasToneMark, toneMarks, untoned } from "./tones";

export type { PinyinSegment } from "./align";
export { alignPinyin, pinyinTermSegments } from "./align";
export {
  formatPinyin,
  PINYIN_BRACKET,
  parsePinyin,
  pinyinExampleSegments,
  stripPinyin,
} from "./notation";
export { cleanPinyin, pinyinSyllables, readingTokens, type Syllable } from "./split";
export { hasToneMark, toneMarks } from "./tones";

const KEY_ALIGN_MAX = 80;

function firstForm(term: string): string | null {
  const at = term.indexOf(" · ");
  return at > 0 ? term.slice(0, at) : null;
}

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

const SANDHI = /^[一不]$/u;

const toneless = (text: string) => [...text].map((char) => untoned(char).plain).join("");

export function pinyinKey(term: string, pronunciation: string): string | null {
  const reading = cleanPinyin(pronunciation);
  if (!hasToneMark(reading)) return null;
  const text = term.normalize("NFC").trim();
  const tokens = readingTokens(reading);
  const form = firstForm(text);
  const aligned = alignPinyin(text, tokens) ?? (form === null ? null : alignPinyin(form, tokens));
  const passage = Array.from(text).length > KEY_ALIGN_MAX && pinyinSyllables(reading) !== null;
  if (!aligned && !passage) return null;
  const spoken = aligned
    ? aligned
        .map(({ text, reading }) =>
          reading === undefined ? "" : SANDHI.test(text) ? toneless(reading) : reading,
        )
        .join("")
    : reading;
  return spoken.toLowerCase().replace(/[\s\p{P}ʼ]/gu, "");
}

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

export function pinyinPair(char: string, syllable: string): string {
  const marked = toneMarks(syllable.normalize("NFC")).toLowerCase();
  return `pinyin:${char.normalize("NFC")}[${SANDHI.test(char) ? toneless(marked) : marked}]`;
}
