/**
 * The map of the documentation site. One list, in reading order, so the sidebar, the
 * "next page" link at the foot of every page and the search index can never disagree.
 */

export type DocPath =
  | "/docs"
  | "/docs/quickstart"
  | "/docs/authentication"
  | "/docs/cards"
  | "/docs/recipes"
  | "/docs/api"
  | "/docs/mcp"
  | "/docs/mcp/claude"
  | "/docs/mcp/chatgpt";

export interface DocPage {
  to: DocPath;
  /** Sidebar label. Short. */
  nav: string;
  /** Page heading and browser title. */
  title: string;
  /** One sentence: what this page answers. Used on the overview and in search. */
  blurb: string;
  section: string;
}

export const PAGES: DocPage[] = [
  {
    to: "/docs",
    nav: "Overview",
    title: "Lymi API",
    blurb: "What you can do from outside the app, and where to start.",
    section: "Start",
  },
  {
    to: "/docs/quickstart",
    nav: "Quickstart",
    title: "Quickstart",
    blurb: "Make a key, add your first card, and see it in the app.",
    section: "Start",
  },
  {
    to: "/docs/authentication",
    nav: "Authentication",
    title: "Authentication",
    blurb: "API keys, scopes, what a key can never do, and every error you can get.",
    section: "Start",
  },
  {
    to: "/docs/cards",
    nav: "Decks and cards",
    title: "Decks and cards",
    blurb: "How a card is shaped, what happens to duplicates, and how reviews are scheduled.",
    section: "Guides",
  },
  {
    to: "/docs/recipes",
    nav: "Recipes",
    title: "Recipes",
    blurb: "Import a word list, back up a deck, and keep a script safe to re-run.",
    section: "Guides",
  },
  {
    to: "/docs/api",
    nav: "API reference",
    title: "API reference",
    blurb: "Every route, parameter and response, generated from the running server.",
    section: "Reference",
  },
  {
    to: "/docs/mcp",
    nav: "Overview",
    title: "Connect an assistant",
    blurb: "What the MCP server is, how sign-in works, and what a connected assistant may do.",
    section: "MCP",
  },
  {
    to: "/docs/mcp/claude",
    nav: "Claude",
    title: "Claude",
    blurb: "Connect Lymi to Claude Desktop, claude.ai and Claude Code.",
    section: "MCP",
  },
  {
    to: "/docs/mcp/chatgpt",
    nav: "ChatGPT and Codex",
    title: "ChatGPT and Codex",
    blurb: "Connect Lymi to ChatGPT connectors and to the Codex CLI.",
    section: "MCP",
  },
];

export const SECTIONS: { name: string; pages: DocPage[] }[] = [
  "Start",
  "Guides",
  "Reference",
  "MCP",
].map((name) => ({ name, pages: PAGES.filter((p) => p.section === name) }));

export function pageAt(path: string): DocPage | undefined {
  return PAGES.find((p) => p.to === path);
}

/** The page before and after this one, in reading order. Drives the foot of every page. */
export function neighbours(path: string): { prev?: DocPage; next?: DocPage } {
  const i = PAGES.findIndex((p) => p.to === path);
  if (i === -1) return {};
  const prev = PAGES[i - 1];
  const next = PAGES[i + 1];
  return { ...(prev ? { prev } : {}), ...(next ? { next } : {}) };
}
