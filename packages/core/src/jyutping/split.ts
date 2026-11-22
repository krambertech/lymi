import { INTERJECTIONS, SYLLABLE_MAX, SYLLABLES, TONE } from "./syllables";

export type ReadingToken = { word: string; syllables: string[] | null };

const BREAK = /[\s'’ʼ‘-]+/u;
const EDGE = /^[\p{P}]+|[\p{P}]+$/gu;

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

function syllablesOf(word: string): string[] | null {
  if (INTERJECTIONS.has(word.toLowerCase().replace(/[1-6]$/u, ""))) return [word];
  return /^[a-z1-6]+$/iu.test(word) ? splitWord(word) : null;
}

export function cleanJyutping(reading: string): string {
  return reading.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

export function readingTokens(reading: string): ReadingToken[] {
  const out: ReadingToken[] = [];
  for (const piece of cleanJyutping(reading).split(BREAK)) {
    const word = piece.replace(EDGE, "");
    if (word) out.push({ word, syllables: syllablesOf(word) });
  }
  return out;
}

export function jyutpingSyllables(reading: string): string[] | null {
  const tokens = readingTokens(reading);
  if (tokens.length === 0 || tokens.some((token) => !token.syllables)) return null;
  return tokens.flatMap((token) => token.syllables ?? []);
}

export const hasTone = (syllable: string) => TONE.test(syllable.slice(-1));
