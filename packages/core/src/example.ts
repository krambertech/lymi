export const EXAMPLE_LENGTH = 250;

const READING = /\[[^\]\n]*\]/g;
const STRESS = /́/g;

export function exampleShown(text: string): string {
  return text.normalize("NFC").replace(READING, "").replace(STRESS, "").replace(/\s+/g, " ").trim();
}

export function shownLength(text: string): number {
  return [...exampleShown(text)].length;
}

export function fitsExample(text: string): boolean {
  return shownLength(text) <= EXAMPLE_LENGTH;
}

export function exampleFingerprint(example: string): string {
  const text = exampleShown(example);
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

export type TranslatedExample = {
  example: string | null;
  exampleTranslation: string | null;
  exampleTranslationOf: string | null;
};

export const EARLIER_EXAMPLE = "~earlier";

export function translationStale(card: TranslatedExample): boolean {
  if (!card.example || !card.exampleTranslation || card.exampleTranslationOf === null) return false;
  return card.exampleTranslationOf !== exampleFingerprint(card.example);
}

export function shownTranslation(card: {
  example: string | null;
  exampleTranslation: string | null;
  exampleTranslationStale: boolean;
}): string | null {
  if (!card.example || card.exampleTranslationStale) return null;
  return card.exampleTranslation?.trim() || null;
}
