import type { Round } from "@lymi/core";
import { queryOptions } from "@tanstack/react-query";
import { api, type ReviewScope, scopeKey } from "../api";
import { flushOutbox } from "../grades";

export const queueQuery = (scope: ReviewScope, round?: Round) =>
  queryOptions({
    queryKey: ["queue", scopeKey(scope), round ?? "order"],
    // The server chooses a round's cards, so grades still on their way land first.
    queryFn: async () => {
      await flushOutbox();
      return api.queue(scope, round);
    },
    staleTime: 0,
    // A review keeps its initial order; a new mount still fetches a freshly shuffled queue.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
/** What the review draws from, stamped with when the request began so an empty draw can be confirmed. */
export const drawQuery = (scope: ReviewScope) =>
  queryOptions({
    queryKey: ["queue", scopeKey(scope), "draw"],
    queryFn: async () => {
      const fetchedAt = Date.now();
      return { ...(await api.draw(scope)), fetchedAt };
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
/** How many cards each Today round holds. A review invalidates it with the decks. */
export const roundsQuery = queryOptions({
  queryKey: ["rounds"],
  queryFn: async () => {
    await flushOutbox();
    return api.rounds();
  },
  staleTime: 0,
});
