import { AppLanguage } from "@lymi/core";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { MCP_VIEWS, type McpView } from "../../shared/mcp-app";
import type { Db } from "../db";
import { type Bindings, publisherEmails } from "../env";
import { viewDocument } from "../mcp/app-resource";
import { buildMcpServer } from "../mcp/server";
import { getSettings } from "../services";
import { enrichmentQueue } from "../services/enrichment";

/**
 * A stand-in for an MCP Apps host, for local development only: it renders the real view
 * bundle in a sandboxed frame and answers its tool calls with the real MCP server, signed in
 * as the session's persona. It skips OAuth and nothing else. ADR 0026.
 */
export const DEV_HOST_CLIENT = "lymi-dev-host";

export async function callAsMcp(
  deps: { db: Db; env: Bindings; userId: string },
  name: string,
  args: Record<string, unknown>,
) {
  const { appLanguage } = await getSettings({ db: deps.db, userId: deps.userId, actor: "mcp" });
  const server = buildMcpServer({
    ctx: {
      db: deps.db,
      userId: deps.userId,
      actor: "mcp",
      client: DEV_HOST_CLIENT,
      clientName: "Dev host",
    },
    scope: "write",
    resourceMetadataUrl: new URL(
      "/.well-known/oauth-protected-resource/mcp",
      deps.env.PRODUCT_URL,
    ).toString(),
    enrichment: enrichmentQueue(deps.env),
    publishers: publisherEmails(deps.env),
    appLanguage: AppLanguage.catch("en").parse(appLanguage),
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "lymi-dev-host", version: "0.0.0" });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  try {
    return await client.callTool({ name, arguments: args });
  } finally {
    await client.close();
  }
}

export function devHostView(value: string | undefined): McpView {
  return MCP_VIEWS.find((view) => view === value) ?? "capture";
}

/** The harness page: the view in a frame, and what the view told the host beside it. */
export function devHostPage({
  view,
  origin,
  locale,
  theme,
  width,
  deepLink,
}: {
  view: McpView;
  origin: string;
  locale: AppLanguage;
  theme: "light" | "dark";
  width: number;
  /** The path ChatGPT hands the home when it opens from a deep link. */
  deepLink?: string | undefined;
}): string {
  const document = viewDocument(view, origin, locale);
  const config = JSON.stringify({ view, theme, locale, deepLink }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en" data-theme="${theme}">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Lymi MCP view · ${view}</title>
<style>
  body { margin: 0; font: 13px/1.5 ui-sans-serif, system-ui; background: ${theme === "dark" ? "#1d1b1a" : "#ecebe9"}; color: ${theme === "dark" ? "#eee" : "#222"}; }
  .wrap { display: flex; gap: 24px; padding: 24px; align-items: flex-start; flex-wrap: wrap; }
  iframe { width: ${width}px; max-width: 100%; height: 200px; border: 1px solid ${theme === "dark" ? "#3a3634" : "#d6d3cf"}; border-radius: 16px; background: transparent; }
  pre { flex: 1; min-width: 260px; white-space: pre-wrap; margin: 0; font: 12px/1.5 ui-monospace, Menlo, monospace; }
</style>
</head>
<body>
<div class="wrap">
  <iframe id="view" sandbox="allow-scripts allow-forms" title="Lymi view"></iframe>
  <pre id="log" aria-label="What the view told the host"></pre>
</div>
<script>
const config = ${config};
const frame = document.getElementById("view");
const log = document.getElementById("log");
frame.srcdoc = ${JSON.stringify(document).replace(/</g, "\\u003c")};
const note = (label, value) => { log.textContent += label + " " + JSON.stringify(value, null, 2) + "\\n\\n"; };
const post = (message) => frame.contentWindow.postMessage({ jsonrpc: "2.0", ...message }, "*");
const call = async (name, args) => {
  const response = await fetch("/api/dev/mcp-host/call", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name, arguments: args }),
  });
  return response.json();
};
const sample = {
  async capture() {
    const decks = (await call("list_decks", {})).structuredContent.decks;
    const deck = decks[0];
    const existing = (await call("get_deck", { deckId: deck.id })).structuredContent.cards[0];
    const cards = [
      { deckId: deck.id, term: "il binario", meaning: "the platform (track)", meaningSource: "lesson", example: "Il treno parte dal binario tre.", exampleSource: "lesson", source: "Lesson 13" },
      { deckId: deck.id, term: "la fermata", meaning: "the stop", meaningSource: "lesson", source: "Lesson 13" },
      { deckId: deck.id, term: "perdere il treno", source: "Lesson 13", enrich: true },
      ...(existing ? [{ deckId: deck.id, term: existing.term, source: "Lesson 13" }] : []),
    ];
    return ["add_cards", { cards }];
  },
  async card() {
    const found = (await call("search_cards", { limit: 1 })).structuredContent.cards[0];
    return ["get_card", { cardId: found.id }];
  },
  async search() { return ["search_cards", { limit: 8 }]; },
  async deck() {
    const decks = (await call("list_decks", {})).structuredContent.decks;
    return ["get_deck", { deckId: decks[0].id }];
  },
  async due() { return ["due_counts", {}]; },
  async insights() { return ["get_insights", { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }]; },
  async streak() { return ["get_streak", { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }]; },
  async home() { return ["open_lymi", {}]; },
};
let tool = null;
window.addEventListener("message", async (event) => {
  if (event.source !== frame.contentWindow) return;
  const message = event.data;
  if (!message || message.jsonrpc !== "2.0") return;
  switch (message.method) {
    case "ui/initialize": {
      const [name, args] = await sample[config.view]();
      tool = { name, args };
      post({ id: message.id, result: {
        protocolVersion: message.params.protocolVersion,
        hostInfo: { name: "Lymi dev host", version: "0.0.0" },
        hostCapabilities: { openLinks: {}, serverTools: {}, updateModelContext: { text: {}, structuredContent: {} } },
        hostContext: { theme: config.theme, locale: config.locale, displayMode: "inline", availableDisplayModes: ["inline"], platform: "web", toolInfo: { tool: { name, inputSchema: { type: "object" } } }, ...(config.deepLink ? { "openai/deepLink": { url: config.deepLink } } : {}) },
      } });
      return;
    }
    case "ui/notifications/initialized": {
      post({ method: "ui/notifications/tool-input", params: { arguments: tool.args } });
      const result = await call(tool.name, tool.args);
      note("tool-result " + tool.name, { isError: !!result.isError, _meta: result._meta });
      post({ method: "ui/notifications/tool-result", params: result });
      return;
    }
    case "ui/notifications/size-changed":
      if (message.params?.height) frame.style.height = Math.ceil(message.params.height) + "px";
      return;
    case "tools/call": {
      note("tools/call", message.params);
      post({ id: message.id, result: await call(message.params.name, message.params.arguments ?? {}) });
      return;
    }
    case "ui/update-model-context":
    case "ui/open-link":
    case "ui/message":
      note(message.method, message.params);
      post({ id: message.id, result: {} });
      return;
    default:
      if (message.id !== undefined) post({ id: message.id, result: {} });
  }
});
</script>
</body>
</html>`;
}
