import { isHan } from "../pinyin/align";
import { alignJyutping, type JyutpingSegment, jyutpingTermSegments } from "./align";
import { cleanJyutping, hasTone, jyutpingSyllables, readingTokens } from "./split";

export type { JyutpingSegment } from "./align";
export { alignJyutping, jyutpingTermSegments } from "./align";
export {
  JYUTPING_BRACKET,
  jyutpingExampleSegments,
  parseJyutping,
  stripJyutping,
} from "./notation";
export { cleanJyutping, hasTone, jyutpingSyllables, readingTokens } from "./split";

const KEY_ALIGN_MAX = 80;

function firstForm(term: string): string | null {
  const at = term.indexOf(" · ");
  return at > 0 ? term.slice(0, at) : null;
}

function aligned(term: string, reading: string): JyutpingSegment[] | null {
  const tokens = readingTokens(reading);
  const whole = alignJyutping(term, tokens);
  if (whole) return whole;
  const first = firstForm(term);
  const head = first ? alignJyutping(first, tokens) : null;
  return first && head ? [...head, { text: term.slice(first.length) }] : null;
}

export function jyutpingTermReading(term: string, pronunciation: string): JyutpingSegment[] | null {
  const reading = cleanJyutping(pronunciation);
  if (!reading || ![...term].some(isHan)) return null;
  return (
    aligned(term, reading) ??
    (jyutpingSyllables(reading) ? jyutpingTermSegments(term, reading) : null)
  );
}

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

export function jyutpingPairs(segments: readonly JyutpingSegment[]): string[] {
  return segments.flatMap(({ text, reading }) => {
    const chars = [...text];
    const char = chars[0];
    return reading !== undefined && char && chars.length === 1 && isHan(char) && hasTone(reading)
      ? [jyutpingPair(char, reading)]
      : [];
  });
}

export function jyutpingPair(char: string, syllable: string): string {
  return `jyutping:${char.normalize("NFC")}[${syllable.toLowerCase()}]`;
}

export function jyutpingDigits(pronunciation: string): string {
  if (pronunciation.normalize("NFKC") === pronunciation.normalize("NFC")) return pronunciation;
  const clean = cleanJyutping(pronunciation);
  return jyutpingSyllables(clean)?.every(hasTone) ? clean : pronunciation;
}
