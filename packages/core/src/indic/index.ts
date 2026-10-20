/**
 * The word-by-word engine for Indic scripts, Tamil first: each word's reading is worked out from
 * its spelling and drawn over the whole word, because an abugida's letters do not map one to one
 * onto syllables of the reading. docs/proposals/tamil.md.
 */
import { readTamilWord } from "./tamil";

export { readTamilWord } from "./tamil";

/** One run of text, with the reading drawn over it when it is a word; `known` fades that reading. */
export type IndicSegment = { text: string; reading?: string; known?: boolean };

/** A run of Tamil letters and signs, with the joiners that may sit inside a cluster. */
const RUN = /[\p{Script=Tamil}\u{200c}\u{200d}]+/gu;
/** A Tamil vowel or consonant: a run without one, such as a lone digit, is not a word. */
const LETTER = /[அ-ஹ]/u;
const JOINERS = /[\u{200c}\u{200d}]/gu;

/** Each Tamil word apart from the text around it; Tamil words are written with spaces between them. */
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

/** Text with each Tamil word carrying the reading its spelling gives, and the rest plain. */
export function tamilSegments(text: string): IndicSegment[] {
  return words(text).map(({ text, word }) =>
    word ? { text, reading: readTamilWord(text) } : { text },
  );
}

/** The reading Lymi gives a Tamil text from its spelling, word by word: தமிழ் பாடல் → tamizh pāḍal. */
export function tamilReading(text: string): string {
  return words(text)
    .map(({ text, word }) => (word ? readTamilWord(text) : text))
    .join("");
}

/** Whether a pronunciation is written in Latin letters, with or without Lymi's marks, rather than IPA or Tamil script. */
export function isTamilReading(pronunciation: string | null | undefined): boolean {
  const text = pronunciation?.normalize("NFD").trim() ?? "";
  return /^[a-z\p{M}]+(?:[ '’-]+[a-z\p{M}]+)*$/iu.test(text);
}

/**
 * A reading folded for comparison, so Lymi's letters and chat spelling meet: no marks, case,
 * spaces, hyphens or apostrophes, and doubled vowels single, so pāḍal and paadal are both padal.
 */
function foldReading(reading: string): string {
  return reading
    .normalize("NFD")
    .replace(/[\p{M}\s'’-]/gu, "")
    .toLowerCase()
    .replace(/([aeiou])\1/g, "$1");
}

/** How many letters must change to turn one folded reading into the other. */
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

/**
 * Whether a word of the card's own reading can be the word's: within one letter in three of the
 * spelling's reading once folded, so பஸ் may read bas, while a gloss such as song never passes.
 */
function readsAs(own: string, spelled: string): boolean {
  const a = foldReading(own);
  const b = foldReading(spelled);
  return distance(a, b) <= Math.max(1, Math.floor(Math.max(a.length, b.length) / 3));
}

/**
 * Whether a card's pronunciation only repeats the reading its spelling gives, so a write can leave
 * the field empty and keep it for words said against the rule.
 */
export function sameTamilReading(term: string, pronunciation: string): boolean {
  return (
    isTamilReading(pronunciation) && foldReading(pronunciation) === foldReading(tamilReading(term))
  );
}

/**
 * The term with a reading over each Tamil word, or null when it has none. A card's own reading,
 * from its pronunciation, replaces the spelling's only when it has as many words and each is close
 * to the spelling's reading; anything else in the field, such as IPA, a hint or a gloss, is ignored.
 */
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

/** One Tamil word as a Known pair, keyed under the engine so it never meets a kana or pinyin pair; joiners never part two spellings of a word. */
export function tamilPair(word: string): string {
  return `indic:${word.normalize("NFC").replace(JOINERS, "")}`;
}

/**
 * The Known pairs a term gives: each Tamil word whole. The word is the pair, not a letter, because
 * a letter's sound changes with the letters beside it, and the reading comes from the spelling.
 */
export function tamilPairs(term: string): string[] {
  return words(term)
    .filter(({ word }) => word)
    .map(({ text }) => tamilPair(text));
}

/**
 * The runs with `known` on each word that is one of the learner's Known words as written. An
 * inflected form, such as வீட்டில் for a Known வீடு, keeps its reading.
 */
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
