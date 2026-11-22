import { alignPinyin, isHan, type PinyinSegment } from "./align";
import { cleanPinyin, pinyinSyllables, readingTokens } from "./split";

export const PINYIN_BRACKET = /\[([\p{Script=Latin}\p{M}0-5 '’:]{1,60})\]/gu;

function baseStart(
  text: string,
  open: number,
  floor: number,
  syllables: readonly { erhua: boolean }[],
) {
  let at = open;
  for (let i = syllables.length - 1; i >= 0; i--) {
    if (at > floor && syllables[i]?.erhua && /[儿兒]/u.test(text[at - 1] as string)) at -= 1;
    if (at <= floor || !isHan(text[at - 1] as string)) return null;
    at -= 1;
  }
  return at;
}

export function parsePinyin(text: string): PinyinSegment[] {
  const out: PinyinSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(PINYIN_BRACKET)) {
    const reading = match[1] as string;
    const syllables = pinyinSyllables(reading);
    const at = syllables && baseStart(text, match.index, cursor, syllables);
    if (at === null || at === undefined) continue;
    out.push({ text: text.slice(cursor, at) }, { text: text.slice(at, match.index), reading });
    cursor = match.index + match[0].length;
  }
  out.push({ text: text.slice(cursor) });
  return out.filter((segment) => segment.text);
}

export function pinyinExampleSegments(text: string): PinyinSegment[] {
  return parsePinyin(text).flatMap((segment) => {
    if (segment.reading === undefined) return [segment];
    const reading = cleanPinyin(segment.reading);
    return alignPinyin(segment.text, readingTokens(reading)) ?? [{ ...segment, reading }];
  });
}

export function stripPinyin(text: string): string {
  return parsePinyin(text)
    .map((segment) => segment.text)
    .join("");
}

export function formatPinyin(segments: readonly PinyinSegment[]): string {
  return segments
    .map(({ text, reading }) => (reading === undefined ? text : `${text}[${reading}]`))
    .join("");
}
