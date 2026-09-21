import { Client } from "@modelcontextprotocol/client";
import { InMemoryTransport } from "@modelcontextprotocol/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "../db";
import type { CardView, getDeck } from "../services";
import { ServiceError } from "../services/context";
import { buildMcpServer, type McpPrincipal } from "./server";

vi.mock("../services", async () => {
  const context = await import("../services/context");
  const { terseOutcome } =
    await vi.importActual<typeof import("../services/cards")>("../services/cards");
  return {
    ...context,
    terseOutcome,
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
    deleteSeries: vi.fn(),
    listSections: vi.fn(),
    createSection: vi.fn(),
    renameSection: vi.fn(),
    reorderSections: vi.fn(),
    setCardsSection: vi.fn(),
    archiveSection: vi.fn(),
    restoreSection: vi.fn(),
    searchCards: vi.fn(),
    showCard: vi.fn(),
    addCards: vi.fn(),
    updateCard: vi.fn(),
    updateCards: vi.fn(),
    archiveCard: vi.fn(),
    archiveCards: vi.fn(),
    restoreCard: vi.fn(),
    restoreCards: vi.fn(),
    requestEnrichment: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    insights: vi.fn(),
    streak: vi.fn(),
  };
});

const services = vi.mocked(await import("../services"));

const now = new Date("2026-09-12T10:00:00.000Z");

const owned = {
  role: "owner" as const,
  owner: { id: "user-1", name: "Kateryna", avatarUrl: null },
  published: false,
};

