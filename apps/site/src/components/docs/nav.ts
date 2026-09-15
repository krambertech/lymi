/**
 * The map of the documentation site. One list, in reading order, so the sidebar, the
 * "next page" link at the foot of every page and the search index can never disagree.
 */

export type DocPath =
  | "/docs"
  | "/docs/quickstart"
  | "/docs/authentication"
  | "/docs/mobile"
  | "/docs/cards"
  | "/docs/import-from-anki"
  | "/docs/scheduling"
  | "/docs/recipes"
  | "/docs/api"
  | "/docs/mcp"
  | "/docs/mcp/claude"
  | "/docs/mcp/chatgpt"
  | "/docs/mcp/gemini";

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
    title: "Lymi docs",
    blurb: "Connect an assistant or write your own scripts, and where to start.",
    section: "Start",
  },
  {
    to: "/docs/mcp",
    nav: "Overview",
    title: "Connect an assistant",
    blurb: "What the MCP server is, how sign-in works, and what a connected assistant may do.",
    section: "Assistants",
  },
  {
    to: "/docs/mcp/claude",
    nav: "Claude",
    title: "Claude",
    blurb: "Connect Lymi to Claude Desktop, claude.ai and Claude Code.",
    section: "Assistants",
  },
  {
    to: "/docs/mcp/chatgpt",
    nav: "ChatGPT and Codex",
    title: "ChatGPT and Codex",
    blurb: "Connect Lymi to ChatGPT connectors and to the Codex CLI.",
    section: "Assistants",
  },
  {
    to: "/docs/mcp/gemini",
    nav: "Gemini CLI",
    title: "Gemini CLI",
    blurb: "Connect Lymi to Gemini CLI, with the client ID Lymi publishes for it.",
    section: "Assistants",
  },
  {
    to: "/docs/mobile",
    nav: "Lymi on your phone",
    title: "Lymi on your phone",
    blurb:
      "Add Lymi to the home screen of an iPhone or Android phone until the mobile app arrives.",
    section: "Guides",
  },
  {
    to: "/docs/cards",
    nav: "Decks and cards",
    title: "Decks and cards",
    blurb: "How a card is shaped, what happens to duplicates, and which modes it is asked in.",
    section: "Guides",
  },
  {
    to: "/docs/import-from-anki",
    nav: "Import from Anki",
    title: "Import from Anki",
    blurb: "Bring your Anki decks across with their pictures, tags and review history.",
    section: "Guides",
  },
  {
    to: "/docs/scheduling",
    nav: "Review scheduling",
    title: "How reviews are scheduled",
    blurb: "When a card is due, which card comes next, and the simulations behind the rules.",
    section: "Guides",
  },
  {
    to: "/docs/quickstart",
    nav: "Quickstart",
    title: "Quickstart",
    blurb: "Make a key, add your first card, and see it in the app.",
    section: "API",
  },
  {
    to: "/docs/authentication",
    nav: "Authentication",
    title: "Authentication",
    blurb: "API keys, scopes, what a key can never do, and every error you can get.",
    section: "API",
  },
  {
    to: "/docs/recipes",
    nav: "Recipes",
    title: "Recipes",
    blurb: "Import a lesson, back up a deck, and keep a script safe to re-run.",
    section: "API",
  },
  {
    to: "/docs/api",
    nav: "API reference",
    title: "API reference",
    blurb: "Every route, parameter and response, generated from the running server.",
    section: "API",
  },
];

export const SECTIONS: { name: string; pages: DocPage[] }[] = [
  "Start",
  "Assistants",
  "Guides",
  "API",
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
