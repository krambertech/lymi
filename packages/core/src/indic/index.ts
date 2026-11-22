import { readTamilWord } from "./tamil";

export { readTamilWord } from "./tamil";

export type IndicSegment = { text: string; reading?: string; known?: boolean };

const RUN = /[\p{Script=Tamil}\u{200c}\u{200d}]+/gu;
const LETTER = /[அ-ஹ]/u;
const JOINERS = /[\u{200c}\u{200d}]/gu;

function words(text: string): { text: string; word: boolean }[] {
  const out: { text: string; word: boolean }[] = [];
  let cursor = 0;
  for (const match of text.matchAll(RUN)) {
    if (!LETTER.test(match[0])) continue;
    if (match.index > cursor) out.push({ text: text.slice(cursor, match.index), word: false });
    out.push({ text: match[0], word: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) out.push({ text: text.slice(cursor), word: false });
  return out;
}

export function tamilSegments(text: string): IndicSegment[] {
  return words(text).map(({ text, word }) =>
    word ? { text, reading: readTamilWord(text) } : { text },
  );
}

export function tamilReading(text: string): string {
  return words(text)
    .map(({ text, word }) => (word ? readTamilWord(text) : text))
    .join("");
}

export function isTamilReading(pronunciation: string | null | undefined): boolean {
  const text = pronunciation?.normalize("NFD").trim() ?? "";
  return /^[a-z\p{M}]+(?:[ '’-]+[a-z\p{M}]+)*$/iu.test(text);
}

function foldReading(reading: string): string {
  return reading
    .normalize("NFD")
    .replace(/[\p{M}\s'’-]/gu, "")
    .toLowerCase()
    .replace(/([aeiou])\1/g, "$1");
}

function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      next[j] = Math.min(
        (row[j] as number) + 1,
        (next[j - 1] as number) + 1,
        (row[j - 1] as number) + cost,
      );
    }
    row = next;
  }
  return row[b.length] as number;
}

function unvoiced(reading: string): string {
  return reading.replace(/[bgdj]/g, (stop) => ({ b: "p", g: "k", d: "t", j: "c" })[stop] ?? stop);
}

function readsAs(own: string, spelled: string): boolean {
  const a = unvoiced(foldReading(own));
  const b = unvoiced(foldReading(spelled));
  return distance(a, b) <= Math.max(1, Math.floor(Math.max(a.length, b.length) / 3));
}

export function sameTamilReading(term: string, pronunciation: string): boolean {
  return (
    isTamilReading(pronunciation) && foldReading(pronunciation) === foldReading(tamilReading(term))
  );
}

export function tamilTermReading(
  term: string,
  pronunciation?: string | null | undefined,
): IndicSegment[] | null {
  const segments = tamilSegments(term);
  const drawn = segments.filter((segment) => segment.reading !== undefined);
  if (drawn.length === 0) return null;
  if (!pronunciation || !isTamilReading(pronunciation)) return segments;
  const tokens = pronunciation.normalize("NFC").trim().split(/\s+/u);
  const fits =
    tokens.length === drawn.length &&
    drawn.every((segment, i) => readsAs(tokens[i] as string, segment.reading as string));
  if (!fits) return segments;
  let next = 0;
  return segments.map((segment) =>
    segment.reading === undefined
      ? segment
      : { text: segment.text, reading: tokens[next++] as string },
  );
}

export function tamilPair(word: string): string {
  return `indic:${word.normalize("NFC").replace(JOINERS, "")}`;
}

export function tamilPairs(term: string): string[] {
  return words(term)
    .filter(({ word }) => word)
    .map(({ text }) => tamilPair(text));
}

export function markKnownTamil(
  segments: readonly IndicSegment[],
  known: ReadonlySet<string> | undefined,
): readonly IndicSegment[] {
  if (!known?.size) return segments;
  return segments.map((segment) =>
    segment.reading !== undefined && known.has(tamilPair(segment.text))
      ? { ...segment, known: true }
      : segment,
  );
}
