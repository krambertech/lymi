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
  | "/docs/languages"
  | "/docs/import-from-anki"
  | "/docs/import-from-mochi"
  | "/docs/import-from-noji"
  | "/docs/import-from-pleco"
  | "/docs/export"
  | "/docs/scheduling"
  | "/docs/recipes"
  | "/docs/api"
  | "/docs/mcp"
  | "/docs/mcp/claude"
  | "/docs/mcp/chatgpt"
  | "/docs/mcp/gemini"
  | "/docs/mcp/cursor"
  | "/docs/mcp/grok"
  | "/docs/yomitan"
  | "/docs/getting-started"
  | "/docs/decks"
  | "/docs/import"
  | "/docs/import-from-quizlet"
  | "/docs/import-from-lymi"
  | "/docs/readwise";

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
    blurb: "Guides for learning, imports, exports, integrations, MCP and the API.",
    section: "Start",
  },
  {
    to: "/docs/getting-started",
    nav: "Getting started",
    title: "Getting started",
    blurb: "Add your first cards, review what is due and find your way around Lymi.",
    section: "Start",
  },
  {
    to: "/docs/decks",
    nav: "Decks and sharing",
    title: "Decks and sharing",
    blurb: "Organize cards, use sections and series, and share a deck.",
    section: "Using Lymi",
  },
  {
    to: "/docs/mobile",
    nav: "Lymi on your phone",
    title: "Lymi on your phone",
    blurb: "Add the Lymi web app to your phone’s home screen.",
    section: "Using Lymi",
  },
  {
    to: "/docs/scheduling",
    nav: "Review scheduling",
    title: "How reviews are scheduled",
    blurb: "When a card is due, which card comes next, and the simulations behind the rules.",
    section: "Using Lymi",
  },
  {
    to: "/docs/import",
    nav: "Overview",
    title: "Import cards",
    blurb: "Choose a format, check the preview and undo an import.",
    section: "Imports",
  },
  {
    to: "/docs/import-from-anki",
    nav: "Anki",
    title: "Import from Anki",
    blurb: "Bring your Anki decks across with their pictures, tags and review history.",
    section: "Imports",
  },
  {
    to: "/docs/import-from-mochi",
    nav: "Mochi",
    title: "Import from Mochi",
    blurb: "Bring your Mochi decks across with their pictures, tags and review history.",
    section: "Imports",
  },
  {
    to: "/docs/import-from-noji",
    nav: "Noji",
    title: "Import from Noji",
    blurb: "Bring your Noji decks across with their sub-decks, pictures and learning progress.",
    section: "Imports",
  },
  {
    to: "/docs/import-from-pleco",
    nav: "Pleco",
    title: "Import from Pleco",
    blurb: "Bring your Pleco flashcards across with their pinyin, definitions and categories.",
    section: "Imports",
  },
  {
    to: "/docs/import-from-quizlet",
    nav: "Quizlet and text lists",
    title: "Import from Quizlet",
    blurb: "Bring terms and definitions into a new or existing deck.",
    section: "Imports",
  },
  {
    to: "/docs/import-from-lymi",
    nav: "Lymi file",
    title: "Import a Lymi file",
    blurb: "Bring cards, media and review history from a Lymi export.",
    section: "Imports",
  },
  {
    to: "/docs/export",
    nav: "Export",
    title: "Export your decks",
    blurb: "Take a deck or your library out as an Anki package or a Lymi file.",
    section: "Exports",
  },
  {
    to: "/docs/yomitan",
    nav: "Yomitan",
    title: "Yomitan",
    blurb: "Add the words you look up in Yomitan’s pop-up dictionary as cards.",
    section: "Integrations",
  },
  {
    to: "/docs/readwise",
    nav: "Readwise",
    title: "Readwise",
    blurb: "Turn new reading highlights into cards and choose where they go.",
    section: "Integrations",
  },
  {
    to: "/docs/mcp",
    nav: "Overview",
    title: "Connect an assistant",
    blurb: "What the MCP server is, how sign-in works, and what a connected assistant may do.",
    section: "MCP assistants",
  },
  {
    to: "/docs/mcp/claude",
    nav: "Claude",
    title: "Claude",
    blurb: "Connect Lymi to Claude Desktop, claude.ai and Claude Code.",
    section: "MCP assistants",
  },
  {
    to: "/docs/mcp/chatgpt",
    nav: "ChatGPT and Codex",
    title: "ChatGPT and Codex",
    blurb: "Connect Lymi to ChatGPT as a custom MCP plugin and to the Codex CLI.",
    section: "MCP assistants",
  },
  {
    to: "/docs/mcp/gemini",
    nav: "Gemini",
    title: "Gemini",
    blurb:
      "Connect Lymi to Gemini CLI, with the client ID Lymi publishes for it, and to the Gemini app.",
    section: "MCP assistants",
  },
  {
    to: "/docs/mcp/cursor",
    nav: "Cursor",
    title: "Cursor",
    blurb: "Connect Lymi to Cursor, with the client ID Lymi publishes for it.",
    section: "MCP assistants",
  },
  {
    to: "/docs/mcp/grok",
    nav: "Grok",
    title: "Grok",
    blurb: "Connect Lymi to Grok as a custom connector, with the client ID Lymi publishes for it.",
    section: "MCP assistants",
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
    to: "/docs/cards",
    nav: "Card fields and duplicates",
    title: "Decks and cards",
    blurb: "How a card is shaped, what happens to duplicates, and which modes it is asked in.",
    section: "API",
  },
  {
    to: "/docs/languages",
    nav: "Language formats",
    title: "Languages",
    blurb:
      "How a card's pronunciation and example are written in each language with its own format.",
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
  "Using Lymi",
  "Imports",
  "Exports",
  "Integrations",
  "MCP assistants",
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
