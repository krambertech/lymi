import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

// Under the deck's key, so every review that refreshes the decks refreshes where the learner is.
export const sectionsQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "sections"],
    queryFn: () => api.sections(deckId),
    staleTime: 0,
  });
export const archivedSectionsQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "sections", "archived"],
    queryFn: () => api.archivedSections(deckId),
    staleTime: 0,
  });
