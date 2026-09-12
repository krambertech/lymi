import { t } from "@lingui/core/macro";
import type {
  ApiKeyInput,
  AppLanguage,
  CardInput,
  CardPatch,
  DeckInput,
  Direction,
  GradeInput,
  InsightsOut,
  PushEndpointInput,
  PushSubscriptionInput,
  Rating,
  ReminderTime,
  Scope,
} from "@lymi/core";
import type { Card, CardState, Deck, Review } from "@lymi/core/schema";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    credentials: "include",
  });
  if (res.status === 401) throw new ApiError(401, t`Sign in required`);
  if (!res.ok) {
    // The browser's status text is English whatever the interface language, and empty over HTTP/2.
    let message = t`Something went wrong (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {}
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export type Me = { id: string; name: string; email: string; image: string | null };
export type Settings = {
  userId: string;
  appLanguage: AppLanguage | null;
  meaningLanguage: string;
  createdAt: string;
  updatedAt: string;
};
export type DeckSummary = Pick<
  Deck,
  "id" | "name" | "description" | "defaultLanguage" | "directions" | "position"
> & {
  total: number;
  due: number;
};
export type QueueItem = {
  card: Card;
  direction: Direction;
  stateId: string;
  fsrsState: number;
  next: Record<Rating, string>;
};
export type Queue = { total: number; items: QueueItem[] };
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

export type ApiKeySummary = {
  id: string;
  name: string | null;
  start: string | null;
  scope: Scope;
  lastRequest: string | null;
  createdAt: string;
};
/** Only the create response carries the plain key. */
export type ApiKeyCreated = ApiKeySummary & { key: string };

/** An MCP client the learner let in on the consent screen. */
export type ConnectedApp = {
  id: string;
  clientId: string;
  name: string | null;
  scope: Scope;
  createdAt: string;
  updatedAt: string;
};

export type PushSubscriptionStatus = {
  enabled: boolean;
  reminderTime: ReminderTime | null;
  timezone: string | null;
};

export const api = {
  me: () => request<Me>("/api/me"),
  settings: () => request<Settings>("/api/settings"),
  updateSettings: (body: { appLanguage: AppLanguage }) =>
    request<Settings>("/api/settings", { method: "PATCH", body: JSON.stringify(body) }),
  decks: () => request<DeckSummary[]>("/api/decks"),
  createDeck: (body: DeckInput) =>
    request<Deck>("/api/decks", { method: "POST", body: JSON.stringify(body) }),
  updateDeck: (id: string, body: { [K in keyof DeckInput]?: DeckInput[K] | undefined }) =>
    request<Deck>(`/api/decks/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  archiveDeck: (id: string) =>
    request<{ ok: true }>(`/api/decks/${id}/archive`, { method: "POST" }),
  restoreDeck: (id: string) =>
    request<{ ok: true }>(`/api/decks/${id}/restore`, { method: "POST" }),
  deckCards: (deckId: string) =>
    request<{ card: Card; state: CardState | null }[]>(`/api/decks/${deckId}/cards`),
  addCard: (body: CardInput) =>
    request<AddCardOutcome>("/api/cards", { method: "POST", body: JSON.stringify(body) }),
  /** Send only the fields that changed. `deckId` moves the card to another deck. */
  updateCard: (id: string, body: CardPatch) =>
    request<Card>(`/api/cards/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  /** Every review and every write, newest first. */
  cardHistory: (id: string) => request<CardHistory>(`/api/cards/${id}/history`),
  audioUrl: (cardId: string) => `/api/audio/${encodeURIComponent(cardId)}`,
  archiveCard: (id: string) =>
    request<{ ok: true }>(`/api/cards/${id}/archive`, { method: "POST" }),
  restoreCard: (id: string) =>
    request<{ ok: true }>(`/api/cards/${id}/restore`, { method: "POST" }),
  keys: () => request<ApiKeySummary[]>("/api/keys"),
  createKey: (body: ApiKeyInput) =>
    request<ApiKeyCreated>("/api/keys", { method: "POST", body: JSON.stringify(body) }),
  revokeKey: (id: string) => request<{ ok: true }>(`/api/keys/${id}`, { method: "DELETE" }),
  connectedApps: () => request<ConnectedApp[]>("/api/connected-apps"),
  disconnect: (id: string) =>
    request<{ ok: true }>(`/api/connected-apps/${id}`, { method: "DELETE" }),
  pushConfig: () => request<{ publicKey: string }>("/api/push/config"),
  pushStatus: (body: PushEndpointInput) =>
    request<PushSubscriptionStatus>("/api/push/status", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  savePushSubscription: (body: PushSubscriptionInput) =>
    request<PushSubscriptionStatus>("/api/push/subscription", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  removePushSubscription: (body: PushEndpointInput) =>
    request<{ ok: true }>("/api/push/subscription", {
      method: "DELETE",
      body: JSON.stringify(body),
    }),
  queue: (deckId?: string) => request<Queue>(`/api/review/queue${deckId ? `?deck=${deckId}` : ""}`),
  history: (days = 7) =>
    request<{ days: number[]; streak: number }>(
      `/api/review/history?days=${days}&tz=${new Date().getTimezoneOffset()}`,
    ),
  insights: (period: 30 | 90 | 0 = 30) =>
    request<InsightsOut>(
      `/api/stats/insights?period=${period}&tz=${encodeURIComponent(
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      )}`,
    ),
  grade: (body: GradeInput) =>
    request<{ ok: true; due: string }>("/api/review/grade", {
      method: "POST",
      body: JSON.stringify({ ...body, reviewedAt: (body.reviewedAt ?? new Date()).toISOString() }),
    }),
};

/**
 * Grades made offline wait here and replay in order when the connection returns.
 * The server ignores a grade older than the state's last review, so replays are safe.
 */
const OUTBOX_KEY = "lymi-outbox";
type Outbox = GradeInput[];

function readOutbox(): Outbox {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]") as Outbox;
  } catch {
    return [];
  }
}
function writeOutbox(items: Outbox) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
}

export async function gradeWithOutbox(input: GradeInput) {
  const entry = { ...input, reviewedAt: input.reviewedAt ?? new Date() };
  try {
    return await api.grade(entry);
  } catch (err) {
    if (err instanceof ApiError && err.status !== 0) throw err;
    writeOutbox([...readOutbox(), entry]);
    return { ok: true as const, due: "", queued: true };
  }
}

export async function flushOutbox() {
  const items = readOutbox();
  if (items.length === 0) return 0;
  const remaining: Outbox = [];
  for (const item of items) {
    try {
      await api.grade({ ...item, reviewedAt: new Date(item.reviewedAt as unknown as string) });
    } catch (err) {
      if (err instanceof ApiError && err.status >= 400 && err.status < 500) continue; // drop bad entries
      remaining.push(item);
    }
  }
  writeOutbox(remaining);
  return items.length - remaining.length;
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    void flushOutbox();
  });
}
