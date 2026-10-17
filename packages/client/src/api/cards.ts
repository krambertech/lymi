import type {
  ArchiveCardsOut,
  CardEditInput,
  CardImageImportInput,
  CardImageOut,
  CardImagePatch,
  CardInput,
  CardPatch,
  CardsInput,
  Direction,
  HookDraftOut,
  ImportantCardsOut,
  ReviewMode,
  TerseCardsOut,
} from "@lymi/core";
import type {
  Card as CardRow,
  CardState as CardStateRow,
  Review as ReviewRow,
} from "@lymi/core/schema";
import { apiUrl, request } from "./request";

export type CardImage = CardImageOut;
/** A card as the API sends it: its own review modes or null when it follows its deck, and its picture. */
export type Card = Omit<CardRow, "reviewModeKeys" | "revision" | "hookDraft"> & {
  reviewModes: ReviewMode[] | null;
  image: CardImage | null;
  /** The learner's own mark, never another member's. */
  important: boolean;
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

/** One page of a search, newest first. `total` is null when it is not known exactly. */
export type CardSearchPage = { cards: CardHit[]; nextCursor: string | null; total: number | null };
export type CardSearch = { query: string; deckId?: string; cursor?: string; limit?: number };

/** Browsers refuse a kept-alive request whose body passes 64 KB, so a larger one is sent plainly. */
export const KEEPALIVE_MAX_BYTES = 64 * 1024;

export function fitsKeepalive(body: string): boolean {
  return new TextEncoder().encode(body).byteLength < KEEPALIVE_MAX_BYTES;
}

export const cardsApi = {
  /** One page of the cards matching the text, in every deck or in `deckId`; `cursor` is the last page's `nextCursor`. */
  searchCards: ({ query, deckId, cursor, limit = 50 }: CardSearch) => {
    const params = new URLSearchParams({ query, limit: String(limit) });
    if (deckId) params.set("deckId", deckId);
    if (cursor) params.set("cursor", cursor);
    return request<CardSearchPage>(`/api/cards?${params.toString()}`);
  },
  archivedCards: async () =>
    (await request<{ cards: CardHit[] }>("/api/cards?archived=true")).cards,
  /** One page of archived cards, newest first; `cursor` is the last page's `nextCursor`. */
  archivedCardsPage: (cursor?: string) => {
    const params = new URLSearchParams({ archived: "true", limit: "50" });
    if (cursor) params.set("cursor", cursor);
    return request<CardSearchPage>(`/api/cards?${params.toString()}`);
  },
  deckCards: (deckId: string) =>
    request<{ card: Card; state: CardState | null }[]>(`/api/decks/${deckId}/cards`),
  addCard: (body: CardInput) => {
    const json = JSON.stringify(body);
    // Kept alive, the add still lands when the page reloads or navigates away mid-send.
    return request<AddCardOutcome>("/api/cards", {
      method: "POST",
      body: json,
      keepalive: fitsKeepalive(json),
    });
  },
  /** Many cards in one write; each is added or skipped on its own. */
  addCards: (body: CardsInput, from?: "lesson") =>
    request<{ results: AddCardOutcome[] }>(`/api/cards/batch${from ? `?from=${from}` : ""}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  /** Send only the fields that changed. `deckId` moves the card to another deck. */
  updateCard: (id: string, body: CardPatch) =>
    request<Card>(`/api/cards/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  /** Ask the AI to fill the card's empty fields. Comes back working; the deck's poll watches it. */
  enrichCard: (id: string) => request<Card>(`/api/cards/${id}/enrich`, { method: "POST" }),
  /** The AI's draft for the card's memory hook, kept on the server until the card's text changes. */
  draftHook: (id: string) =>
    request<HookDraftOut>(`/api/cards/${id}/hook-draft`, { method: "POST" }),
  /** Every review and every write, newest first. */
  cardHistory: (id: string) => request<CardHistory>(`/api/cards/${id}/history`),
  audioUrl: (cardId: string) => apiUrl(`/api/audio/${encodeURIComponent(cardId)}`),
  /**
   * `version` is the card's `imageVersion` as last read; null expects a card with no picture yet.
   * The phone passes an Expo `File`, whose bytes Expo's fetch can read, not React Native's `{ uri }`.
   */
  uploadCardImage: (id: string, file: Blob, version: string | null, description?: string) => {
    const form = new FormData();
    // `append`, not `set`: React Native's FormData has no `set`, and each name is sent once.
    form.append("file", file);
    form.append("version", version ?? "");
    if (description) form.append("description", description);
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
  /** Up to 200 cards at once; each succeeds or fails on its own. */
  archiveCards: (cardIds: string[]) =>
    request<ArchiveCardsOut>("/api/cards/archive", {
      method: "POST",
      body: JSON.stringify({ cardIds }),
    }),
  restoreCards: (cardIds: string[]) =>
    request<ArchiveCardsOut>("/api/cards/restore", {
      method: "POST",
      body: JSON.stringify({ cardIds }),
    }),
  editCards: (cards: CardEditInput[]) =>
    request<TerseCardsOut>("/api/cards/batch?response=terse", {
      method: "PATCH",
      body: JSON.stringify({ cards }),
    }),
  /** Each card's own mark, in one call of up to 200. */
  setCardsImportant: (cards: { cardId: string; important: boolean }[]) =>
    request<ImportantCardsOut>("/api/cards/important", {
      method: "POST",
      body: JSON.stringify({ cards }),
    }),
  setCardImportant: (id: string, important: boolean) =>
    request<Card>(`/api/cards/${id}/important`, {
      method: "PUT",
      body: JSON.stringify({ important }),
    }),
};
