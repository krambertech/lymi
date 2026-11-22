import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import { api, type CardSearchPage } from "../api";
import { fresh } from "../writes";

const ENRICHMENT_PATIENCE = 10 * 60_000;

export const deckCardsQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "cards"],
    queryFn: () =>
      fresh(["decks", deckId, "cards"], () => api.deckCards(deckId), { deckId, empty: [] }),
    staleTime: 0,
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
    meta: { persist: false },
    staleTime: 30_000,
    enabled: query.length > 0,
  });
export const cardTermQuery = (deckId: string, term: string) =>
  queryOptions({
    queryKey: ["cards", "search", "term", deckId, term],
    queryFn: async () => (await api.searchCards({ term, deckId, limit: 1 })).cards[0] ?? null,
    meta: { persist: false },
    staleTime: 30_000,
    enabled: term.length > 0,
  });
export const archivedCardPagesQuery = infiniteQueryOptions({
  queryKey: ["cards", "archived", "pages"],
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
