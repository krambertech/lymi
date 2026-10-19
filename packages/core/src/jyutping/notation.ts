/**
 * Jyutping inline in an example: `你好[nei5 hou2]`, where the bracket reads as many Han characters
 * just before it as it has syllables.
 */
import { isHan } from "../pinyin/align";
import type { JyutpingSegment } from "./align";
import { hasTone, jyutpingSyllables } from "./split";

/** A bracket that may hold Jyutping: letters, tone numbers, spaces and apostrophes. */
export const JYUTPING_BRACKET = /\[([a-zA-Z1-6 '’]{1,60})\]/gu;

/** A bracket's syllables when it is toned Jyutping, so `[OK]` or `[sound:ni.mp3]` never reads a character. */
function bracketSyllables(reading: string): string[] | null {
  const syllables = jyutpingSyllables(reading);
  return syllables?.every(hasTone) ? syllables : null;
}

/**
 * Where the characters a bracket reads begin, one per syllable, counting back by code point so a
 * character outside the Basic Multilingual Plane, such as 𨋢, is one; null when there are too few.
 */
function baseStart(text: string, open: number, floor: number, count: number): number | null {
  let at = open;
  for (let i = 0; i < count; i++) {
    if (at <= floor) return null;
    const low = text.charCodeAt(at - 1);
    const step = at - 1 > floor && low >= 0xdc00 && low <= 0xdfff ? 2 : 1;
    if (!isHan(text.slice(at - step, at))) return null;
    at -= step;
  }
  return at;
}

/**
 * Text with inline Jyutping as runs to draw: each bracket of toned Jyutping goes over the Han
 * characters just before it, one syllable each. A bracket that is not Jyutping or finds too few
 * characters stays as written.
 */
export function parseJyutping(text: string): JyutpingSegment[] {
  const out: JyutpingSegment[] = [];
  let cursor = 0;
  for (const match of text.matchAll(JYUTPING_BRACKET)) {
    const reading = match[1] as string;
    const syllables = bracketSyllables(reading);
    const at = syllables && baseStart(text, match.index, cursor, syllables.length);
    if (at === null || at === undefined) continue;
    out.push({ text: text.slice(cursor, at) }, { text: text.slice(at, match.index), reading });
    cursor = match.index + match[0].length;
  }
  out.push({ text: text.slice(cursor) });
  return out.filter((segment) => segment.text);
}

/** Text with its inline Jyutping taken out: `我話你好[nei5 hou2]` → `我話你好`. */
export function stripJyutping(text: string): string {
  return parseJyutping(text)
    .map((segment) => segment.text)
    .join("");
}

/** Runs written back as text with inline Jyutping, so `parseJyutping` reads the same runs. */
export function formatJyutping(segments: readonly JyutpingSegment[]): string {
  return segments
    .map(({ text, reading }) => (reading === undefined ? text : `${text}[${reading}]`))
    .join("");
}
