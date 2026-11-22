import type { Round } from "@lymi/core";
import { queryOptions } from "@tanstack/react-query";
import { api, type ReviewScope, scopeKey } from "../api";
import { flushOutbox } from "../grades";
import { fresh } from "../writes";

export const queueQuery = (scope: ReviewScope, round?: Round, cards?: readonly string[]) => {
  const key = ["queue", scopeKey(scope), round ?? (cards ? `cards:${cards.join(",")}` : "order")];
  return queryOptions({
    queryKey: key,
    queryFn: () =>
      fresh(key, async () => {
        await flushOutbox();
        return api.queue(scope, round, cards);
      }),
    staleTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
};
export const drawQuery = (scope: ReviewScope) =>
  queryOptions({
    queryKey: ["queue", scopeKey(scope), "draw"],
    queryFn: () =>
      fresh(["queue", scopeKey(scope), "draw"], async () => {
        const fetchedAt = Date.now();
        return { ...(await api.draw(scope)), fetchedAt };
      }),
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
export const roundsQuery = queryOptions({
  queryKey: ["rounds"],
  queryFn: () => fresh(["rounds"], api.rounds),
  staleTime: 0,
});
