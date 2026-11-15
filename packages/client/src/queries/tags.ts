import { type QueryClient, queryOptions } from "@tanstack/react-query";
import { api, type DeckTags } from "../api";

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

/** After a rename, archive or restore: the reply is the deck's tags now, and its cards' chips, every tag list and Activity follow. */
export function settleDeckTags(qc: QueryClient, deckId: string, next: DeckTags) {
  qc.setQueryData(deckTagsQuery(deckId).queryKey, next);
  return Promise.all([
    qc.invalidateQueries({ queryKey: ["decks", deckId, "cards"] }),
    qc.invalidateQueries({ queryKey: ["tags"] }),
    qc.invalidateQueries({ queryKey: ["activity"] }),
  ]);
}
