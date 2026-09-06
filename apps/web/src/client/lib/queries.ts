import { queryOptions } from "@tanstack/react-query";
import { api } from "./api";

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: api.me,
  retry: false,
  staleTime: 5 * 60_000,
});
// Counts change with every review, so the persisted copy is only a placeholder until the refetch lands.
export const decksQuery = queryOptions({
  queryKey: ["decks"],
  queryFn: api.decks,
  staleTime: 0,
  refetchOnWindowFocus: true,
});
export const deckCardsQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "cards"],
    queryFn: () => api.deckCards(deckId),
    staleTime: 0,
  });
export const queueQuery = (deckId?: string) =>
  queryOptions({
    queryKey: ["queue", deckId ?? "all"],
    queryFn: () => api.queue(deckId),
    staleTime: 0,
  });
export const historyQuery = queryOptions({
  queryKey: ["history", 7],
  queryFn: () => api.history(7),
  staleTime: 60_000,
});
export const keysQuery = queryOptions({ queryKey: ["keys"], queryFn: api.keys, staleTime: 0 });
export const connectedAppsQuery = queryOptions({
  queryKey: ["connected-apps"],
  queryFn: api.connectedApps,
  staleTime: 0,
});
