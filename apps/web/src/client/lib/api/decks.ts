import type { DeckInput, MemberRole, ReviewMode } from "@lymi/core";
import type { Deck as DeckRow } from "@lymi/core/schema";
import { request } from "./request";

/** A deck as the API sends it. `revision` is the server's own bookkeeping for editions. */
export type Deck = Omit<DeckRow, "revision">;

export type DeckSummary = Pick<
  Deck,
  | "id"
  | "name"
  | "description"
  | "defaultLanguage"
  | "directions"
  | "position"
  | "seriesId"
  | "sectionProgression"
> & {
  reviewModes: ReviewMode[];
  total: number;
  due: number;
  /** When the deck was archived, null while it is active. */
  archivedAt: string | null;
  /** The learner's role in the deck and who owns it. Only the owner writes. ADR 0011. */
  role: MemberRole;
  /** `avatarUrl` is the publisher's photo, which only a published deck has. */
  owner: { id: string; name: string; avatarUrl: string | null };
  /** True while the deck is published, which makes its owner its publisher. */
  published: boolean;
};

export const decksApi = {
  decks: () => request<DeckSummary[]>("/api/decks"),
  archivedDecks: () => request<DeckSummary[]>("/api/decks?archived=true"),
  createDeck: (body: DeckInput) =>
    request<Deck>("/api/decks", { method: "POST", body: JSON.stringify(body) }),
  updateDeck: (id: string, body: { [K in keyof DeckInput]?: DeckInput[K] | undefined }) =>
    request<Deck>(`/api/decks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  archiveDeck: (id: string) =>
    request<{ ok: true }>(`/api/decks/${id}/archive`, { method: "POST" }),
  restoreDeck: (id: string) =>
    request<{ ok: true }>(`/api/decks/${id}/restore`, { method: "POST" }),
  leaveDeck: (id: string) => request<{ ok: true }>(`/api/decks/${id}/leave`, { method: "POST" }),
};
