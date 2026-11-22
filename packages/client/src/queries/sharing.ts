import { queryOptions } from "@tanstack/react-query";
import { api } from "../api";

export const joinLinkQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "join-link"],
    queryFn: () => api.joinLink(deckId),
    staleTime: 0,
    meta: { persist: false },
  });
export const membersQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "members"],
    queryFn: () => api.members(deckId),
    staleTime: 0,
    meta: { persist: false },
  });
export const invitationsQuery = (deckId: string) =>
  queryOptions({
    queryKey: ["decks", deckId, "invitations"],
    queryFn: () => api.invitations(deckId),
    staleTime: 0,
    meta: { persist: false },
  });
export const joinPreviewQuery = (token: string) =>
  queryOptions({
    queryKey: ["join", token],
    queryFn: () => api.joinPreview(token),
    staleTime: 0,
    retry: false,
    meta: { persist: false },
  });
