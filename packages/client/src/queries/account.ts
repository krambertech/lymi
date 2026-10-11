import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export const meQuery = queryOptions({
  queryKey: ["me"],
  queryFn: api.me,
  retry: false,
  staleTime: 5 * 60_000,
});
