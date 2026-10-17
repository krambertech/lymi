/**
 * The key the duplicate rule compares. Trimmed, whitespace collapsed, case-folded,
 * Unicode-normalised so "é" typed two ways is one string. Accents are kept: "pesca" and
 * "pèsca" are different words. See ADR 0004.
 */
export function normaliseTerm(term: string): string {
  return term.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/** "ja" and "ja-JP" are one language to the duplicate rule; no language is its own language. */
export function languageKey(language: string | null | undefined): string {
  return language?.split("-")[0]?.toLowerCase() ?? "";
}

/** What the duplicate rule compares, from a card's language and its `normaliseTerm` key. */
export function duplicateKey(language: string | null | undefined, normalizedTerm: string): string {
  return `${languageKey(language)} ${normalizedTerm}`;
}

const KANA_READING = /^[\p{Script=Hiragana}\p{Script=Katakana}ー・\s]+$/u;

/** A Japanese card's pronunciation when it is a kana reading, never IPA, romaji or a hint. */
export function kanaReading(card: {
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): string | null {
  const reading = card.pronunciation?.normalize("NFC").trim();
  if (languageKey(card.language) !== "ja" || !reading) return null;
  return KANA_READING.test(reading) ? reading : null;
}

/**
 * The reading the duplicate rule compares: a Japanese card's kana reading without spaces or ・ and
 * with katakana folded to hiragana, so ジョウズ, じょう ず and じょうず are one reading. Null where no
 * reading applies.
 */
export function readingKey(card: {
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): string | null {
  const reading = kanaReading(card);
  if (!reading) return null;
  return reading
    .replace(/[\s・]/g, "")
    .replace(/[\u30a1-\u30f6]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0x60));
}

/**
 * Whether a term cue shows the card's pronunciation before the reveal: Chinese keeps its pinyin
 * until the card is Known; every other language's reading waits for the reveal.
 */
export function cueKeepsReading(language: string | null | undefined, known: boolean): boolean {
  return languageKey(language) === "zh" && !known;
}

/** Two readings tell cards apart only when both cards have one and they differ: 上手 じょうず and うわて. */
export function sameReading(a: string | null, b: string | null): boolean {
  return a === null || b === null || a === b;
}

/** The key one learner's tags are joined by, so "Дієслова" and "дієслова" are one tag on every device. */
export function tagKey(tag: string): string {
  return tag.normalize("NFC").trim().toLowerCase();
}

/** Scripts where one or two characters are a whole word, so a short answer still gives itself away. */
const DENSE_SCRIPT = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

/** A picture description that contains the term or the meaning would show the answer before reveal. */
export function revealsAnswer(
  card: { term: string; meaning?: string | null | undefined },
  description: string,
): boolean {
  return revealedAnswer(card, description) !== null;
}

/** Which field a description gives away, and that field's text, so a refusal can name it. */
export function revealedAnswer(
  card: { term: string; meaning?: string | null | undefined },
  description: string,
): { field: "term" | "meaning"; text: string } | null {
  const text = normaliseTerm(description);
  for (const field of ["term", "meaning"] as const) {
    const answer = card[field] ?? "";
    const key = normaliseTerm(answer);
    if ((key.length >= 3 || DENSE_SCRIPT.test(key)) && text.includes(key)) {
      return { field, text: answer };
    }
  }
  return null;
}

/** Pronunciation is generated for a term up to this long; a longer one is a passage, not a word to say. */
export const SPOKEN_TERM_MAX = 200;

/** Whether a card's term can be spoken: it has a language and is short enough. */
export function canSpeakTerm(card: {
  term: string;
  language?: string | null | undefined;
}): boolean {
  return !!card.language && Array.from(card.term).length <= SPOKEN_TERM_MAX;
}

/** The first form of a term written as principal parts ("pikk · pika · pikka" → "pikk"), for a title. */
export function headword(term: string): string {
  const at = term.indexOf(" · ");
  return at > 0 ? term.slice(0, at) : term;
}
