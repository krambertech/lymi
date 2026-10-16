import type { DeckTagRef, DeckTagRename, DeckTagsOut, TagOut } from "@lymi/core";
import { request } from "./request";

/** A tag on cards the learner studies, with how many carry it. */
export type Tag = TagOut;

/** A deck's tags and those archived from it. */
export type DeckTags = DeckTagsOut;

const post = (deckId: string, action: string, body: DeckTagRef | DeckTagRename) =>
  request<DeckTags>(`/api/decks/${deckId}/tags/${action}`, {
    method: "POST",
    body: JSON.stringify(body),
  });

export const tagsApi = {
  tags: () => request<Tag[]>("/api/tags"),
  deckTags: (deckId: string) => request<DeckTags>(`/api/decks/${deckId}/tags`),
  renameDeckTag: (deckId: string, body: DeckTagRename) => post(deckId, "rename", body),
  archiveDeckTag: (deckId: string, body: DeckTagRef) => post(deckId, "archive", body),
  restoreDeckTag: (deckId: string, body: DeckTagRef) => post(deckId, "restore", body),
};
