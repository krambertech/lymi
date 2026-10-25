import type { PublicDeckSummary } from "@lymi/core/catalog";
import { addUrl } from "../deck/DeckView";

/** The edition a deck row was read in, which rides along so the learner gets the same meanings. */
export const editionOf = (deck: PublicDeckSummary) =>
  deck.meaningLanguage === "en" ? undefined : deck.meaningLanguage;

/** Adds a listed deck in the edition the page showed it in. */
export const addDeckUrl = (deck: PublicDeckSummary) => addUrl(deck.slug, editionOf(deck));

/** The steps of a beginner path whose decks are published, each with its deck's name and size. */
export function pathSteps<Step extends { slug: string }>(
  path: readonly Step[],
  decks: readonly PublicDeckSummary[],
) {
  return path.flatMap((step) => {
    const deck = decks.find((d) => d.slug === step.slug);
    return deck
      ? [{ ...step, name: deck.name, count: deck.cardCount, edition: editionOf(deck) }]
      : [];
  });
}
