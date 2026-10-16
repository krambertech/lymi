import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

// Any saved card can add a tag, so a form that opens asks again.
export const tagsQuery = queryOptions({
  queryKey: ["tags"],
  queryFn: api.tags,
  staleTime: 0,
});

export const deckTagsQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "tags"],
    queryFn: () => api.deckTags(deckId),
    staleTime: 0,
  });
