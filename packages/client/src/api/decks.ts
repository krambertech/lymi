import type {
  DeckEnrichField,
  DeckInput,
  DeckPreferencesInput,
  DeckPurpose,
  FrontPronunciation,
  MemberRole,
  ReviewMode,
} from "@lymi/core";
import type { Deck as DeckRow } from "@lymi/core/schema";
import { request } from "./request";

/** A deck as the API sends it. `revision` and `enrichStyleAt` are the server's own bookkeeping. */
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
  /** What the deck is for, inferred from its language until the owner chooses. Null for a member. */
  purpose: DeckPurpose | null;
  /** What the AI may fill on the deck's cards, with the default already applied. */
  enrichFields: DeckEnrichField[];
  /** The owner's instructions to the AI. Null for a member. */
  enrichInstructions: string | null;
  /** What the AI learned from the owner's cards. Null for a member; a cache from before it lacks it. */
  enrichStyle?: string | null;
  /** The learner's own choice for the front of a card. A cache from before it lacks it, which reads as until-known. */
  frontPronunciation?: FrontPronunciation;
  total: number;
  due: number;
  /** When the deck was archived, null while it is active. */
  archivedAt: string | null;
  /** The learner's role in the deck and who owns it. Only the owner writes. ADR 0011. */
  role: MemberRole;
  /**
   * `avatarUrl` is the publisher's photo, which only a published deck has. `former` marks a deck
   * kept for its members after its owner deleted their account; a cache from before it lacks it.
   */
  owner: { id: string; name: string; avatarUrl: string | null; former?: boolean };
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
  setDeckPreferences: (id: string, body: DeckPreferencesInput) =>
    request<Deck>(`/api/decks/${id}/preferences`, { method: "PUT", body: JSON.stringify(body) }),
  archiveDeck: (id: string) =>
    request<{ ok: true }>(`/api/decks/${id}/archive`, { method: "POST" }),
  restoreDeck: (id: string) =>
    request<{ ok: true }>(`/api/decks/${id}/restore`, { method: "POST" }),
  leaveDeck: (id: string) => request<{ ok: true }>(`/api/decks/${id}/leave`, { method: "POST" }),
};
