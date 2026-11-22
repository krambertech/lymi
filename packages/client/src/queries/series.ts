import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export const seriesQuery = queryOptions({
  queryKey: ["series"],
  queryFn: api.series,
  staleTime: 0,
  refetchOnWindowFocus: true,
});
