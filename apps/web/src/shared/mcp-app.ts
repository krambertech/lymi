/**
 * The contract between the MCP server and its MCP Apps view (ADR 0026). The server's output
 * schemas in `server/mcp/server.ts` are checked against these shapes at compile time, so the
 * view never reads a field the server stopped sending.
 */

/** One per resource URI, so a host shows the right view before the tool result arrives. */
export const MCP_VIEWS = [
  "capture",
  "card",
  "search",
  "deck",
  "due",
  "insights",
  "streak",
  "home",
] as const;
export type McpView = (typeof MCP_VIEWS)[number];

/** Result `_meta` keys the view reads. Hosts hand `_meta` to the view and not to the model. */
export const MCP_META = {
  decks: "lymi/decks",
} as const;

export type ViewFieldSource = "lesson" | "ai" | "manual";

export interface ViewCard {
  id: string;
  deckId: string;
  term: string;
  meaning: string | null;
  pronunciation: string | null;
  example: string | null;
  notes: string | null;
  hook: string | null;
  language: string | null;
  source: string | null;
  image: { description: string | null } | null;
  meaningSource: ViewFieldSource | null;
  exampleSource: ViewFieldSource | null;
  pronunciationSource: ViewFieldSource | null;
  hookSource: ViewFieldSource | null;
  enrichmentStatus: "working" | "failed" | null;
  archivedAt: string | null;
  createdAt: string;
}

export interface ViewAddOutcome {
  id: string;
  status: "added" | "skipped";
  card?: ViewCard;
  term?: string;
  existing?: ViewCard & { deckName: string };
}

export interface ViewAddResult {
  added: number;
  skipped: number;
  results: ViewAddOutcome[];
}

export interface ViewSearchResult {
  cards: (ViewCard & { deckName: string })[];
  nextCursor: string | null;
  total: number | null;
}

export interface ViewDeckResult {
  deck: { id: string; name: string; description: string | null; defaultLanguage: string | null };
  total: number;
  truncated: boolean;
  cards: (ViewCard & { dueAt: string | null })[];
}

export interface ViewDueResult {
  dueNow: number;
  total: number;
  decks: { id: string; name: string; due: number; total: number }[];
  series: { id: string; name: string; due: number; total: number }[];
  rounds: { forgotten: number; new: number; slipping: number };
}

/** The editable fields, in the order the editor shows them. */
export const EDITABLE_FIELDS = ["term", "meaning", "example", "pronunciation", "hook"] as const;
export type EditableField = (typeof EDITABLE_FIELDS)[number];

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
