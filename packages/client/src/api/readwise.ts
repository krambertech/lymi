import type { ReadwisePatchInput } from "@lymi/core";
import { request } from "./request";

/** The learner's Readwise connection, without the token itself. */
export type Readwise = {
  tokenHint: string;
  status: "active" | "refused" | "unreadable";
  lastPull: { at: string; highlights: number; cards: number; skipped: number } | null;
  languages: { language: string; deckId: string | null }[];
  books: {
    id: string;
    title: string;
    author: string | null;
    language: string | null;
    followed: boolean;
    highlights: number;
  }[];
};

type State = { connection: Readwise | null };

export const readwiseApi = {
  readwise: () => request<State>("/api/readwise"),
  connectReadwise: (token: string) =>
    request<State>("/api/readwise", { method: "POST", body: JSON.stringify({ token }) }),
  updateReadwise: (body: ReadwisePatchInput) =>
    request<State>("/api/readwise", { method: "PATCH", body: JSON.stringify(body) }),
  pullReadwise: () => request<State>("/api/readwise/pull", { method: "POST" }),
  disconnectReadwise: () => request<{ ok: true }>("/api/readwise", { method: "DELETE" }),
};
