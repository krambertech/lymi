import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

/** How long a card may say it is working before the screen stops waiting on it. */
const ENRICHMENT_PATIENCE = 10 * 60_000;

export const deckCardsQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "cards"],
    queryFn: () => api.deckCards(deckId),
    staleTime: 0,
    // While the AI is filling a card, keep asking so its shimmer resolves without a reload.
    // A run settles itself, so a card still working long after its add is a server that stopped
    // answering rather than one still thinking: stop asking rather than poll for ever.
    refetchInterval: (query) =>
      query.state.data?.some(
        (row) =>
          row.card.enrichmentStatus === "working" &&
          Date.now() - new Date(row.card.updatedAt).getTime() < ENRICHMENT_PATIENCE,
      )
        ? 2000
        : false,
  });
export const archivedCardsQuery = queryOptions({
  queryKey: ["cards", "archived"],
  queryFn: api.archivedCards,
  staleTime: 0,
});
export const cardHistoryQuery = (cardId: string) =>
  queryOptions({
    queryKey: ["cards", cardId, "history"],
    queryFn: () => api.cardHistory(cardId),
    staleTime: 0,
  });