const deck: Awaited<ReturnType<typeof getDeck>> = {
  id: "deck-1",
  userId: "user-1",
  name: "Italian",
  description: null,
  meaningLanguage: null,
  defaultLanguage: "it",
  directions: "recognition",
  reviewModes: [{ cue: "term", target: "meaning" }],
  position: 0,
  seriesId: null,
  sectionProgression: "automatic",
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
  sectionId: null,
  directions: null,
  reviewModes: null,
  image: null,
  imageVersion: null,
  importId: null,
  externalId: null,
  meaningSource: "ai",
  exampleSource: null,
  pronunciationSource: null,
  enrichmentStatus: null,
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
      "archive_cards",
      "archive_deck",
      "archive_section",
      "create_deck",
      "create_section",
      "create_series",
      "delete_series",
      "describe_card_image",
      "due_counts",
      "enrich_card",
      "get_card",
      "get_deck",
      "get_insights",
      "get_settings",
      "get_streak",
      "list_decks",
      "list_sections",
      "list_series",
      "move_cards_to_section",
      "rename_section",
      "reorder_sections",
      "reorder_series",
      "restore_card",
      "restore_card_image",
      "restore_cards",
      "restore_deck",
      "restore_section",
      "search_cards",
      "set_card_image",
      "update_card",
      "update_cards",
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
        meaningLanguage: null,
        defaultLanguage: "it",
        directions: "recognition",
        reviewModes: [{ cue: "term", target: "meaning" }],
        position: 0,
        seriesId: "series-1",
        sectionProgression: "automatic",
        total: 12,
        due: 3,
        archivedAt: null,
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
      { archived: undefined },
    );
  });

  it("lists archived decks with when each was archived, so one can be found to restore", async () => {
    const archivedAt = new Date("2026-09-01T10:00:00.000Z");
    services.listDecks.mockResolvedValue([
      {
        id: deck.id,
        name: deck.name,
        description: null,
        meaningLanguage: null,
        defaultLanguage: "it",
        directions: "recognition",
        reviewModes: [{ cue: "term", target: "meaning" }],
        position: 0,
        seriesId: null,
        sectionProgression: "automatic",
        total: 12,
        due: 0,
        archivedAt,
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

    const res = await client.callTool({ name: "list_decks", arguments: { archived: true } });

    expect(res.isError).toBeFalsy();
    expect(services.listDecks).toHaveBeenCalledWith(expect.anything(), { archived: true });
    expect(
      (res.structuredContent as { decks: { archivedAt?: string }[] }).decks[0]?.archivedAt,
    ).toBe(archivedAt.toISOString());
  });

  it("adds cards through the service layer and reports duplicates as skipped", async () => {
    services.addCards.mockResolvedValue([
      { id: "card-1", status: "added", card },
      { id: "card-1", status: "skipped", term: "Sbrigarsi", existing: card, deckName: "Italian" },
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
    expect(out.results[0]).toMatchObject({ id: "card-1", status: "added", card: { id: "card-1" } });
    expect(out.results[1]).toMatchObject({
      id: "card-1",
      status: "skipped",
      term: "Sbrigarsi",
      existing: { id: "card-1", deckName: "Italian" },
    });
    // The first meaning was the assistant's own and lands as the learner's; the second said it
    // came from the lesson. Neither is "ai": that badge is Lymi's own enrichment.
    expect(services.addCards).toHaveBeenCalledWith(
      expect.anything(),
      [
        { deckId: "deck-1", term: "sbrigarsi", meaning: "to hurry up" },
        { deckId: "deck-1", term: "Sbrigarsi", meaning: "hurry", meaningSource: "lesson" },
      ],
      undefined,
    );
  });

  it("returns only ids, statuses and enrichment when an add asks for terse", async () => {
    services.addCards.mockResolvedValue([
      {
        id: "card-2",
        status: "added",
        card: { ...card, id: "card-2", enrichmentStatus: "working" },
      },
      { id: "card-1", status: "skipped", term: "Sbrigarsi", existing: card, deckName: "Italian" },
    ]);
    const client = await connect("write");

    const res = await client.callTool({
      name: "add_cards",
      arguments: {
        cards: [
          { deckId: "deck-1", term: "sbrigarsi" },
          { deckId: "deck-1", term: "Sbrigarsi" },
        ],
        response: "terse",
      },
    });

    expect(res.isError).toBeFalsy();
    expect(res.structuredContent).toEqual({
      added: 1,
      skipped: 1,
      results: [
        { id: "card-2", status: "added", enrichmentStatus: "working" },
        { id: "card-1", status: "skipped", enrichmentStatus: null },
      ],
    });
  });

  it("edits many cards in one call and reports each card's outcome in order", async () => {
    services.updateCards.mockResolvedValue([
      { id: "card-1", status: "updated", card: { ...card, source: null } },
      { id: "card-2", status: "error", code: "not_found", error: "Card not found" },
    ]);
    const client = await connect("write");
    const cards = [
      { cardId: "card-1", source: "" },
      { cardId: "card-2", source: "" },
    ];

    const full = await client.callTool({ name: "update_cards", arguments: { cards } });
    expect(full.isError).toBeFalsy();
    expect(services.updateCards).toHaveBeenCalledWith(expect.anything(), cards);
    expect(full.structuredContent).toMatchObject({
      updated: 1,
      failed: 1,
      results: [
        { id: "card-1", status: "updated", card: { id: "card-1", term: "sbrigarsi" } },
        { id: "card-2", status: "error", code: "not_found", error: "Card not found" },
      ],
    });

    const terse = await client.callTool({
      name: "update_cards",
      arguments: { cards, response: "terse" },
    });
    expect(terse.structuredContent).toEqual({
      updated: 1,
      failed: 1,
      results: [
        { id: "card-1", status: "updated" },
        { id: "card-2", status: "error", code: "not_found", error: "Card not found" },
      ],
    });
  });

  it("keeps a single edit's answer the whole card, with no terse option", async () => {
    services.updateCard.mockResolvedValue(card);
    const client = await connect("write");
    const { tools } = await client.listTools();
    const input = tools.find((t) => t.name === "update_card")?.inputSchema.properties ?? {};
    expect(Object.keys(input)).not.toContain("response");

    const res = await client.callTool({
      name: "update_card",
      arguments: { cardId: "card-1", source: "" },
    });

    expect(res.isError).toBeFalsy();
    expect(services.updateCard).toHaveBeenCalledWith(expect.anything(), "card-1", { source: "" });
    expect(res.structuredContent).toMatchObject({ id: "card-1", term: "sbrigarsi" });
  });

  it("archives many cards in one call and reports each card's outcome in order", async () => {
    services.archiveCards.mockResolvedValue([
      { id: "card-1", status: "archived" },
      { id: "card-2", status: "error", code: "not_found", error: "Card not found" },
    ]);
    const client = await connect("write");

    const res = await client.callTool({
      name: "archive_cards",
      arguments: { cardIds: ["card-1", "card-2"] },
    });

    expect(res.isError).toBeFalsy();
    expect(res.structuredContent).toEqual({
      archived: 1,
      failed: 1,
      results: [
        { id: "card-1", status: "archived" },
        { id: "card-2", status: "error", code: "not_found", error: "Card not found" },
      ],
    });
  });

  it("restores many cards in one call and reports each card's outcome in order", async () => {
    services.restoreCards.mockResolvedValue([
      { id: "card-1", status: "restored" },
      { id: "card-2", status: "error", code: "unavailable", error: "Try again." },
    ]);
    const client = await connect("write");

    const res = await client.callTool({
      name: "restore_cards",
      arguments: { cardIds: ["card-1", "card-2"] },
    });

    expect(res.isError).toBeFalsy();
    expect(services.restoreCards).toHaveBeenCalledWith(expect.anything(), ["card-1", "card-2"]);
    expect(res.structuredContent).toEqual({
      restored: 1,
      failed: 1,
      results: [
        { id: "card-1", status: "restored" },
        { id: "card-2", status: "error", code: "unavailable", error: "Try again." },
      ],
    });
  });

  it("refuses a bulk edit that lists a card twice or sends more than 200", async () => {
    const client = await connect("write");
    const twice = await client.callTool({
      name: "update_cards",
      arguments: { cards: [{ cardId: "card-1" }, { cardId: "card-1" }] },
    });
    const tooMany = await client.callTool({
      name: "archive_cards",
      arguments: { cardIds: Array.from({ length: 201 }, (_, i) => `card-${i}`) },
    });
    expect(twice.isError).toBe(true);
    expect(tooMany.isError).toBe(true);
    expect(services.updateCards).not.toHaveBeenCalled();
    expect(services.archiveCards).not.toHaveBeenCalled();
  });

  it("passes the add's enrich choice through and enriches one card on request", async () => {
    services.addCards.mockResolvedValue([{ id: "card-1", status: "added", card }]);
    services.requestEnrichment.mockResolvedValue({ ...card, enrichmentStatus: "working" });
    const client = await connect("write");

    await client.callTool({
      name: "add_cards",
      arguments: { cards: [{ deckId: "deck-1", term: "sbrigarsi", enrich: true }] },
    });
    expect(services.addCards).toHaveBeenCalledWith(
      expect.anything(),
      [{ deckId: "deck-1", term: "sbrigarsi", enrich: true }],
      undefined,
    );

    const res = await client.callTool({ name: "enrich_card", arguments: { cardId: "card-1" } });
    expect(res.isError).toBeFalsy();
    expect((res.structuredContent as { enrichmentStatus: string }).enrichmentStatus).toBe(
      "working",
    );
    expect(services.requestEnrichment).toHaveBeenCalledWith(expect.anything(), "card-1", null);
  });

  it("refuses every write on a read-only token and says how to fix it", async () => {
    const client = await connect("read");

    for (const [name, args] of [
      ["add_cards", { cards: [{ deckId: "deck-1", term: "ciao" }] }],
      ["update_card", { cardId: "card-1", meaning: "hi" }],
      ["update_cards", { cards: [{ cardId: "card-1", meaning: "hi" }] }],
      ["archive_card", { cardId: "card-1" }],
      ["archive_cards", { cardIds: ["card-1"] }],
      ["restore_card", { cardId: "card-1" }],
      ["restore_cards", { cardIds: ["card-1"] }],
      ["create_deck", { name: "Spanish" }],
      ["update_deck", { deckId: "deck-1", name: "Italiano" }],
      ["archive_deck", { deckId: "deck-1" }],
      ["restore_deck", { deckId: "deck-1" }],
      ["create_series", { name: "Estonian" }],
      ["update_series", { seriesId: "series-1", name: "Eesti" }],
      ["reorder_series", { seriesIds: ["series-1"] }],
      ["delete_series", { seriesId: "series-1", decks: "keep" }],
      ["create_section", { deckId: "deck-1", name: "Lesson 1" }],
      ["rename_section", { sectionId: "section-1", name: "Lesson 2" }],
      ["reorder_sections", { deckId: "deck-1", sectionIds: ["section-1"] }],
      ["move_cards_to_section", { deckId: "deck-1", cardIds: ["card-1"], sectionId: null }],
      ["archive_section", { sectionId: "section-1", cards: "keep" }],
      ["restore_section", { sectionId: "section-1" }],
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
    expect(services.updateCards).not.toHaveBeenCalled();
    expect(services.archiveCard).not.toHaveBeenCalled();
    expect(services.archiveCards).not.toHaveBeenCalled();
    expect(services.restoreCard).not.toHaveBeenCalled();
    expect(services.restoreCards).not.toHaveBeenCalled();
    expect(services.createDeck).not.toHaveBeenCalled();
    expect(services.updateDeck).not.toHaveBeenCalled();
    expect(services.archiveDeck).not.toHaveBeenCalled();
    expect(services.restoreDeck).not.toHaveBeenCalled();
    expect(services.createSeries).not.toHaveBeenCalled();
    expect(services.renameSeries).not.toHaveBeenCalled();
    expect(services.reorderSeries).not.toHaveBeenCalled();
    expect(services.deleteSeries).not.toHaveBeenCalled();
    expect(services.createSection).not.toHaveBeenCalled();
    expect(services.renameSection).not.toHaveBeenCalled();
    expect(services.reorderSections).not.toHaveBeenCalled();
    expect(services.setCardsSection).not.toHaveBeenCalled();
    expect(services.archiveSection).not.toHaveBeenCalled();
    expect(services.restoreSection).not.toHaveBeenCalled();
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
      createdAt: now.toISOString(),
    });

    const empty = await client.callTool({
      name: "update_series",
      arguments: { seriesId: "series-1" },
    });
    expect(empty.isError).toBe(true);
  });

  it("moves many cards to a section in one call, through the same service as the API", async () => {
    const section = {
      id: "section-1",
      deckId: "deck-1",
      name: "Lesson 14",
      position: 0,
      total: 2,
      known: 0,
      notStarted: 2,
      knownNeeded: 2,
      status: "open" as const,
      archivedCards: 0,
      archivedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    services.setCardsSection.mockResolvedValue({
      sections: [section],
      progress: { currentId: "section-1", nextId: null, ready: false },
    });
    const client = await connect("write");

    const res = await client.callTool({
      name: "move_cards_to_section",
      arguments: { deckId: "deck-1", cardIds: ["card-1", "card-2"], sectionId: "section-1" },
    });

    expect(res.isError).toBeFalsy();
    expect(services.setCardsSection).toHaveBeenCalledWith(expect.anything(), "deck-1", {
      cardIds: ["card-1", "card-2"],
      sectionId: "section-1",
    });
    expect(res.structuredContent).toMatchObject({
      sections: [{ id: "section-1", status: "open", total: 2 }],
      progress: { currentId: "section-1" },
    });
  });

  it("refuses a move that lists a card twice, as the API does", async () => {
    const client = await connect("write");
    const res = await client.callTool({
      name: "move_cards_to_section",
      arguments: { deckId: "deck-1", cardIds: ["card-1", "card-1"], sectionId: null },
    });
    expect(res.isError).toBe(true);
    expect(services.setCardsSection).not.toHaveBeenCalled();
  });

  it("archives a section only with an explicit choice about its cards", async () => {
    services.archiveSection.mockResolvedValue({ ok: true });
    const client = await connect("write");

    const missing = await client.callTool({
      name: "archive_section",
      arguments: { sectionId: "section-1" },
    });
    expect(missing.isError).toBe(true);

    await client.callTool({
      name: "archive_section",
      arguments: { sectionId: "section-1", cards: "archive" },
    });
    expect(services.archiveSection).toHaveBeenCalledWith(expect.anything(), "section-1", {
      cards: "archive",
    });
  });

  it("deletes a series only with an explicit choice about its decks", async () => {
    services.deleteSeries.mockResolvedValue({ ok: true });
    const client = await connect("write");

    const missing = await client.callTool({
      name: "delete_series",
      arguments: { seriesId: "series-1" },
    });
    expect(missing.isError).toBe(true);

    const res = await client.callTool({
      name: "delete_series",
      arguments: { seriesId: "series-1", decks: "archive" },
    });
    expect(res.isError).toBeFalsy();
    expect(services.deleteSeries).toHaveBeenCalledWith(expect.anything(), "series-1", {
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
      activity: { today: "2026-09-18", goal: 50, firstDay: null, days: [] },
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

  it("passes an edit through without inventing a source, and refuses ai from an assistant", async () => {
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
      example: "Sbrigati!",
      exampleSource: "lesson",
    });

    for (const [name, args] of [
      ["update_card", { cardId: "card-1", meaning: "x", meaningSource: "ai" }],
      [
        "add_cards",
        { cards: [{ deckId: "deck-1", term: "t", example: "e", exampleSource: "ai" }] },
      ],
    ] as const) {
      const res = await client.callTool({ name, arguments: args });
      expect(res.isError, name).toBe(true);
    }
    expect(services.updateCard).toHaveBeenCalledTimes(1);
    expect(services.addCards).not.toHaveBeenCalled();
  });

  it("describes notes as the Markdown subset and passes the source through unchanged", async () => {
    const notes = "**hea aeg** → *head aega*\n\n- hea → head\n- aeg → aega";
    services.addCards.mockResolvedValue([
      { id: "card-1", status: "added", card: { ...card, notes } },
    ]);
    services.updateCard.mockResolvedValue({ ...card, notes });
    const client = await connect("write");

    const { tools } = await client.listTools();
    for (const name of ["add_cards", "update_card"]) {
      const schema = JSON.stringify(tools.find((t) => t.name === name)?.inputSchema);
      expect(schema, name).toContain("**bold**, *italic*");
    }

    const add = await client.callTool({
      name: "add_cards",
      arguments: { cards: [{ deckId: "deck-1", term: "Head aega!", notes }] },
    });
    expect(add.isError).toBeFalsy();
    expect(services.addCards).toHaveBeenCalledWith(
      expect.anything(),
      [{ deckId: "deck-1", term: "Head aega!", notes }],
      undefined,
    );

    const edit = await client.callTool({
      name: "update_card",
      arguments: { cardId: "card-1", notes },
    });
    expect(edit.isError).toBeFalsy();
    expect(services.updateCard).toHaveBeenCalledWith(expect.anything(), "card-1", { notes });
    expect((edit.structuredContent as { notes: string }).notes).toBe(notes);
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
    services.searchCards.mockResolvedValue({
      cards: [{ card, deckName: "Italian" }],
      next: "1700000000000.card-1",
      total: 7,
    });
    const client = await connect("read");

    const res = await client.callTool({
      name: "search_cards",
      arguments: {
        query: "sbrig",
        term: "sbrigarsi",
        deckId: "deck-1",
        sectionId: "section-1",
        archived: true,
        limit: 5,
        after: "c2Vjb25kLXBhZ2U",
      },
    });

    expect(res.isError).toBeFalsy();
    expect(services.searchCards).toHaveBeenCalledWith(expect.anything(), {
      query: "sbrig",
      term: "sbrigarsi",
      deckId: "deck-1",
      sectionId: "section-1",
      archived: true,
      limit: 5,
      after: "c2Vjb25kLXBhZ2U",
    });
    expect(res.structuredContent).toEqual({
      cards: [expect.objectContaining({ id: "card-1", deckName: "Italian" })],
      next: "1700000000000.card-1",
      total: 7,
    });
  });

  it("rejects a cursor this search did not hand out", async () => {
    const client = await connect("read");

    const res = await client.callTool({ name: "search_cards", arguments: { after: "page 2" } });

    expect(res.isError).toBe(true);
    expect(services.searchCards).not.toHaveBeenCalled();
  });

  it("takes a structured filter, sort and stats, and sends each card's review record", async () => {
    const reviewed = new Date("2026-09-10T08:00:00.000Z");
    const record = {
      reviewCount: 3,
      lapses: 2,
      lastRating: 1,
      lastReviewedAt: reviewed,
      dueAt: null,
      slipping: false,
    };
    services.searchCards.mockResolvedValue({
      cards: [
        {
          card,
          deckName: "Italian",
          stats: { ...record, modes: [{ mode: { cue: "term", target: "meaning" }, ...record }] },
        },
      ],
      next: null,
      total: 1,
    });
    const client = await connect("read");
    const search = {
      filter: {
        exampleSource: { eq: "ai" },
        sectionId: { in: ["section-1", "section-2"] },
        reviews: { since: "-P30D", lapses: { gte: 1 }, lastRating: { in: [1, 2] } },
      },
      sort: [{ field: "lapses", direction: "desc" }],
      stats: true,
    };

    const res = await client.callTool({ name: "search_cards", arguments: search });

    expect(res.isError).toBeFalsy();
    expect(services.searchCards).toHaveBeenCalledWith(expect.anything(), search);
    const out = { ...record, lastReviewedAt: reviewed.toISOString() };
    expect(res.structuredContent).toMatchObject({
      cards: [
        {
          id: "card-1",
          stats: { ...out, modes: [{ mode: { cue: "term", target: "meaning" }, ...out }] },
        },
      ],
    });
  });

  it("refuses a filter with more than 50 comparisons before any service runs", async () => {
    const client = await connect("read");
    const ids = Array.from({ length: 51 }, (_, i) => `deck-${i}`);
    const filter = Object.fromEntries(
      ["deckId", "sectionId", "language"].map((field, i) => [
        field,
        { eq: ids[i], neq: ids[i + 1], null: false },
      ]),
    );
    const many = { ...filter, createdAt: { gte: "-P1D" } };
    const big = {
      ...many,
      reviews: {
        count: { gte: 1, lte: 99, neq: 5, gt: 0, lt: 100, in: [1, 2], nin: [3], eq: 4 },
        lapses: { gte: 1, lte: 99, neq: 5, gt: 0, lt: 100, in: [1, 2], nin: [3], eq: 4 },
        lapseRate: { gte: 0, lte: 1, neq: 0.5, gt: 0, lt: 1, in: [0.1], nin: [0.2], eq: 0.3 },
        lastRating: { gte: 1, lte: 4, neq: 2, gt: 0, lt: 5, in: [1], nin: [3], eq: 1 },
      },
      term: { eq: "a", neq: "b", contains: "c", notContains: "d", startsWith: "e", endsWith: "f" },
      meaning: {
        eq: "a",
        neq: "b",
        contains: "c",
        notContains: "d",
        startsWith: "e",
        endsWith: "f",
      },
    };

    const res = await client.callTool({ name: "search_cards", arguments: { filter: big } });

    expect(res.isError).toBe(true);
    expect(JSON.stringify(res.content)).toContain("at most 50 comparisons");
    expect(services.searchCards).not.toHaveBeenCalled();
  });

  it("describes search_cards with a schema that has no references, so strict clients accept it", async () => {
    const client = await connect("read");

    const { tools } = await client.listTools();
    const schema = JSON.stringify(tools.find((tool) => tool.name === "search_cards")?.inputSchema);

    expect(schema).toContain('"filter"');
    expect(schema).not.toContain("$ref");
    expect(schema).not.toContain("$defs");
    expect(schema).not.toContain("definitions");
  });

  it("rejects a batch the schema does not allow before any service runs", async () => {
    const client = await connect("write");

    const res = await client.callTool({ name: "add_cards", arguments: { cards: [] } });

    expect(res.isError).toBe(true);
    expect(services.addCards).not.toHaveBeenCalled();
  });
});
