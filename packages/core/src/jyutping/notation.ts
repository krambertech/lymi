/**
 * Jyutping inline in an example: `你好[nei5 hou2]`, where the bracket reads as many Han characters
 * just before it as it has syllables, and any letters among them that the reading says (T恤[ti1 seot1]).
 */
import { isHan } from "../pinyin/align";
import { alignJyutping, type JyutpingSegment } from "./align";
import { cleanJyutping, hasTone, jyutpingSyllables, readingTokens } from "./split";

/** A bracket that may hold Jyutping: letters, tone numbers plain, raised or full-width, spaces, hyphens and apostrophes. */
export const JYUTPING_BRACKET = /\[([a-zA-Zａ-ｚＡ-Ｚ1-6¹²³⁴⁵⁶１-６ '’-]{1,60})\]/gu;

/** A bracket's syllables when it is toned Jyutping, so `[OK]` or `[sound:ni.mp3]` never reads a character. */
function bracketSyllables(reading: string): string[] | null {
  const syllables = jyutpingSyllables(reading);
  return syllables?.every(hasTone) ? syllables : null;
}

/** Latin letters, which a bracket may read with the characters after them, as in T恤[ti1 seot1]. */
const LETTER = /\p{Script=Latin}/u;

/** How many letters a bracket may reach back over besides its characters. */
const LETTERS_MAX = 8;

/**
 * Where the text a bracket reads begins: the shortest stretch of Han characters, and letters
 * before them, that its syllables fit one per character, stepping back by code point so a
 * character outside the Basic Multilingual Plane, such as 𨋢, is one; null when nothing fits.
 */
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
    // A stretch starts at a character, or at the first letter of a word, never inside one.
    const inside = LETTER.test(char) && at > floor && LETTER.test(text[at - 1] ?? "");
    if (!inside && alignJyutping(text.slice(at, open), tokens)) return at;
  }
  return null;
}

/**
 * Text with inline Jyutping as runs to draw: each bracket of toned Jyutping goes over the Han
 * characters just before it, one syllable each, with letters the reading says. A bracket that is not Jyutping or finds too few
 * characters stays as written.
 */
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

/**
 * An example's inline Jyutping as one run per Han character, cleaned to plain tone numbers, so each
 * syllable can fade on its own: `你好[nei⁵ hou²]` → 你 nei5, 好 hou2.
 */
export function jyutpingExampleSegments(text: string): JyutpingSegment[] {
  return parseJyutping(text).flatMap((segment) => {
    if (segment.reading === undefined) return [segment];
    const reading = cleanJyutping(segment.reading);
    return alignJyutping(segment.text, readingTokens(reading)) ?? [{ ...segment, reading }];
  });
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
