import { isHan } from "../pinyin/align";
import { alignJyutping, type JyutpingSegment } from "./align";
import { cleanJyutping, hasTone, jyutpingSyllables, readingTokens } from "./split";

export const JYUTPING_BRACKET = /\[([a-zA-Zａ-ｚＡ-Ｚ1-6¹²³⁴⁵⁶１-６ '’-]{1,60})\]/gu;

function bracketSyllables(reading: string): string[] | null {
  const syllables = jyutpingSyllables(reading);
  return syllables?.every(hasTone) ? syllables : null;
}

const LETTER = /\p{Script=Latin}/u;

const LETTERS_MAX = 8;

function baseStart(text: string, open: number, floor: number, reading: string): number | null {
  const tokens = readingTokens(cleanJyutping(reading));
  let at = open;
  let letters = 0;
  while (at > floor) {
    const low = text.charCodeAt(at - 1);
    const step = at - 1 > floor && low >= 0xdc00 && low <= 0xdfff ? 2 : 1;
    const char = text.slice(at - step, at);
    if (LETTER.test(char)) letters += 1;
    else if (!isHan(char)) return null;
    if (letters > LETTERS_MAX) return null;
    at -= step;
    const inside = LETTER.test(char) && at > floor && LETTER.test(text[at - 1] ?? "");
    if (!inside && alignJyutping(text.slice(at, open), tokens)) return at;
  }
  return null;
}

export function parseJyutping(text: string): JyutpingSegment[] {
  const out: JyutpingSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(JYUTPING_BRACKET)) {
    const reading = match[1] as string;
    const syllables = bracketSyllables(reading);
    const at = syllables && baseStart(text, match.index, cursor, reading);
    if (at === null || at === undefined) continue;
    out.push({ text: text.slice(cursor, at) }, { text: text.slice(at, match.index), reading });
    cursor = match.index + match[0].length;
  }
  out.push({ text: text.slice(cursor) });
  return out.filter((segment) => segment.text);
}

export function jyutpingExampleSegments(text: string): JyutpingSegment[] {
  return parseJyutping(text).flatMap((segment) => {
    if (segment.reading === undefined) return [segment];
    const reading = cleanJyutping(segment.reading);
    return alignJyutping(segment.text, readingTokens(reading)) ?? [{ ...segment, reading }];
  });
}

export function stripJyutping(text: string): string {
  return parseJyutping(text)
    .map((segment) => segment.text)
    .join("");
}
