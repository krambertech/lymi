import type { Card, DeckSummary } from "@lymi/client/api";
import { needsEnrichment } from "@lymi/core";
import { cardEdited } from "./edited";

/** As long as the deck's own poll waits on a working card, so a stalled run is let go the same way. */
const PATIENCE = 10 * 60_000;
export const ENRICH_POLL = 2000;

/**
 * Whether a card's menu offers Enrich: to the deck's owner, while a field the deck lets the AI fill is
 * empty and no run is filling it. iOS's menu has no dimmed row, so a working card leaves it out.
 */
export function canEnrich(
  card: Card,
  deck: Pick<DeckSummary, "role" | "enrichFields"> | undefined,
): boolean {
  return (
    deck?.role === "owner" &&
    card.enrichmentStatus !== "working" &&
    needsEnrichment(card, deck.enrichFields)
  );
}

interface Watch {
  /** The card's deck as it stands now, or null when it could not be read this time. */
  read: () => Promise<{ card: Card }[] | null>;
  wait?: () => Promise<void>;
  now?: () => number;
}

/**
 * Follows a working card through its deck's list until the run settles, then hands the card to any
 * screen holding its own copy, such as a review, as Edit card does. Resolves with the settled card,
 * or null when it left the deck or the run outlasted the deck's own patience.
 */
export async function watchEnrichment(
  card: Card,
  {
    read,
    wait = () => new Promise((resolve) => setTimeout(resolve, ENRICH_POLL)),
    now = Date.now,
  }: Watch,
): Promise<Card | null> {
  const until = now() + PATIENCE;
  while (now() < until) {
    await wait();
    const rows = await read();
    if (!rows) continue;
    const latest = rows.find((row) => row.card.id === card.id)?.card;
    if (!latest) return null;
    if (latest.enrichmentStatus === "working") continue;
    cardEdited(latest);
    return latest;
  }
  return null;
}
