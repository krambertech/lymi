import type { DeckFilterQuery, Round } from "@lymi/core";
import { queryOptions } from "@tanstack/react-query";
import { api, type ReviewScope, scopeKey } from "../api";
import { flushOutbox } from "../grades";
import { fresh } from "../writes";

export const queueQuery = (scope: ReviewScope, round?: Round, filter?: DeckFilterQuery) => {
  const key = [
    "queue",
    scopeKey(scope),
    round ?? (filter ? `filter:${JSON.stringify(filter)}` : "order"),
  ];
  return queryOptions({
    queryKey: key,
    // The server chooses a round's cards, so grades still on their way land first.
    queryFn: () =>
      fresh(key, async () => {
        await flushOutbox();
        return api.queue(scope, round, filter);
      }),
    staleTime: 0,
    // A review keeps its initial order; a new mount still fetches a freshly shuffled queue.
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
/** What the review draws from, stamped with when the request began so an empty draw can be confirmed. */
export const drawQuery = (scope: ReviewScope) =>
  queryOptions({
    queryKey: ["queue", scopeKey(scope), "draw"],
    // Card writes still on the device lie over it, so a review reopened offline reads as they will.
    queryFn: () =>
      fresh(["queue", scopeKey(scope), "draw"], async () => {
        const fetchedAt = Date.now();
        return { ...(await api.draw(scope)), fetchedAt };
      }),
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
