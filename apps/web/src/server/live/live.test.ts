import { DeckOut, LIVE_TAB_HEADER } from "@lymi/core";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Bindings } from "../env";
import { announcingWrites } from "../mcp";
import { buildMcpServer } from "../mcp/server";
import { createDeck } from "../services/decks";
import { learner, testDb } from "../services/test-db";
import { json, PRODUCT_URL, type Session, type TestApp, testApp } from "../test-app";

/** Who the channel was told about, standing in for the Durable Object. ADR 0024. */
const told: { userId: string; fromTab: string | null }[] = [];
const LIVE = {
  getByName: (userId: string) => ({
    changed: async (fromTab: string | null) => {
      told.push({ userId, fromTab });
    },
    fetch: async () => new Response("channel", { status: 200 }),
  }),
} as unknown as Bindings["LIVE"];

beforeEach(() => {
  told.length = 0;
});

describe("a write through the API", () => {
  let app: TestApp;
  let learnerSession: Session;

  beforeAll(async () => {
    app = await testApp({ env: { LIVE } });
    learnerSession = await app.signUp("live-learner");
  });

  it("tells the channel once it succeeds, naming the tab that made it", async () => {
    const made = await app.fetch("/api/decks", {
      ...json({ name: "Live deck" }, { headers: { [LIVE_TAB_HEADER]: "tab-1" } }),
      as: learnerSession,
    });
    expect(made.status).toBe(201);
    expect(told).toEqual([{ userId: learnerSession.userId, fromTab: "tab-1" }]);
    DeckOut.parse(await made.json());
  });

  it("says nothing for a read or a refused write", async () => {
    expect((await app.fetch("/api/decks", { as: learnerSession })).status).toBe(200);
    const refused = await app.fetch("/api/decks", { ...json({}), as: learnerSession });
    expect(refused.status).toBe(400);
    expect(told).toEqual([]);
  });
});

describe("opening the channel", () => {
  let app: TestApp;
  let learnerSession: Session;
  const upgrade = { upgrade: "websocket", origin: new URL(PRODUCT_URL).origin };

  beforeAll(async () => {
    app = await testApp({ env: { LIVE } });
    learnerSession = await app.signUp("live-socket");
  });

  it("hands the learner's handshake to their channel", async () => {
    const opened = await app.fetch("/api/live?tab=tab-1", { headers: upgrade, as: learnerSession });
    expect(await opened.text()).toBe("channel");
  });

  it("refuses a handshake from another origin, a plain request, a bad tab id and no session", async () => {
    const elsewhere = await app.fetch("/api/live", {
      headers: { ...upgrade, origin: "https://lymi.app" },
      as: learnerSession,
    });
    expect(elsewhere.status).toBe(403);
    expect((await app.fetch("/api/live", { as: learnerSession })).status).toBe(426);
    const tooLong = await app.fetch(`/api/live?tab=${"x".repeat(65)}`, {
      headers: upgrade,
      as: learnerSession,
    });
    expect(tooLong.status).toBe(400);
    expect((await app.fetch("/api/live", { headers: upgrade })).status).toBe(401);
  });
});

describe("a connected app's tool call", () => {
  it("tells the channel after a tool that wrote, and not after one that read", async () => {
    const { db, dispose } = await testDb();
    const kateryna = await learner(db, "live-mcp", "Kateryna");
    const deck = await createDeck(kateryna, { name: "Italian", defaultLanguage: "it" });
    const deferred: Promise<unknown>[] = [];
    const principal = announcingWrites(
      {
        ctx: { ...kateryna, actor: "mcp", client: "cl-claude", clientName: "Claude" },
        scope: "write",
        resourceMetadataUrl: "https://my.lymi.app/.well-known/oauth-protected-resource/mcp",
      },
      { env: { LIVE }, waitUntil: (work) => deferred.push(work) },
    );
    const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
    const client = new Client({ name: "test", version: "0.0.0" });
    await Promise.all([buildMcpServer(principal).connect(serverSide), client.connect(clientSide)]);

    await client.callTool({ name: "list_decks", arguments: {} });
    await Promise.all(deferred);
    expect(told).toEqual([]);

    await client.callTool({
      name: "add_cards",
      arguments: { cards: [{ deckId: deck.id, term: "sbrigarsi" }] },
    });
    await Promise.all(deferred);
    expect(told).toEqual([{ userId: "live-mcp", fromTab: null }]);
    await dispose();
  }, 60_000);
});
