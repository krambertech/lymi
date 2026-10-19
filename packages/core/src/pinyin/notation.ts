/**
 * Pinyin inline in an example, as Anki's Chinese decks write it: `你好[nǐ hǎo]`, where the bracket
 * reads as many Han characters just before it as it has syllables.
 */
import { isHan, type PinyinSegment } from "./align";
import { pinyinSyllables } from "./split";

/** A bracket that may hold pinyin: letters, tone marks or numbers, spaces and apostrophes. */
export const PINYIN_BRACKET = /\[([\p{Script=Latin}\p{M}0-5 '’:]{1,60})\]/gu;

/** How many Han characters a bracket's syllables cover: each syllable one, and 儿 after an erhua one. */
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

/**
 * Text with inline pinyin as runs to draw: each bracket of pinyin goes over the Han characters
 * just before it, one syllable each. A bracket that is not pinyin or finds too few characters
 * stays as written, so `[sound:ni.mp3]` is plain text.
 */
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

/** Text with its inline pinyin taken out: `我说你好[nǐ hǎo]` → `我说你好`. */
export function stripPinyin(text: string): string {
  return parsePinyin(text)
    .map((segment) => segment.text)
    .join("");
}

/** Runs written back as text with inline pinyin, so `parsePinyin` reads the same runs. */
export function formatPinyin(segments: readonly PinyinSegment[]): string {
  return segments
    .map(({ text, reading }) => (reading === undefined ? text : `${text}[${reading}]`))
    .join("");
}
