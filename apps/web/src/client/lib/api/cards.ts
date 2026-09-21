import type {
  CardImageImportInput,
  CardImageOut,
  CardImagePatch,
  CardInput,
  CardPatch,
  Direction,
  ReviewMode,
} from "@lymi/core";
import type {
  Card as CardRow,
  CardState as CardStateRow,
  Review as ReviewRow,
} from "@lymi/core/schema";
import { request } from "./request";

export type CardImage = CardImageOut;
/** A card as the API sends it: its own review modes or null when it follows its deck, and its picture. */
export type Card = Omit<CardRow, "reviewModeKeys" | "revision"> & {
  reviewModes: ReviewMode[] | null;
  image: CardImage | null;
};
/** `direction` is the legacy name of a text mode, and null for a picture mode. */
export type CardState = Omit<CardStateRow, "mode" | "direction"> & {
  mode: ReviewMode;
  direction: Direction | null;
};
export type Review = Omit<ReviewRow, "mode" | "direction"> & {
  mode: ReviewMode;
  direction: Direction | null;
};
/** A card a search matched, with the name of the deck it sits in. */
export type CardHit = Card & { deckName: string };
export type CardEvent = {
  id: string;
  actor: Card["createdBy"];
  action: string;
  at: string;
  payload: unknown;
};
export type CardHistory = { states: CardState[]; reviews: Review[]; events: CardEvent[] };
/** Mirrors AddCardOutcome on the server. A duplicate is skipped and names the card that exists. */
export type AddCardOutcome =
  | { status: "added"; card: Card }
  | { status: "skipped"; term: string; existing: Card; deckName: string };

export const cardsApi = {
  archivedCards: async () =>
    (await request<{ cards: CardHit[] }>("/api/cards?archived=true")).cards,
  deckCards: (deckId: string) =>
    request<{ card: Card; state: CardState | null }[]>(`/api/decks/${deckId}/cards`),
  addCard: (body: CardInput) =>
    request<AddCardOutcome>("/api/cards", { method: "POST", body: JSON.stringify(body) }),
  /** Send only the fields that changed. `deckId` moves the card to another deck. */
  updateCard: (id: string, body: CardPatch) =>
    request<Card>(`/api/cards/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  /** Ask the AI to fill the card's empty fields. Comes back working; the deck's poll watches it. */
  enrichCard: (id: string) => request<Card>(`/api/cards/${id}/enrich`, { method: "POST" }),
  /** Every review and every write, newest first. */
  cardHistory: (id: string) => request<CardHistory>(`/api/cards/${id}/history`),
  audioUrl: (cardId: string) => `/api/audio/${encodeURIComponent(cardId)}`,
  /** `version` is the card's `imageVersion` as last read; null expects a card with no picture yet. */
  uploadCardImage: (id: string, file: Blob, version: string | null, description?: string) => {
    const form = new FormData();
    form.set("file", file);
    form.set("version", version ?? "");
    if (description) form.set("description", description);
    return request<Card>(`/api/cards/${id}/image`, { method: "PUT", body: form });
  },
  importCardImage: (id: string, body: CardImageImportInput) =>
    request<Card>(`/api/cards/${id}/image/import`, { method: "POST", body: JSON.stringify(body) }),
  describeCardImage: (id: string, body: CardImagePatch) =>
    request<Card>(`/api/cards/${id}/image`, { method: "PATCH", body: JSON.stringify(body) }),
  archiveCardImage: (id: string, version: string | null) =>
    request<Card>(`/api/cards/${id}/image/archive`, {
      method: "POST",
      body: JSON.stringify({ version }),
    }),
  archiveCard: (id: string) =>
    request<{ ok: true }>(`/api/cards/${id}/archive`, { method: "POST" }),
  restoreCard: (id: string) =>
    request<{ ok: true }>(`/api/cards/${id}/restore`, { method: "POST" }),
};
