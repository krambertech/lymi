import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export const readwiseQuery = queryOptions({
  queryKey: ["readwise"],
  queryFn: api.readwise,
  staleTime: 0,
});
