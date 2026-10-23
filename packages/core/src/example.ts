/**
 * How long an example and its translation may be, in the characters a reader sees: an inline
 * reading such as `食[た]` and a stress mark count for nothing, so a Japanese sentence gets the
 * same room as a German one.
 */
export const EXAMPLE_LENGTH = 250;

/** Inline readings in any language's notation, and the combining acute that marks stress. */
const READING = /\[[^\]\n]*\]/g;
const STRESS = /́/g;

/** The example as a reader sees it: no inline readings or stress marks, spaces collapsed. */
export function exampleShown(text: string): string {
  return text.replace(READING, "").replace(STRESS, "").normalize("NFC").replace(/\s+/g, " ").trim();
}

/** How many characters of an example or translation a reader sees. */
export function shownLength(text: string): number {
  return [...exampleShown(text)].length;
}

/** True when text fits `EXAMPLE_LENGTH` as a reader sees it. */
export function fitsExample(text: string): boolean {
  return shownLength(text) <= EXAMPLE_LENGTH;
}

/**
 * A short key for the sentence a translation was written for. It reads the example as shown, so
 * readings or stress marks added to the same sentence leave its translation current.
 */
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

/**
 * True when the card's translation was written for an earlier example. A translation stored
 * without a fingerprint, such as one an import brought, is taken as written for the example.
 */
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
