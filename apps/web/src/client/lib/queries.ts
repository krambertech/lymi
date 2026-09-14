import type { Round } from "@lymi/core";
import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "./api";

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: api.me,
  retry: false,
  staleTime: 5 * 60_000,
});
export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: api.settings,
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
/** Join links are capabilities, so neither query is written to the persisted cache. */
export const joinLinkQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "join-link"],
    queryFn: () => api.joinLink(deckId),
    staleTime: 0,
    meta: { persist: false },
  });
export const joinPreviewQuery = (token: string) =>
  queryOptions({
    queryKey: ["join", token],
    queryFn: () => api.joinPreview(token),
    staleTime: 0,
    retry: false,
    meta: { persist: false },
  });
export const cardHistoryQuery = (cardId: string) =>
  queryOptions({
    queryKey: ["cards", cardId, "history"],
    queryFn: () => api.cardHistory(cardId),
    staleTime: 0,
  });
export const queueQuery = (deckId?: string, round?: Round) =>
  queryOptions({
    queryKey: ["queue", deckId ?? "all", round ?? "order"],
    queryFn: () => api.queue(deckId, round),
    staleTime: 0,
    // A review keeps its initial order; a new mount still fetches a freshly shuffled queue.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
/** What the review draws from, stamped with when the request began so an empty draw can be confirmed. */
export const drawQuery = (deckId?: string) =>
  queryOptions({
    queryKey: ["queue", deckId ?? "all", "draw"],
    queryFn: async () => {
      const fetchedAt = Date.now();
      return { ...(await api.draw(deckId)), fetchedAt };
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
/** How many cards each Today round holds. A review invalidates it with the decks. */
export const roundsQuery = queryOptions({
  queryKey: ["rounds"],
  queryFn: api.rounds,
  staleTime: 0,
});
/** The flame in the chrome and the panel behind it. A review invalidates it on the way out. */
export const streakQuery = queryOptions({
  queryKey: ["streak"],
  queryFn: api.streak,
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
