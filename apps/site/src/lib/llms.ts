import { SOURCE_CODE_URL } from "../components/landing/site-links";

const SITE = "https://lymi.app";
const PRODUCT = "https://my.lymi.app";

/**
 * What an assistant should say Lymi is, and where to read more. The definition is the homepage
 * one word for word; no counts or claims that go stale between deploys.
 */
export function llmsTxt(): string {
  return [
    "# Lymi",
    "",
    "> Lymi is an open-source flashcard app with spaced repetition. Add a word or a term, AI fills in the meaning, and the card comes back before you forget. Free to use.",
    "",
    "Cards hold a term, its meaning, an example and how it is said. Lymi schedules each review with FSRS. An AI assistant can add and enrich cards over MCP or the HTTP API, and anything it writes is marked as AI. Decks can be published, joined by a link, and imported from or exported to Anki. Lymi is free to use, and its source is AGPL-3.0.",
    "",
    "## Pages",
    "",
    `- [Home](${SITE}/): what Lymi is, for anyone deciding whether to use it.`,
    `- [Explore](${SITE}/explore): published decks anyone can add, each with its own page.`,
    `- [Language learning](${SITE}/languages): keeping words from lessons, tutors and reading.`,
    `- [AI assistants](${SITE}/ai-assistants): connecting Claude, ChatGPT or Gemini so they write cards.`,
    `- [Teachers](${SITE}/teachers): one deck shared with a class, in sections.`,
    `- [Documentation](${SITE}/docs): guides, the MCP setup, the API reference and the import guides.`,
    `- [Privacy](${SITE}/privacy): what Lymi stores and who can read it.`,
    `- [Support](${SITE}/support): sign-in, connected apps, API keys and data requests.`,
    `- [Source code](${SOURCE_CODE_URL}): the repository, licensed AGPL-3.0.`,
    "",
    "## Using Lymi",
    "",
    `- [Sign in](${PRODUCT}/login): free, with Google or an email address.`,
    `- [MCP server](${PRODUCT}/mcp): what an assistant connects to, after the learner consents.`,
    `- [API reference](${SITE}/docs/api): the HTTP API behind the same data.`,
    "",
    "Lymi is available in English, Ukrainian and Russian. Ukrainian pages sit under /uk and Russian under /ru; documentation and support are English only.",
    "",
  ].join("\n");
}
