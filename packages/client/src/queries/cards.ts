import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { api, type CardSearchPage } from "../api";
import { fresh } from "../writes";

/** How long a card may say it is working before the screen stops waiting on it. */
const ENRICHMENT_PATIENCE = 10 * 60_000;

export const deckCardsQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "cards"],
    queryFn: () =>
      fresh(["decks", deckId, "cards"], () => api.deckCards(deckId), { deckId, empty: [] }),
    staleTime: 0,
    // While the AI is filling or translating a card, keep asking so its shimmer resolves without a reload.
    // A run settles itself, so a card still working long after its add is a server that stopped
    // answering rather than one still thinking: stop asking rather than poll for ever.
    refetchInterval: (query) =>
      query.state.data?.some(
        (row) =>
          (row.card.enrichmentStatus === "working" ||
            row.card.exampleTranslationStatus === "working") &&
          Date.now() - new Date(row.card.updatedAt).getTime() < ENRICHMENT_PATIENCE,
      )
        ? 2000
        : false,
  });
/**
 * Cards matching the text, in every deck or in one, a page at a time. A page can be short or even
 * empty while there is more, so the next page follows the cursor rather than the page's length.
 */
export const cardSearchQuery = (query: string, deckId?: string) =>
  infiniteQueryOptions({
    queryKey: ["cards", "search", deckId ?? "", query],
    queryFn: ({ pageParam }) =>
      api.searchCards({
        query,
        ...(deckId ? { deckId } : {}),
        ...(pageParam ? { cursor: pageParam } : {}),
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last: CardSearchPage) => last.nextCursor ?? undefined,
    // What was searched for and what came back stay off the device.
    meta: { persist: false },
    staleTime: 30_000,
    enabled: query.length > 0,
  });
/** The card in one deck with exactly this term, as the duplicate rule compares it, or none. */
export const cardTermQuery = (deckId: string, term: string) =>
  queryOptions({
    queryKey: ["cards", "search", "term", deckId, term],
    queryFn: async () => (await api.searchCards({ term, deckId, limit: 1 })).cards[0] ?? null,
    meta: { persist: false },
    staleTime: 30_000,
    enabled: term.length > 0,
  });
/** Every archived card, a page at a time, for a screen that shows Show more. */
export const archivedCardPagesQuery = infiniteQueryOptions({
  queryKey: ["cards", "archived", "pages"],
  // Each page is fetched through the write outbox, so a waiting archive or restore lies over it.
  queryFn: ({ pageParam }) =>
    fresh(["cards", "archived", "pages", pageParam ? "next" : "first"], () =>
      api.archivedCardsPage(pageParam),
    ),
  initialPageParam: undefined as string | undefined,
  getNextPageParam: (last: CardSearchPage) => last.nextCursor ?? undefined,
  staleTime: 0,
});
export const archivedCardsQuery = queryOptions({
  queryKey: ["cards", "archived"],
  queryFn: () => fresh(["cards", "archived"], api.archivedCards),
  staleTime: 0,
});
export const cardHistoryQuery = (cardId: string) =>
  queryOptions({
    queryKey: ["cards", cardId, "history"],
    queryFn: () => api.cardHistory(cardId),
    staleTime: 0,
  });
