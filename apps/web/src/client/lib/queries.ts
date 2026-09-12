import { keepPreviousData, queryOptions } from "@tanstack/react-query";
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
// Every figure here moves with a review, and nothing else invalidates this key on the way
// in, so the persisted copy is a placeholder until the refetch lands rather than fresh data.
// `placeholderData` keeps the previous period on screen while the next one loads, so
// changing the switch does not blank the four plates that did not change.
export const insightsQuery = (period: 30 | 90 | 0) =>
  queryOptions({
    queryKey: ["insights", period],
    queryFn: () => api.insights(period),
    staleTime: 0,
    refetchOnMount: "always",
    placeholderData: keepPreviousData,
  });
export const keysQuery = queryOptions({ queryKey: ["keys"], queryFn: api.keys, staleTime: 0 });
export const connectedAppsQuery = queryOptions({
  queryKey: ["connected-apps"],
  queryFn: api.connectedApps,
  staleTime: 0,
});
