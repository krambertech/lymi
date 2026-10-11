import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

// Series counts move with every review, like the decks they add up from.
export const seriesQuery = queryOptions({
  queryKey: ["series"],
  queryFn: api.series,
  staleTime: 0,
  refetchOnWindowFocus: true,
});
