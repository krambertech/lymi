import type { PublicDeckSummary } from "@lymi/core/catalog";

/** The homepage's free decks, in this order where a locale offers them: a spread of subjects first. */
export const FEATURED_DECKS = [
  "travel-german",
  "read-japanese-kana",
  "world-capitals",
  "travel-spanish",
  "periodic-table",
  "us-citizenship-test",
  "flags-of-the-world",
  "travel-italian",
];
const FEATURED_COUNT = 8;

/** The featured decks this locale offers, topped up from the catalogue when a slug is missing. */
export function featuredDecks(decks: readonly PublicDeckSummary[]): PublicDeckSummary[] {
  const picked = FEATURED_DECKS.flatMap((slug) => decks.find((deck) => deck.slug === slug) ?? []);
  const rest = decks.filter((deck) => deck.card && !picked.includes(deck));
  return [...picked, ...rest].slice(0, FEATURED_COUNT);
}
