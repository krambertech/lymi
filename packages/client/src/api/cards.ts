import type {
  ArchiveCardsOut,
  CardEditInput,
  CardImageImportInput,
  CardImageOut,
  CardImagePatch,
  CardInput,
  CardPatch,
  CardsInput,
  DeckChoiceInput,
  DeckChoiceOut,
  Direction,
  HintDraftOut,
  ImportantCardsOut,
  ReviewMode,
  TerseCardsOut,
} from "@lymi/core";
import type {
  Card as CardRow,
  CardState as CardStateRow,
  Review as ReviewRow,
} from "@lymi/core/schema";
import { inCalls } from "./in-calls";
import { apiUrl, request } from "./request";

export type CardImage = CardImageOut;
/** A card as the API sends it: its own review modes or null when it follows its deck, and its picture. */
export type Card = Omit<
  CardRow,
  | "reviewModeKeys"
  | "revision"
  | "hintDraft"
  | "audioApprovedKey"
  | "exampleTranslationOf"
  | "exampleRecordingKey"
> & {
  reviewModes: ReviewMode[] | null;
  image: CardImage | null;
  /** The learner's own mark, never another member's. */
  important: boolean;
  /** The translation was written for an earlier example; review leaves it out. */
  exampleTranslationStale: boolean;
  /** The example has an imported recording, which plays even without a language. */
  exampleRecorded?: boolean | undefined;
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
export type CardSearch = {
  query?: string;
  /** The card with exactly this term, compared as the duplicate rule compares it. */
  term?: string;
  deckId?: string;
  cursor?: string;
  limit?: number;
};

/** Browsers refuse a kept-alive request whose body passes 64 KB, so a larger one is sent plainly. */
export const KEEPALIVE_MAX_BYTES = 64 * 1024;

export function fitsKeepalive(body: string): boolean {
  return new TextEncoder().encode(body).byteLength < KEEPALIVE_MAX_BYTES;
}

export const cardsApi = {
  /** One page of the cards matching the text, in every deck or in `deckId`; `cursor` is the last page's `nextCursor`. */
  searchCards: ({ query, term, deckId, cursor, limit = 50 }: CardSearch) => {
    const params = new URLSearchParams({ limit: String(limit) });
    if (query) params.set("query", query);
    if (term) params.set("term", term);
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
  /** `from` labels analytics only: the Mac app's quick-add panel. */
  addCard: (body: CardInput, from?: "desktop_panel") => {
    const json = JSON.stringify(body);
    // Kept alive, the add still lands when the page reloads or navigates away mid-send.
    return request<AddCardOutcome>(`/api/cards${from ? `?from=${from}` : ""}`, {
      method: "POST",
      body: json,
      keepalive: fitsKeepalive(json),
    });
  },
  /** The learner's deck in the term's language; null keeps the caller's choice. Writes nothing. */
  chooseDeck: (body: DeckChoiceInput) =>
    request<DeckChoiceOut>("/api/cards/deck-choice", {
      method: "POST",
      body: JSON.stringify(body),
    }),
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
  /** The AI's draft for the card's hint, kept on the server until the card's text changes. */
  draftHint: (id: string) =>
    request<HintDraftOut>(`/api/cards/${id}/hint-draft`, { method: "POST" }),
  /** Every review and every write, newest first. */
  cardHistory: (id: string) => request<CardHistory>(`/api/cards/${id}/history`),
  // Bump the request version when a speech policy changes without a card edit.
  audioUrl: (cardId: string, updatedAt?: Date | string) => {
    const version =
      updatedAt instanceof Date ? updatedAt.getTime() : updatedAt ? Date.parse(updatedAt) : 0;
    return apiUrl(
      `/api/audio/${encodeURIComponent(cardId)}?v=1-${Number.isFinite(version) ? version : 0}`,
    );
  },
  /** The card's example read aloud, made on the first play; an edit's new `updatedAt` asks again. */
  exampleAudioUrl: (cardId: string, updatedAt?: Date | string) => {
    const version =
      updatedAt instanceof Date ? updatedAt.getTime() : updatedAt ? Date.parse(updatedAt) : 0;
    return apiUrl(
      `/api/audio/${encodeURIComponent(cardId)}/example?v=1-${Number.isFinite(version) ? version : 0}`,
    );
  },
  /** A clip already voiced, or a 404: a preload never spends on speech. */
  storedAudioUrl: (cardId: string, updatedAt?: Date | string): string =>
    `${cardsApi.audioUrl(cardId, updatedAt)}&stored=1`,
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
  /** Each card succeeds or fails on its own; a selection past one call's limit goes in several. */
  archiveCards: (cardIds: string[]) =>
    inCalls(cardIds, String, (chunk) =>
      request<ArchiveCardsOut>("/api/cards/archive", {
        method: "POST",
        body: JSON.stringify({ cardIds: chunk }),
      }),
    ),
  restoreCards: (cardIds: string[]) =>
    inCalls(cardIds, String, (chunk) =>
      request<ArchiveCardsOut>("/api/cards/restore", {
        method: "POST",
        body: JSON.stringify({ cardIds: chunk }),
      }),
    ),
  editCards: (cards: CardEditInput[]) =>
    inCalls(
      cards,
      (card) => card.cardId,
      (chunk) =>
        request<TerseCardsOut>("/api/cards/batch?response=terse", {
          method: "PATCH",
          body: JSON.stringify({ cards: chunk }),
        }),
    ),
  /** Each card's own mark. */
  setCardsImportant: (cards: { cardId: string; important: boolean }[]) =>
    inCalls(
      cards,
      (card) => card.cardId,
      (chunk) =>
        request<ImportantCardsOut>("/api/cards/important", {
          method: "POST",
          body: JSON.stringify({ cards: chunk }),
        }),
    ),
  setCardImportant: (id: string, important: boolean) =>
    request<Card>(`/api/cards/${id}/important`, {
      method: "PUT",
      body: JSON.stringify({ important }),
    }),
};
