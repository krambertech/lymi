import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import { listActivity } from "../services/activity";
import type { ServiceContext } from "../services/context";
import { createDeck } from "../services/decks";
import { learner, testDb } from "../services/test-db";
import { buildMcpServer, type McpPrincipal } from "./server";

/**
 * The tools against a real database, the way `authorizeMcpClaims` hands them a learner: actor
 * `mcp`, the client id and the client's name. What they write must reach Activity named.
 */
let db: Db;
let dispose: () => Promise<void>;
let kateryna: ServiceContext;
let client: Client;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  kateryna = await learner(db, "kateryna", "Kateryna");
  const principal: McpPrincipal = {
    ctx: { ...kateryna, actor: "mcp", client: "cl-claude", clientName: "Claude" },
    scope: "write",
    resourceMetadataUrl: "https://my.lymi.app/.well-known/oauth-protected-resource/mcp",
  };
  const server = buildMcpServer(principal);
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
}, 60_000);

afterAll(async () => {
  await dispose();
});

describe("what a connected app writes", () => {
  it("lands in Activity named, whatever it wrote", async () => {
    const deck = await createDeck(kateryna, { name: "Italian", defaultLanguage: "it" });
    await client.callTool({
      name: "create_section",
      arguments: { deckId: deck.id, name: "Lesson 1" },
    });
    await client.callTool({ name: "create_series", arguments: { name: "Italian A1" } });
    await client.callTool({
      name: "add_cards",
      arguments: { cards: [{ deckId: deck.id, term: "sbrigarsi" }] },
    });

    const { entries } = await listActivity(kateryna, { limit: 50 });
    const kinds = new Map(entries.map((entry) => [entry.kind, entry]));
    expect(kinds.get("section_added")).toMatchObject({ actor: "mcp", app: "Claude" });
    expect(kinds.get("series_added")).toMatchObject({ actor: "mcp", app: "Claude" });
    expect(kinds.get("cards_added")).toMatchObject({ actor: "mcp", app: "Claude", count: 1 });
  });
});
