import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { fresh } from "../writes";

// Under the deck's key, so every review that refreshes the decks refreshes where the learner is.
export const sectionsQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "sections"],
    queryFn: () =>
      fresh(["decks", deckId, "sections"], () => api.sections(deckId), {
        deckId,
        empty: { sections: [], progress: null },
      }),
    staleTime: 0,
  });
export const archivedSectionsQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "sections", "archived"],
    queryFn: () => api.archivedSections(deckId),
    staleTime: 0,
  });
