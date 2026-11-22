import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { fresh } from "../writes";

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
