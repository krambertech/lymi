import { Client } from "@modelcontextprotocol/client";
import { RESOURCE_MIME_TYPE } from "@modelcontextprotocol/ext-apps/server";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { describe, expect, it } from "vitest";
import type { Db } from "../db";
import { buildMcpServer, type McpPrincipal } from "./server";

const VIEW_TOOLS = {
  add_cards: "capture",
  get_card: "card",
  update_card: "card",
  search_cards: "search",
  get_deck: "deck",
  due_counts: "due",
  get_insights: "insights",
  get_streak: "streak",
  open_lymi: "home",
} as const;

async function connect(principal: Partial<McpPrincipal> & { client?: string } = {}) {
  const server = buildMcpServer({
    ctx: { db: {} as Db, userId: "user-1", actor: "mcp", client: principal.client },
    scope: "write",
    resourceMetadataUrl: "https://my.lymi.app/.well-known/oauth-protected-resource/mcp",
    appLanguage: principal.appLanguage,
  });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  return client;
}

describe("the MCP Apps views", () => {
  it("links each result a learner looks at to a view, and leaves the rest as text", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const { resources } = await client.listResources();
    const uris = new Set(resources.map((r) => r.uri));

    for (const tool of tools) {
      const uri = (tool._meta?.ui as { resourceUri?: string } | undefined)?.resourceUri;
      const view = VIEW_TOOLS[tool.name as keyof typeof VIEW_TOOLS];
      if (!view) {
        expect(uri, tool.name).toBeUndefined();
        continue;
      }
      expect(uri, tool.name).toMatch(new RegExp(`^ui://lymi/en/${view}-[0-9a-f]{12}\\.html$`));
      expect(uris.has(uri as string), tool.name).toBe(true);
    }
  });

  it("serves the view in the learner's language, naming the view and Lymi's origin", async () => {
    const client = await connect({ appLanguage: "uk" });
    const { tools } = await client.listTools();
    const meta = tools.find((t) => t.name === "add_cards")?._meta?.ui as
      | { resourceUri: string }
      | undefined;
    const uri = meta?.resourceUri ?? "";
    expect(uri).toContain("/uk/");

    const { contents } = await client.readResource({ uri });
    const [content] = contents;
    expect(content?.mimeType).toBe(RESOURCE_MIME_TYPE);
    const html = content && "text" in content ? content.text : "";
    expect(html).toContain('<html lang="uk"');
    expect(html).toContain('<meta name="lymi-view" content="capture">');
    expect(html).toContain('<meta name="lymi-origin" content="https://my.lymi.app">');
    const catalog = html.match(
      /<script type="application\/json" id="lymi-messages">(.*?)<\/script>/,
    );
    expect(JSON.parse(catalog?.[1] ?? "{}")).toMatchObject({ locale: "uk" });
  });

  it("asks for no network and links only into Lymi", async () => {
    const client = await connect();
    const { resources } = await client.listResources();
    const { contents } = await client.readResource({ uri: resources[0]?.uri ?? "" });
    expect(contents[0]?._meta).toMatchObject({
      ui: { csp: { connectDomains: [], resourceDomains: [] }, domain: "https://my.lymi.app" },
      "openai/widgetCSP": { redirect_domains: ["https://my.lymi.app"] },
    });
  });

  it("gives Claude the sandbox domain it derives from the server URL", async () => {
    const client = await connect({ client: "https://claude.ai/oauth/mcp-oauth-client-metadata" });
    const { resources } = await client.listResources();
    const { contents } = await client.readResource({ uri: resources[0]?.uri ?? "" });
    const domain = (contents[0]?._meta?.ui as { domain: string } | undefined)?.domain;

    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode("https://my.lymi.app/mcp"),
    );
    const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
    expect(domain).toBe(`${hex.slice(0, 32)}.claudemcpcontent.com`);
  });
});

describe("ChatGPT's extensions", () => {
  it("opens Lymi's home from the sidebar and beside a conversation, out of the model's sight", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const home = tools.find((t) => t.name === "open_lymi");
    expect(home?._meta).toMatchObject({
      ui: { visibility: ["app"] },
      "openai/ui": { entrypoints: [{ type: "global" }, { type: "thread" }] },
    });
  });

  it("offers decks and cards to mention through an app-only search tool", async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const mentions = tools.find((t) => t.name === "mention_search");
    expect(mentions?._meta).toMatchObject({
      ui: { visibility: ["app"] },
      "openai/extensions": { "mentions/search": {} },
    });
  });

  it("announces native settings, read and written by app-only tools", async () => {
    const client = await connect();
    expect(client.getServerCapabilities()?.experimental).toMatchObject({
      "openai/settings": { readTool: "settings_read", updateTool: "settings_update" },
    });
    const { tools } = await client.listTools();
    for (const name of ["settings_read", "settings_update"]) {
      expect(tools.find((t) => t.name === name)?._meta, name).toMatchObject({
        ui: { visibility: ["app"] },
      });
    }
  });

  it("lets a card or a deck be read as a resource, so a mention can carry it", async () => {
    const client = await connect();
    const { resourceTemplates } = await client.listResourceTemplates();
    expect(resourceTemplates.map((t) => t.uriTemplate).sort()).toEqual([
      "lymi://card/{cardId}",
      "lymi://deck/{deckId}",
    ]);
  });
});
