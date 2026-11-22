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
export type Card = Omit<
  CardRow,
  | "reviewModeKeys"
  | "revision"
  | "hintDraft"
  | "audioApprovedKey"
  | "exampleTranslationOf"
  | "exampleRecordingKey"
  | "exampleRecordingCaptured"
> & {
  reviewModes: ReviewMode[] | null;
  image: CardImage | null;
  important: boolean;
  exampleTranslationStale: boolean;
  exampleRecorded?: boolean | undefined;
};
export type CardState = Omit<CardStateRow, "mode" | "direction"> & {
  mode: ReviewMode;
  direction: Direction | null;
};
export type Review = Omit<ReviewRow, "mode" | "direction"> & {
  mode: ReviewMode;
  direction: Direction | null;
};
export type CardHit = Card & { deckName: string };
export type CardEvent = {
  id: string;
  actor: Card["createdBy"];
  action: string;
  at: string;
  payload: unknown;
};
export type CardHistory = { states: CardState[]; reviews: Review[]; events: CardEvent[] };
export type AddCardOutcome =
  | { status: "added"; card: Card }
  | { status: "skipped"; term: string; existing: Card; deckName: string };

export type CardSearchPage = { cards: CardHit[]; nextCursor: string | null; total: number | null };
export type CardSearch = {
  query?: string;
  term?: string;
  deckId?: string;
  cursor?: string;
  limit?: number;
};

export const KEEPALIVE_MAX_BYTES = 64 * 1024;

export function fitsKeepalive(body: string): boolean {
  return new TextEncoder().encode(body).byteLength < KEEPALIVE_MAX_BYTES;
}

const SPEECH_POLICY_VERSION = 1;

export const cardsApi = {
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
  archivedCardsPage: (cursor?: string) => {
    const params = new URLSearchParams({ archived: "true", limit: "50" });
    if (cursor) params.set("cursor", cursor);
    return request<CardSearchPage>(`/api/cards?${params.toString()}`);
  },
  deckCards: (deckId: string) =>
    request<{ card: Card; state: CardState | null }[]>(`/api/decks/${deckId}/cards`),
  addCard: (body: CardInput, from?: "desktop_panel") => {
    const json = JSON.stringify(body);
    return request<AddCardOutcome>(`/api/cards${from ? `?from=${from}` : ""}`, {
      method: "POST",
      body: json,
      keepalive: fitsKeepalive(json),
    });
  },
  chooseDeck: (body: DeckChoiceInput) =>
    request<DeckChoiceOut>("/api/cards/deck-choice", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  addCards: (body: CardsInput, from?: "lesson") =>
    request<{ results: AddCardOutcome[] }>(`/api/cards/batch${from ? `?from=${from}` : ""}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateCard: (id: string, body: CardPatch) =>
    request<Card>(`/api/cards/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  enrichCard: (id: string) => request<Card>(`/api/cards/${id}/enrich`, { method: "POST" }),
  draftHint: (id: string) =>
    request<HintDraftOut>(`/api/cards/${id}/hint-draft`, { method: "POST" }),
  cardHistory: (id: string) => request<CardHistory>(`/api/cards/${id}/history`),
  audioUrl: (cardId: string, updatedAt?: Date | string) => {
    const version =
      updatedAt instanceof Date ? updatedAt.getTime() : updatedAt ? Date.parse(updatedAt) : 0;
    return apiUrl(
      `/api/audio/${encodeURIComponent(cardId)}?v=${SPEECH_POLICY_VERSION}-${Number.isFinite(version) ? version : 0}`,
    );
  },
  exampleAudioUrl: (cardId: string, updatedAt?: Date | string) => {
    const version =
      updatedAt instanceof Date ? updatedAt.getTime() : updatedAt ? Date.parse(updatedAt) : 0;
    return apiUrl(
      `/api/audio/${encodeURIComponent(cardId)}/example?v=${SPEECH_POLICY_VERSION}-${Number.isFinite(version) ? version : 0}`,
    );
  },
  storedAudioUrl: (cardId: string, updatedAt?: Date | string): string =>
    `${cardsApi.audioUrl(cardId, updatedAt)}&stored=1`,
  uploadCardImage: (id: string, file: Blob, version: string | null, description?: string) => {
    const form = new FormData();
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
