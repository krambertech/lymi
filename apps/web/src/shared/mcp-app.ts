/**
 * The contract between the MCP server and its MCP Apps view (ADR 0026). The server's output
 * schemas in `server/mcp/server.ts` are checked against these shapes at compile time, so the
 * view never reads a field the server stopped sending.
 */

/** One per resource URI, so a host shows the right view before the tool result arrives. */
export const MCP_VIEWS = ["card", "deck", "due", "insights", "streak", "home"] as const;
export type McpView = (typeof MCP_VIEWS)[number];

export type ViewFieldSource = "lesson" | "ai" | "manual";

export interface ViewCard {
  id: string;
  deckId: string;
  term: string;
  meaning: string | null;
  pronunciation: string | null;
  example: string | null;
  exampleTranslation: string | null;
  exampleTranslationStale: boolean;
  notes: string | null;
  hook: string | null;
  language: string | null;
  source: string | null;
  image: { description: string | null } | null;
  meaningSource: ViewFieldSource | null;
  exampleSource: ViewFieldSource | null;
  exampleTranslationSource: ViewFieldSource | null;
  pronunciationSource: ViewFieldSource | null;
  notesSource: ViewFieldSource | null;
  hookSource: ViewFieldSource | null;
  enrichmentStatus: "working" | "failed" | null;
  archivedAt: string | null;
  createdAt: string;
}

export interface ViewDeckResult {
  deck: { id: string; name: string; description: string | null; defaultLanguage: string | null };
  total: number;
  due: number;
  stages: { new: number; learning: number; known: number };
}

export interface ViewDueResult {
  dueNow: number;
  total: number;
  decks: { id: string; name: string; due: number; total: number }[];
  series: { id: string; name: string; due: number; total: number }[];
  rounds: { forgotten: number; new: number; slipping: number };
}

/** Where a view sends the learner in the app. Review always happens there, never in a host. */
export function productLinks(origin: string) {
  return {
    card: (deckId: string, cardId: string) =>
      `${origin}/library/${encodeURIComponent(deckId)}?card=${encodeURIComponent(cardId)}`,
    deck: (deckId: string) => `${origin}/library/${encodeURIComponent(deckId)}`,
    review: (deckId?: string) =>
      deckId ? `${origin}/review?deck=${encodeURIComponent(deckId)}` : `${origin}/review`,
    insights: () => `${origin}/insights`,
    today: () => `${origin}/today`,
  };
}
