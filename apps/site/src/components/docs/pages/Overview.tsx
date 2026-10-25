import { H2, Lead, NextLinks } from "../Prose";

export function Overview() {
  return (
    <div className="doc-prose">
      <Lead>
        Learn how to add and organize cards, review what you are learning, and connect Lymi to the
        tools you already use.
      </Lead>
      <H2>Use Lymi</H2>
      <NextLinks
        items={[
          {
            to: "/docs/getting-started",
            title: "Getting started",
            blurb: "Choose a deck, add your first cards and begin a review.",
          },
          {
            to: "/docs/decks",
            title: "Decks and sharing",
            blurb: "Organize cards with sections, series and tags, or share a deck.",
          },
          {
            to: "/docs/mobile",
            title: "Lymi on your phone",
            blurb: "Add the web app to your home screen.",
          },
          {
            to: "/docs/scheduling",
            title: "Review scheduling",
            blurb: "When a card returns and how Lymi chooses what comes next.",
          },
        ]}
      />
      <H2>Bring cards in or take them out</H2>
      <NextLinks
        items={[
          {
            to: "/docs/import",
            title: "Import cards",
            blurb: "Bring decks from Anki, Mochi, Noji, Pleco, Quizlet or a Lymi file.",
          },
          {
            to: "/docs/export",
            title: "Export your decks",
            blurb: "Choose an Anki package, a Lymi file or a spreadsheet.",
          },
        ]}
      />
      <H2>Connect your tools</H2>
      <NextLinks
        items={[
          {
            to: "/docs/yomitan",
            title: "Yomitan",
            blurb: "Turn dictionary lookups into cards while you read.",
          },
          {
            to: "/docs/readwise",
            title: "Readwise",
            blurb: "Turn new highlights from reading apps into cards.",
          },
          {
            to: "/docs/mcp",
            title: "MCP assistants",
            blurb: "Connect Claude, ChatGPT, Codex, Gemini, Cursor or Grok.",
          },
          {
            to: "/docs/quickstart",
            title: "API quickstart",
            blurb: "Make a key and add a card from your own script.",
          },
        ]}
      />
      <p>
        The <a href="/docs/api">API reference</a> lists routes, parameters and responses. Technical
        card fields and language formats live in the API section.
      </p>
    </div>
  );
}
