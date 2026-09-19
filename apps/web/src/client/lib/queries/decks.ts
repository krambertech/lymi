import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

// Counts change with every review, so the persisted copy is only a placeholder until the refetch lands.
export const decksQuery = queryOptions({
  queryKey: ["decks"],
  queryFn: api.decks,
  staleTime: 0,
  refetchOnWindowFocus: true,
});
export const archivedDecksQuery = queryOptions({
  queryKey: ["decks", "archived"],
  queryFn: api.archivedDecks,
  staleTime: 0,
});
