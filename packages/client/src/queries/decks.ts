import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";
import { fresh } from "../writes";

export const decksQuery = queryOptions({
  queryKey: ["decks"],
  queryFn: () => fresh(["decks"], api.decks),
  staleTime: 0,
  refetchOnWindowFocus: true,
});
export const archivedDecksQuery = queryOptions({
  queryKey: ["decks", "archived"],
  queryFn: () => fresh(["decks", "archived"], api.archivedDecks),
  staleTime: 0,
});
