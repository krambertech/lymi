/** How long an example and its translation may be in characters as shown, readings and stress not counted. */
export const EXAMPLE_LENGTH = 250;

/** Inline readings in any language's notation, and the combining acute that marks stress. */
const READING = /\[[^\]\n]*\]/g;
const STRESS = /́/g;

/** The example as a reader sees it: no inline readings or stress marks, spaces collapsed. */
export function exampleShown(text: string): string {
  // Composed first, so é and ά keep their accents and only a stress with no precomposed letter, as on Cyrillic, goes.
  return text.normalize("NFC").replace(READING, "").replace(STRESS, "").replace(/\s+/g, " ").trim();
}

/** How many characters of an example or translation a reader sees. */
export function shownLength(text: string): number {
  return [...exampleShown(text)].length;
}

/** True when text fits `EXAMPLE_LENGTH` as a reader sees it. */
export function fitsExample(text: string): boolean {
  return shownLength(text) <= EXAMPLE_LENGTH;
}

/** A key for the sentence as shown, so readings or stress added to it leave its translation current. */
export function exampleFingerprint(example: string): string {
  const text = exampleShown(example);
  // cyrb53: two 32-bit lanes, enough that two sentences of one card never collide.
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

/** A card as these rules read it. */
export type TranslatedExample = {
  example: string | null;
  exampleTranslation: string | null;
  exampleTranslationOf: string | null;
};

/** Stands for an example no longer known, as when a file says its translation is stale; no fingerprint equals it. */
export const EARLIER_EXAMPLE = "~earlier";

/** True when the card's translation was written for an earlier example; one without a fingerprint never is. */
export function translationStale(card: TranslatedExample): boolean {
  if (!card.example || !card.exampleTranslation || card.exampleTranslationOf === null) return false;
  return card.exampleTranslationOf !== exampleFingerprint(card.example);
}

/** The translation a reader is shown beside the example: none for an example since changed. */
export function shownTranslation(card: {
  example: string | null;
  exampleTranslation: string | null;
  exampleTranslationStale: boolean;
}): string | null {
  if (!card.example || card.exampleTranslationStale) return null;
  return card.exampleTranslation?.trim() || null;
}
