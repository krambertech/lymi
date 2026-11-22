import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export const addPreviewQuery = (slug: string) =>
  queryOptions({
    queryKey: ["add", slug],
    queryFn: () => api.addPreview(slug),
    staleTime: 0,
    retry: false,
    meta: { persist: false },
  });
export const exploreQuery = queryOptions({
  queryKey: ["explore"],
  queryFn: api.explore,
  staleTime: 5 * 60_000,
  meta: { persist: false },
});
export const exploreDeckQuery = (slug: string) =>
  queryOptions({
    queryKey: ["explore", slug],
    queryFn: () => api.exploreDeck(slug),
    staleTime: 5 * 60_000,
    retry: false,
    meta: { persist: false },
  });
