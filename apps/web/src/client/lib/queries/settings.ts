import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export const settingsQuery = queryOptions({
  queryKey: ["settings"],
  queryFn: api.settings,
  staleTime: 5 * 60_000,
});
