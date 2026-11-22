import { keepPreviousData, queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export const streakQuery = queryOptions({
  queryKey: ["streak"],
  queryFn: api.streak,
  staleTime: 60_000,
});
export const insightsQuery = (period: 30 | 90 | 0) =>
  queryOptions({
    queryKey: ["insights", period],
    queryFn: () => api.insights(period),
    staleTime: 0,
    refetchOnMount: "always",
    placeholderData: keepPreviousData,
  });
