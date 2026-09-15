import type { CardInput } from "@lymi/core";
import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../db";
import type { CardView, getDeck } from "../services";
import { ServiceError } from "../services/context";
import { buildMcpServer, type McpPrincipal, withAiSourceDefaults } from "./server";

vi.mock("../services", async () => {
  const context = await import("../services/context");
  return {
    ...context,
    listDecks: vi.fn(),
    getDeck: vi.fn(),
    listDeckCards: vi.fn(),
    createDeck: vi.fn(),
    updateDeck: vi.fn(),
    archiveDeck: vi.fn(),
    restoreDeck: vi.fn(),
    listSeries: vi.fn(),
    getSeries: vi.fn(),
    createSeries: vi.fn(),
    renameSeries: vi.fn(),
    setSeriesDecks: vi.fn(),
    reorderSeries: vi.fn(),
    archiveSeries: vi.fn(),
    restoreSeries: vi.fn(),
    searchCards: vi.fn(),
    showCard: vi.fn(),
    addCards: vi.fn(),
    updateCard: vi.fn(),
    archiveCard: vi.fn(),
    restoreCard: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    insights: vi.fn(),
    streak: vi.fn(),
  };
});

const services = vi.mocked(await import("../services"));

const now = new Date("2026-09-12T10:00:00.000Z");

const owned = { role: "owner" as const, owner: { id: "user-1", name: "Kateryna" } };

const deck: Awaited<ReturnType<typeof getDeck>> = {
  id: "deck-1",
  userId: "user-1",
  name: "Italian",
  description: null,
  defaultLanguage: "it",
  directions: "recognition",
  reviewModes: [{ cue: "term", target: "meaning" }],
  position: 0,
  seriesId: null,
  archivedAt: null,
  importId: null,
  externalId: null,
  createdAt: now,
  updatedAt: now,
  ...owned,
};

const card: CardView = {
  id: "card-1",
  userId: "user-1",
  deckId: "deck-1",
  term: "sbrigarsi",
  normalizedTerm: "sbrigarsi",
  meaning: "to hurry up",
  pronunciation: null,
  example: null,
  notes: null,
  language: "it",
  tags: [],
  source: null,
  directions: null,
  reviewModes: null,
  image: null,
  imageVersion: null,
  importId: null,
  externalId: null,
  meaningSource: "ai",
  exampleSource: null,
  audioKey: null,
  createdBy: "mcp",
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
};

async function connect(scope: McpPrincipal["scope"]) {
  const principal: McpPrincipal = {
    ctx: { db: {} as Db, userId: "user-1", actor: "mcp" },
    scope,
    resourceMetadataUrl: "https://my.lymi.app/.well-known/oauth-protected-resource/mcp",
  };
  const server = buildMcpServer(principal);
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: "test", version: "0.0.0" });
  await Promise.all([server.connect(serverSide), client.connect(clientSide)]);
  return client;
}

