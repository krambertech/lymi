import type { CardInput, Direction, GradeInput, Rating } from "@lymi/core";
import type { Card, CardState, Deck } from "@lymi/core/schema";

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
  if (res.status === 401) throw new ApiError(401, "Sign in required");
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {}
    throw new ApiError(res.status, message);
  }
  return (await res.json()) as T;
}

export type Me = { id: string; name: string; email: string; image: string | null };
export type DeckSummary = Pick<
  Deck,
  "id" | "name" | "description" | "defaultLanguage" | "position"
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

export const api = {
  me: () => request<Me>("/api/me"),
  decks: () => request<DeckSummary[]>("/api/decks"),
  createDeck: (body: { name: string; defaultLanguage?: string | null }) =>
    request<Deck>("/api/decks", { method: "POST", body: JSON.stringify(body) }),
  deckCards: (deckId: string) =>
    request<{ card: Card; state: CardState | null }[]>(`/api/decks/${deckId}/cards`),
  createCard: (body: CardInput) =>
    request<Card>("/api/cards", { method: "POST", body: JSON.stringify(body) }),
  archiveCard: (id: string) =>
    request<{ ok: true }>(`/api/cards/${id}/archive`, { method: "POST" }),
  restoreCard: (id: string) =>
    request<{ ok: true }>(`/api/cards/${id}/restore`, { method: "POST" }),
  queue: (deckId?: string) => request<Queue>(`/api/review/queue${deckId ? `?deck=${deckId}` : ""}`),
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
