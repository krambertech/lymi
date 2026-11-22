import type {
  DeckEnrichField,
  DeckInput,
  DeckPreferencesInput,
  DeckPurpose,
  MemberRole,
  PronunciationDisplay,
  ReviewMode,
} from "@lymi/core";
import type { Deck as DeckRow } from "@lymi/core/schema";
import { request } from "./request";

export type Deck = Omit<DeckRow, "revision" | "enrichStyleAt">;

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
  purpose: DeckPurpose | null;
  enrichFields: DeckEnrichField[];
  enrichInstructions: string | null;
  enrichStyle?: string | null;
  pronunciationDisplay?: PronunciationDisplay;
  total: number;
  due: number;
  archivedAt: string | null;
  role: MemberRole;
  owner: { id: string; name: string; avatarUrl: string | null; former?: boolean };
  published: boolean;
};

export const decksApi = {
  decks: () => request<DeckSummary[]>("/api/decks"),
  archivedDecks: () => request<DeckSummary[]>("/api/decks?archived=true"),
  createDeck: (body: DeckInput) =>
    request<Deck>("/api/decks", { method: "POST", body: JSON.stringify(body) }),
  updateDeck: (id: string, body: { [K in keyof DeckInput]?: DeckInput[K] | undefined }) =>
    request<Deck>(`/api/decks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  setDeckPreferences: (id: string, body: DeckPreferencesInput) =>
    request<Deck>(`/api/decks/${id}/preferences`, { method: "PUT", body: JSON.stringify(body) }),
  archiveDeck: (id: string) =>
    request<{ ok: true }>(`/api/decks/${id}/archive`, { method: "POST" }),
  restoreDeck: (id: string) =>
    request<{ ok: true }>(`/api/decks/${id}/restore`, { method: "POST" }),
  leaveDeck: (id: string) => request<{ ok: true }>(`/api/decks/${id}/leave`, { method: "POST" }),
};