describe("Lymi MCP server", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("offers the tool set from the plan, each named so a client knows which ones write", async () => {
    const client = await connect("write");
    const { tools } = await client.listTools();
    const byName = new Map(tools.map((t) => [t.name, t]));

    expect([...byName.keys()].sort()).toEqual([
      "add_cards",
      "archive_card",
      "archive_card_image",
      "archive_deck",
      "archive_series",
      "create_deck",
      "create_series",
      "describe_card_image",
      "due_counts",
      "get_card",
      "get_deck",
      "get_insights",
      "get_settings",
      "get_streak",
      "list_decks",
      "list_series",
      "reorder_series",
      "restore_card",
      "restore_card_image",
      "restore_deck",
      "restore_series",
      "search_cards",
      "set_card_image",
      "update_card",
      "update_deck",
      "update_series",
      "update_settings",
    ]);
    expect(byName.get("list_decks")?.annotations?.readOnlyHint).toBe(true);
    expect(byName.get("add_cards")?.annotations?.readOnlyHint).toBe(false);
    // Archive is reversible, so no client should ask for confirmation before it.
    expect(byName.get("archive_card")?.annotations?.destructiveHint).toBe(false);
    // An edit replaces the learner's text with no way back.
    expect(byName.get("update_card")?.annotations?.destructiveHint).toBe(true);
    expect(byName.get("create_deck")?.annotations?.idempotentHint).toBe(false);
    // A repeated add skips every card; a repeated edit or archive writes to Activity again.
    expect(byName.get("add_cards")?.annotations?.idempotentHint).toBe(true);
    expect(byName.get("update_card")?.annotations?.idempotentHint).toBe(false);
    expect(byName.get("archive_card")?.annotations?.idempotentHint).toBe(false);
  });

  it("declares a title, every hint directory review asks for, and the scope each tool needs", async () => {
    const client = await connect("write");
    const { tools } = await client.listTools();

    for (const tool of tools) {
      const { annotations } = tool;
      expect(tool.title, tool.name).toBeTruthy();
      expect(tool.outputSchema, tool.name).toBeDefined();
      expect(typeof annotations?.readOnlyHint, tool.name).toBe("boolean");
      expect(typeof annotations?.destructiveHint, tool.name).toBe("boolean");
      expect(annotations?.openWorldHint, tool.name).toBe(false);
      if (!annotations?.readOnlyHint) {
        expect(typeof annotations?.idempotentHint, tool.name).toBe("boolean");
      }
      const scope = annotations?.readOnlyHint ? "read" : "write";
      expect(tool._meta?.securitySchemes, tool.name).toEqual([{ type: "oauth2", scopes: [scope] }]);
    }
  });

  it("never offers the daily goal as something an assistant can change", async () => {
    const client = await connect("write");
    const { tools } = await client.listTools();
    const update = tools.find((t) => t.name === "update_settings");

    expect(Object.keys(update?.inputSchema.properties ?? {})).toEqual(["appLanguage"]);
  });

  it("lists decks with the learner's meaning language, so an assistant knows what to write", async () => {
    services.listDecks.mockResolvedValue([
      {
        id: deck.id,
        name: deck.name,
        description: null,
        defaultLanguage: "it",
        directions: "recognition",
        reviewModes: [{ cue: "term", target: "meaning" }],
        position: 0,
        seriesId: "series-1",
        total: 12,
        due: 3,
        ...owned,
      },
    ]);
    services.getSettings.mockResolvedValue({
      userId: "user-1",
      appLanguage: "uk",
      meaningLanguage: "uk",
      dailyGoal: 50,
      dailyGoalChosenAt: null,
      reviewTimezone: null,
      reviewTimezoneMode: "automatic",
      reviewTimezoneUpdatedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    const client = await connect("read");

    const res = await client.callTool({ name: "list_decks", arguments: {} });

    expect(res.isError).toBeFalsy();
    expect(res.structuredContent).toEqual({
      meaningLanguage: "uk",
      decks: [
        {
          id: "deck-1",
          name: "Italian",
          description: null,
          defaultLanguage: "it",
          directions: "recognition",
          reviewModes: [{ cue: "term", target: "meaning" }],
          seriesId: "series-1",
          total: 12,
          due: 3,
        },
      ],
    });
    expect(services.listDecks).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-1", actor: "mcp" }),
    );
  });

  it("adds cards through the service layer and reports duplicates as skipped", async () => {
    services.addCards.mockResolvedValue([
      { status: "added", card },
      { status: "skipped", term: "Sbrigarsi", existing: card, deckName: "Italian" },
    ]);
    const client = await connect("write");

    const res = await client.callTool({
      name: "add_cards",
      arguments: {
        cards: [
          { deckId: "deck-1", term: "sbrigarsi", meaning: "to hurry up" },
          { deckId: "deck-1", term: "Sbrigarsi", meaning: "hurry", meaningSource: "lesson" },
        ],
      },
    });

    expect(res.isError).toBeFalsy();
    const out = res.structuredContent as { added: number; skipped: number; results: unknown[] };
    expect(out.added).toBe(1);
    expect(out.skipped).toBe(1);
    expect(out.results[1]).toMatchObject({
      status: "skipped",
      term: "Sbrigarsi",
      existing: { id: "card-1", deckName: "Italian" },
    });
    // The first meaning was the assistant's own; the second said it came from the lesson.
    expect(services.addCards).toHaveBeenCalledWith(expect.anything(), [
      { deckId: "deck-1", term: "sbrigarsi", meaning: "to hurry up", meaningSource: "ai" },
      { deckId: "deck-1", term: "Sbrigarsi", meaning: "hurry", meaningSource: "lesson" },
    ]);
  });

  it("refuses every write on a read-only token and says how to fix it", async () => {
    const client = await connect("read");

    for (const [name, args] of [
      ["add_cards", { cards: [{ deckId: "deck-1", term: "ciao" }] }],
      ["update_card", { cardId: "card-1", meaning: "hi" }],
      ["archive_card", { cardId: "card-1" }],
      ["restore_card", { cardId: "card-1" }],
      ["create_deck", { name: "Spanish" }],
      ["update_deck", { deckId: "deck-1", name: "Italiano" }],
      ["archive_deck", { deckId: "deck-1" }],
      ["restore_deck", { deckId: "deck-1" }],
      ["create_series", { name: "Estonian" }],
      ["update_series", { seriesId: "series-1", name: "Eesti" }],
      ["reorder_series", { seriesIds: ["series-1"] }],
      ["archive_series", { seriesId: "series-1", decks: "keep" }],
      ["restore_series", { seriesId: "series-1" }],
      ["update_settings", { appLanguage: "uk" }],
    ] as const) {
      const res = await client.callTool({ name, arguments: args });
      expect(res.isError, name).toBe(true);
      expect(res.content[0]).toMatchObject({
        type: "text",
        text: expect.stringContaining("leave write ticked"),
      });
      expect(res._meta?.["mcp/www_authenticate"], name).toEqual([
        expect.stringContaining('error="insufficient_scope"'),
      ]);
    }
    expect(services.addCards).not.toHaveBeenCalled();
    expect(services.updateCard).not.toHaveBeenCalled();
    expect(services.archiveCard).not.toHaveBeenCalled();
    expect(services.restoreCard).not.toHaveBeenCalled();
    expect(services.createDeck).not.toHaveBeenCalled();
    expect(services.updateDeck).not.toHaveBeenCalled();
    expect(services.archiveDeck).not.toHaveBeenCalled();
    expect(services.restoreDeck).not.toHaveBeenCalled();
    expect(services.createSeries).not.toHaveBeenCalled();
    expect(services.renameSeries).not.toHaveBeenCalled();
    expect(services.reorderSeries).not.toHaveBeenCalled();
    expect(services.archiveSeries).not.toHaveBeenCalled();
    expect(services.restoreSeries).not.toHaveBeenCalled();
    expect(services.updateSettings).not.toHaveBeenCalled();
  });

  it("renames a series and sets its decks in one call, through the same services as the API", async () => {
    const estonian = {
      id: "series-1",
      name: "Eesti",
      position: 0,
      deckIds: ["deck-2", "deck-1"],
      total: 30,
      due: 4,
      archivedDecks: 0,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    services.renameSeries.mockResolvedValue(estonian);
    services.setSeriesDecks.mockResolvedValue(estonian);
    const client = await connect("write");

    const res = await client.callTool({
      name: "update_series",
      arguments: { seriesId: "series-1", name: "Eesti", deckIds: ["deck-2", "deck-1"] },
    });

    expect(res.isError).toBeFalsy();
    expect(services.renameSeries).toHaveBeenCalledWith(expect.anything(), "series-1", "Eesti");
    expect(services.setSeriesDecks).toHaveBeenCalledWith(expect.anything(), "series-1", {
      deckIds: ["deck-2", "deck-1"],
    });
    expect(res.structuredContent).toEqual({
      id: "series-1",
      name: "Eesti",
      deckIds: ["deck-2", "deck-1"],
      total: 30,
      due: 4,
      archivedDecks: 0,
      archivedAt: null,
      createdAt: now.toISOString(),
    });

    const empty = await client.callTool({
      name: "update_series",
      arguments: { seriesId: "series-1" },
    });
    expect(empty.isError).toBe(true);
  });

  it("archives a series only with an explicit choice about its decks", async () => {
    services.archiveSeries.mockResolvedValue({ ok: true });
    const client = await connect("write");

    const missing = await client.callTool({
      name: "archive_series",
      arguments: { seriesId: "series-1" },
    });
    expect(missing.isError).toBe(true);

    const res = await client.callTool({
      name: "archive_series",
      arguments: { seriesId: "series-1", decks: "archive" },
    });
    expect(res.isError).toBeFalsy();
    expect(services.archiveSeries).toHaveBeenCalledWith(expect.anything(), "series-1", {
      decks: "archive",
    });
  });

  it("edits a deck with only the fields sent", async () => {
    services.updateDeck.mockResolvedValue({ ...deck, name: "Italiano" });
    const client = await connect("write");

    const res = await client.callTool({
      name: "update_deck",
      arguments: { deckId: "deck-1", name: "Italiano" },
    });

    expect(res.isError).toBeFalsy();
    expect(services.updateDeck).toHaveBeenCalledWith(expect.anything(), "deck-1", {
      name: "Italiano",
    });
    expect(res.structuredContent).toMatchObject({ id: "deck-1", name: "Italiano" });
  });

  it("passes the insights period and timezone through", async () => {
    services.insights.mockResolvedValue({
      period: 90,
      recall: { passed: 0, failed: 0, rate: null, series: [] },
      consistency: { days: [], lit: 0, longestRun: 0, litAllTime: 0, daysAllTime: 0 },
      months: [],
      cards: { total: 0, new: 0, learning: 0, known: 0 },
      forecast: [],
      leeches: { lapses: 4, reviews: 6, cards: [] },
    });
    const client = await connect("read");

    const res = await client.callTool({
      name: "get_insights",
      arguments: { period: 90, timezone: "Europe/Tallinn" },
    });

    expect(res.isError).toBeFalsy();
    expect(services.insights).toHaveBeenCalledWith(expect.anything(), {
      period: 90,
      zone: "Europe/Tallinn",
    });
    expect(res.structuredContent).toMatchObject({ period: 90, recall: { rate: null } });
  });

  it("labels an edited meaning or example as ai, and refuses manual from an assistant", async () => {
    services.updateCard.mockResolvedValue({ ...card, meaning: "to rush" });
    const client = await connect("write");

    const edit = await client.callTool({
      name: "update_card",
      arguments: {
        cardId: "card-1",
        meaning: "to rush",
        example: "Sbrigati!",
        exampleSource: "lesson",
      },
    });
    expect(edit.isError).toBeFalsy();
    expect(services.updateCard).toHaveBeenCalledWith(expect.anything(), "card-1", {
      meaning: "to rush",
      meaningSource: "ai",
      example: "Sbrigati!",
      exampleSource: "lesson",
    });

    for (const [name, args] of [
      ["update_card", { cardId: "card-1", meaning: "x", meaningSource: "manual" }],
      [
        "add_cards",
        { cards: [{ deckId: "deck-1", term: "t", example: "e", exampleSource: "manual" }] },
      ],
    ] as const) {
      const res = await client.callTool({ name, arguments: args });
      expect(res.isError, name).toBe(true);
    }
    expect(services.updateCard).toHaveBeenCalledTimes(1);
    expect(services.addCards).not.toHaveBeenCalled();
  });

  it("turns a service error into a tool error instead of a crash", async () => {
    services.getDeck.mockRejectedValue(new ServiceError("not_found", "Deck not found"));
    services.listDeckCards.mockResolvedValue([]);
    const client = await connect("read");

    const res = await client.callTool({ name: "get_deck", arguments: { deckId: "nope" } });

    expect(res.isError).toBe(true);
    expect(res.content[0]).toMatchObject({ type: "text", text: "Deck not found" });
  });

  it("answers an unexpected failure with a retry message, never the internal error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    services.showCard.mockRejectedValue(
      new Error("D1_ERROR: no such column: cards.secret at offset 42 SQLITE_ERROR"),
    );
    const client = await connect("read");

    const res = await client.callTool({ name: "get_card", arguments: { cardId: "card-1" } });

    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.content)).not.toContain("D1_ERROR");
    expect(res.content[0]).toMatchObject({ text: expect.stringContaining("Try again") });
    expect(JSON.stringify(spy.mock.calls)).not.toContain("D1_ERROR");
    expect(spy).toHaveBeenCalledWith("MCP tool failed", { tool: "get_card", error: "Error" });
    spy.mockRestore();
  });

  it("returns a card without the bookkeeping columns", async () => {
    services.showCard.mockResolvedValue(card);
    const client = await connect("read");

    const res = await client.callTool({ name: "get_card", arguments: { cardId: "card-1" } });

    expect(res.structuredContent).toMatchObject({
      id: "card-1",
      term: "sbrigarsi",
      reviewModes: null,
    });
    for (const column of ["createdBy", "updatedAt", "userId", "normalizedTerm", "audioKey"]) {
      expect(res.structuredContent).not.toHaveProperty(column);
    }
  });

  it("returns a card's own review modes as cue and target, beside the legacy direction", async () => {
    services.showCard.mockResolvedValue({
      ...card,
      directions: "production",
      reviewModes: [{ cue: "meaning", target: "term" }],
    });
    const client = await connect("read");

    const res = await client.callTool({ name: "get_card", arguments: { cardId: "card-1" } });

    expect(res.structuredContent).toMatchObject({
      directions: "production",
      reviewModes: [{ cue: "meaning", target: "term" }],
    });
  });

  it("returns a deck with its cards and each card's due time, dates as ISO strings", async () => {
    services.getDeck.mockResolvedValue(deck);
    services.listDeckCards.mockResolvedValue([
      {
        card,
        state: {
          id: "state-1",
          cardId: "card-1",
          userId: "user-1",
          direction: "recognition",
          mode: { cue: "term", target: "meaning" },
          due: now,
          state: 0,
          fsrs: "{}",
          lastReview: null,
          createdAt: now,
          updatedAt: now,
        },
      },
    ]);
    const client = await connect("read");

    const res = await client.callTool({ name: "get_deck", arguments: { deckId: "deck-1" } });

    expect(res.isError).toBeFalsy();
    expect(res.structuredContent).toMatchObject({
      deck: { id: "deck-1", name: "Italian", createdAt: now.toISOString() },
      total: 1,
      truncated: false,
      cards: [{ id: "card-1", term: "sbrigarsi", dueAt: now.toISOString() }],
    });
  });

  it("passes search filters through and names each card's deck", async () => {
    services.searchCards.mockResolvedValue([{ card, deckName: "Italian" }]);
    const client = await connect("read");

    const res = await client.callTool({
      name: "search_cards",
      arguments: { query: "sbrig", deckId: "deck-1", archived: true, limit: 5 },
    });

    expect(res.isError).toBeFalsy();
    expect(services.searchCards).toHaveBeenCalledWith(expect.anything(), {
      query: "sbrig",
      deckId: "deck-1",
      archived: true,
      limit: 5,
    });
    expect(res.structuredContent).toEqual({
      cards: [expect.objectContaining({ id: "card-1", deckName: "Italian" })],
    });
  });

  it("rejects a batch the schema does not allow before any service runs", async () => {
    const client = await connect("write");

    const res = await client.callTool({ name: "add_cards", arguments: { cards: [] } });

    expect(res.isError).toBe(true);
    expect(services.addCards).not.toHaveBeenCalled();
  });
});

describe("withAiSourceDefaults", () => {
  it("labels text the assistant wrote as ai, and leaves a stated source alone", () => {
    expect(
      withAiSourceDefaults<CardInput>({ deckId: "d", term: "t", meaning: "m", example: "e" }),
    ).toEqual({
      deckId: "d",
      term: "t",
      meaning: "m",
      example: "e",
      meaningSource: "ai",
      exampleSource: "ai",
    });
    expect(
      withAiSourceDefaults<CardInput>({
        deckId: "d",
        term: "t",
        meaning: "m",
        meaningSource: "lesson",
      }),
    ).toEqual({ deckId: "d", term: "t", meaning: "m", meaningSource: "lesson" });
  });

  it("does not invent a source for a field that is not there", () => {
    expect(withAiSourceDefaults<CardInput>({ deckId: "d", term: "t" })).toEqual({
      deckId: "d",
      term: "t",
    });
  });
});
