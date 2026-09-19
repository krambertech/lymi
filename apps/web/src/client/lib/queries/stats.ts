import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "../api";

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
