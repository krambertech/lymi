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

/** Past this many characters a term is a passage, and a card's own reading goes over it whole. */
const ALIGN_MAX = 80;

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

/**
 * Whether a pronunciation is a reading in Latin letters, with or without Lymi's marks, rather than
 * IPA, a respelling in Tamil script or a hint, so an old IPA line is never drawn as a reading.
 */
export function isTamilReading(pronunciation: string | null | undefined): boolean {
  const text = pronunciation?.normalize("NFD").trim() ?? "";
  return /^[a-z\p{M}]+(?:[ '’-]+[a-z\p{M}]+)*$/iu.test(text);
}

/** A reading folded for comparison: NFC, lower case, no spaces, hyphens or apostrophes, and aa ii uu as ā ī ū. */
function foldReading(reading: string): string {
  return reading
    .normalize("NFC")
    .toLowerCase()
    .replace(/[\s'’-]/gu, "")
    .replace(/aa/g, "ā")
    .replace(/ii/g, "ī")
    .replace(/uu/g, "ū");
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
 * from its pronunciation, replaces the spelling's: word for word when it has as many words, else
 * over the whole term. A pronunciation that is not a reading, such as IPA, is ignored.
 */
export function tamilTermReading(
  term: string,
  pronunciation?: string | null | undefined,
): IndicSegment[] | null {
  const segments = tamilSegments(term);
  const drawn = segments.filter((segment) => segment.reading !== undefined);
  if (drawn.length === 0) return null;
  if (!pronunciation || !isTamilReading(pronunciation)) return segments;
  const own = pronunciation.normalize("NFC").trim();
  const tokens = own.split(/\s+/u);
  if (tokens.length !== drawn.length || Array.from(term).length > ALIGN_MAX) {
    return [{ text: term, reading: own }];
  }
  let next = 0;
  return segments.map((segment) =>
    segment.reading === undefined
      ? segment
      : { text: segment.text, reading: tokens[next++] as string },
  );
}

/** One Tamil word as a Known pair, keyed under the engine so it never meets a kana or pinyin pair. */
export function tamilPair(word: string): string {
  return `tamil:${word.normalize("NFC")}`;
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
