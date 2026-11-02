import type { Card, DeckSummary } from "@lymi/client/api";
import { canEnrich as hasSomethingToFill } from "@lymi/core";

/**
 * Whether a card's page offers Enrich: to the deck's owner, while core finds something to ask for and
 * no run is filling it. iOS's menu has no dimmed row, so a working card leaves it out.
 */
export function canEnrich(
  card: Card,
  deck: Pick<DeckSummary, "role" | "enrichFields"> | undefined,
): boolean {
  return (
    deck?.role === "owner" &&
    card.enrichmentStatus !== "working" &&
    card.exampleTranslationStatus !== "working" &&
    hasSomethingToFill(card, deck.enrichFields)
  );
}
