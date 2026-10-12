import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { fresh } from "../writes";

/** How long a card may say it is working before the screen stops waiting on it. */
const ENRICHMENT_PATIENCE = 10 * 60_000;

export const deckCardsQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "cards"],
    queryFn: () =>
      fresh(["decks", deckId, "cards"], () => api.deckCards(deckId), { deckId, empty: [] }),
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
/** Every deck's cards matching the text, as Library's search asks for them. Never kept offline. */
export const cardSearchQuery = (query: string) =>
  queryOptions({
    queryKey: ["cards", "search", query],
    queryFn: () => api.searchCards(query),
    staleTime: 30_000,
    enabled: query.length > 0,
  });
export const archivedCardsQuery = queryOptions({
  queryKey: ["cards", "archived"],
  queryFn: () => fresh(["cards", "archived"], api.archivedCards),
  staleTime: 0,
});
/** Keyed on the card's text, so an edit that changes the term or meaning asks for a fresh draft. */
export const hookDraftQuery = (card: { id: string; term: string; meaning: string | null }) =>
  queryOptions({
    queryKey: ["cards", card.id, "hook-draft", card.term, card.meaning],
    // A draft that cannot be had is no draft: the plain placeholder, settled, not asked again.
    queryFn: async () => (await api.draftHook(card.id).catch(() => ({ hook: null }))).hook,
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
    // The server keeps the draft; a copy kept across reloads would outlive a better one.
    meta: { persist: false },
  });
export const cardHistoryQuery = (cardId: string) =>
  queryOptions({
    queryKey: ["cards", cardId, "history"],
    queryFn: () => api.cardHistory(cardId),
    staleTime: 0,
  });
