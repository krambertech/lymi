import { INTERJECTIONS, SYLLABLE_MAX, SYLLABLES } from "./syllables";
import { toneMarks, untoned } from "./tones";

export type Syllable = { text: string; erhua: boolean };

export type ReadingToken = { word: string; syllables: Syllable[] | null };

const BREAK = /[\s'’ʼ‘-]+/u;
const EDGE = /^[\p{P}]+|[\p{P}]+$/gu;

function splitWord(word: string, loose: boolean): Syllable[] | null {
  const chars = [...word];
  const letters = chars.map((char) => untoned(char));
  const plain = letters.map((letter) => letter.plain.toLowerCase());
  const failed = new Set<number>();
  const visit = (at: number): Syllable[] | null => {
    if (at === chars.length) return [];
    if (failed.has(at)) return null;
    for (let end = Math.min(chars.length, at + SYLLABLE_MAX); end > at; end--) {
      const base = plain.slice(at, end).join("");
      const tones = letters.slice(at, end).filter((letter) => letter.toned).length;
      if (tones > 1) continue;
      if (at > 0 && !loose && /^[aoe]/.test(base)) continue;
      const own = SYLLABLES.has(base);
      const erhua =
        !own && base.length > 1 && base.endsWith("r") && SYLLABLES.has(base.slice(0, -1));
      if (!own && !erhua) continue;
      const rest = visit(end);
      if (rest) return [{ text: chars.slice(at, end).join(""), erhua }, ...rest];
    }
    failed.add(at);
    return null;
  };
  return visit(0);
}

function syllablesOf(word: string): Syllable[] | null {
  const lower = [...word].map((char) => untoned(char).plain.toLowerCase()).join("");
  if (INTERJECTIONS.has(lower)) return [{ text: word, erhua: false }];
  return splitWord(word, false) ?? splitWord(word, true);
}

export function cleanPinyin(reading: string): string {
  return toneMarks(reading.normalize("NFC").trim()).replace(/\s+/gu, " ");
}

export function readingTokens(reading: string): ReadingToken[] {
  const out: ReadingToken[] = [];
  for (const piece of cleanPinyin(reading).split(BREAK)) {
    const word = piece.replace(EDGE, "");
    if (!word) continue;
    const last = out.at(-1)?.syllables?.at(-1);
    if (word.toLowerCase() === "r" && last && !last.erhua) {
      last.text += word;
      last.erhua = true;
      continue;
    }
    out.push({ word, syllables: syllablesOf(word) });
  }
  return out;
}

export function pinyinSyllables(reading: string): Syllable[] | null {
  const tokens = readingTokens(reading);
  if (tokens.length === 0 || tokens.some((token) => !token.syllables)) return null;
  return tokens.flatMap((token) => token.syllables ?? []);
}
