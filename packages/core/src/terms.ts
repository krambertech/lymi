import { languageKey, saysReading, speechInputs, stressRules } from "./languages";
import { kanaReading, markedTerm, stripReadings } from "./reading";
import { stripStress } from "./stress";

/**
 * The key the duplicate rule compares. Trimmed, whitespace collapsed, case-folded,
 * Unicode-normalised so "é" typed two ways is one string. Accents are kept: "pesca" and
 * "pèsca" are different words. See ADR 0004.
 */
export function normaliseTerm(term: string): string {
  return term.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

/**
 * A card's `normalized_term`: `normaliseTerm`, then without stress marks where its language draws
 * them in place, so за́мок and замок are one term and the stress tells two words apart through
 * the reading key. The fold is never global: NFC keeps U+0301 on Lithuanian ą́. ADR 0004.
 */
export function termKey(language: string | null | undefined, term: string): string {
  const key = normaliseTerm(term);
  return stressRules(language) ? stripStress(key) : key;
}

/** What the duplicate rule compares, from a card's language and its `normaliseTerm` key. */
export function duplicateKey(language: string | null | undefined, normalizedTerm: string): string {
  return `${languageKey(language)} ${normalizedTerm}`;
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

/** Long enough to be a word by itself: three characters, or one in a dense script such as 猫 or 물. */
export function standsAlone(text: string): boolean {
  return text.length >= 3 || DENSE_SCRIPT.test(text);
}

/** A picture description that contains the term or the meaning would show the answer before reveal. */
export function revealsAnswer(
  card: { term: string; meaning?: string | null | undefined; language?: string | null | undefined },
  description: string,
): boolean {
  return revealedAnswer(card, description) !== null;
}

/** Which field a description gives away, and that field's text, so a refusal can name it. */
export function revealedAnswer(
  card: { term: string; meaning?: string | null | undefined; language?: string | null | undefined },
  description: string,
): { field: "term" | "meaning"; text: string } | null {
  const text = normaliseTerm(stripReadings(description, card.language));
  for (const field of ["term", "meaning"] as const) {
    const answer = card[field] ?? "";
    const key = normaliseTerm(answer);
    if (standsAlone(key) && text.includes(key)) {
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

/** Whether a card has pronunciation to play: its own recording, or speech Lymi can generate. */
export function canPlayPronunciation(card: {
  term: string;
  language?: string | null | undefined;
  audioSource?: string | null | undefined;
}): boolean {
  return card.audioSource === "recorded" || canSpeakTerm(card);
}

/** The first form of a term written as principal parts ("pikk · pika · pikka" → "pikk"), for a title. */
export function headword(term: string): string {
  const at = term.indexOf(" · ");
  return at > 0 ? term.slice(0, at) : term;
}

/**
 * What generated speech says: the card's Reading where its language says one, so 上手 is said
 * じょうず or うわて and замок за́мок or замо́к as the card reads it, else the term.
 */
export function spokenText(card: {
  term: string;
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
}): string {
  return (saysReading(card.language) && (kanaReading(card) ?? markedTerm(card))) || card.term;
}

/** What an in-memory player's clip was made from, so it is discarded when any of it changes. */
export function pronunciationInputKey(card: {
  id: string;
  term: string;
  language?: string | null | undefined;
  pronunciation?: string | null | undefined;
  meaning?: string | null | undefined;
  audioSource?: string | null | undefined;
}): string {
  const inputs = card.audioSource === "recorded" ? [] : speechInputs(card.language);
  return JSON.stringify([
    card.id,
    card.language,
    card.term,
    card.audioSource,
    ...inputs.map((field) => card[field]),
  ]);
}
