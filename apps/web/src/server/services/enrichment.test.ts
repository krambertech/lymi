import { CardInput } from "@lymi/core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { TextProvider, TextRequest } from "../ai";
import type { Db } from "../db";
import { addCards, cardHistory, showCard } from "./cards";
import { createDeck } from "./decks";
import {
  CARDS_PER_CALL,
  chunked,
  type EnrichmentQueue,
  emptyFields,
  enrichCards,
  enrichmentQueue,
  enrichmentWrite,
  failEnrichment,
  needsEnrichment,
} from "./enrichment";
import { updateSettings } from "./settings";
import { learner, testDb } from "./test-db";

const full = {
  meaning: "to hurry up",
  example: "Sbrigati, il treno parte!",
  pronunciation: "zbriˈgarsi",
  language: "it",
};

describe("emptyFields", () => {
  it("names every enrichable field with no text, treating whitespace as none", () => {
    expect(emptyFields({ ...full, meaning: null, example: "  " })).toEqual(["meaning", "example"]);
    expect(emptyFields(full)).toEqual([]);
    expect(needsEnrichment(full)).toBe(false);
    expect(needsEnrichment({ ...full, pronunciation: null })).toBe(true);
  });
});

describe("enrichmentQueue", () => {
  const workflow: EnrichmentQueue = { create: async () => undefined };

  it("is null without an OpenAI key or without the binding, so no run is queued", () => {
    expect(enrichmentQueue({ OPENAI_API_KEY: "sk-test", ENRICH_WORKFLOW: workflow })).toBe(
      workflow,
    );
    expect(enrichmentQueue({ ENRICH_WORKFLOW: workflow })).toBeNull();
    expect(enrichmentQueue({ OPENAI_API_KEY: "  ", ENRICH_WORKFLOW: workflow })).toBeNull();
    expect(enrichmentQueue({ OPENAI_API_KEY: "sk-test" })).toBeNull();
  });
});

describe("chunked", () => {
  it("keeps order, so the first cards fill before the last", () => {
    expect(chunked([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunked([], 10)).toEqual([]);
    expect(
      chunked(
        Array.from({ length: 40 }, (_, i) => i),
        CARDS_PER_CALL,
      ),
    ).toHaveLength(4);
  });
});

describe("enrichmentWrite", () => {
  const reply = {
    id: "c1",
    meaning: "AI meaning",
    example: "AI example",
    pronunciation: "ˈaɪ",
    language: "it",
  };

  it("fills only empty fields and labels each filled text ai", () => {
    expect(
      enrichmentWrite({ meaning: null, example: null, pronunciation: null, language: null }, reply),
    ).toEqual({
      meaning: "AI meaning",
      meaningSource: "ai",
      example: "AI example",
      exampleSource: "ai",
      pronunciation: "ˈaɪ",
      pronunciationSource: "ai",
      language: "it",
    });
  });

  it("never overwrites text already on the card, whatever wrote it", () => {
    const write = enrichmentWrite(
      { meaning: "from the lesson", example: null, pronunciation: "zbriˈgarsi", language: "it" },
      reply,
    );
    expect(write).toEqual({ example: "AI example", exampleSource: "ai" });
  });

  it("drops a value the model left out and a language tag that is not one", () => {
    expect(
      enrichmentWrite(
        { meaning: null, example: null, pronunciation: null, language: null },
        { ...reply, meaning: null, example: "   ", pronunciation: null, language: "Italian" },
      ),
    ).toEqual({});
  });
});

/** A provider that answers from a fixture and records what it was asked. */
function fakeProvider(reply: unknown): TextProvider & { asked: TextRequest[] } {
  const asked: TextRequest[] = [];
  return {
    provider: "openai",
    model: "test",
    asked,
    complete: async (request) => {
      asked.push(request);
      return reply;
    },
  };
}

describe("enrichCards", () => {
  let db: Db;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ db, dispose } = await testDb());
  }, 60_000);

  afterAll(async () => {
    await dispose();
  });

  /** An add with a queue, so every card with an empty field starts at `working`. */
  const queue: EnrichmentQueue = { create: async () => undefined };

  it("fills empty fields, leaves the lesson's meaning alone and records one Activity row", async () => {
    const ctx = await learner(db, "enrich-1", "Kateryna");
    const deck = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const outcomes = await addCards(
      ctx,
      [
        CardInput.parse({ deckId: deck.id, term: "sbrigarsi" }),
        CardInput.parse({
          deckId: deck.id,
          term: "magari",
          meaning: "if only",
          meaningSource: "lesson",
        }),
      ],
      queue,
    );
    const ids = outcomes.map((o) => (o.status === "added" ? o.card.id : ""));
    expect(outcomes.every((o) => o.status === "added" && o.card.enrichmentStatus === "working"));

    const provider = fakeProvider({
      cards: [
        {
          id: ids[0],
          meaning: "to hurry up",
          example: "Sbrigati!",
          pronunciation: "zbriˈgarsi",
          language: "it",
        },
        {
          id: ids[1],
          meaning: "overwritten",
          example: "Magari!",
          pronunciation: "maˈgari",
          language: "it",
        },
      ],
    });
    const { enriched } = await enrichCards({ ...ctx, actor: "ai" }, ids as string[], provider);
    expect(enriched).toBe(2);

    const first = await showCard(ctx, ids[0] as string);
    expect(first.meaning).toBe("to hurry up");
    expect(first.meaningSource).toBe("ai");
    expect(first.exampleSource).toBe("ai");
    expect(first.pronunciationSource).toBe("ai");
    expect(first.enrichmentStatus).toBeNull();

    const second = await showCard(ctx, ids[1] as string);
    expect(second.meaning).toBe("if only");
    expect(second.meaningSource).toBe("lesson");
    expect(second.example).toBe("Magari!");

    const history = await cardHistory(ctx, ids[0] as string);
    const enrichments = history.events.filter((e) => e.actor === "ai" && e.action === "update");
    expect(enrichments).toHaveLength(1);
    expect(Object.keys(enrichments[0]?.payload as object)).toContain("meaning");
  });

  it("writes meanings in the learner's meaning language", async () => {
    const ctx = await learner(db, "enrich-2", "Kateryna");
    await updateSettings(ctx, { appLanguage: "uk" });
    const deck = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const [added] = await addCards(
      ctx,
      [CardInput.parse({ deckId: deck.id, term: "sbrigarsi" })],
      queue,
    );
    if (added?.status !== "added") throw new Error("not added");
    const provider = fakeProvider({
      cards: [
        {
          id: added.card.id,
          meaning: "поспішати",
          example: "Sbrigati!",
          pronunciation: null,
          language: "it",
        },
      ],
    });
    await enrichCards({ ...ctx, actor: "ai" }, [added.card.id], provider);
    expect(JSON.parse(provider.asked[0]?.input ?? "{}").meaningLanguage).toBe("uk");
    expect((await showCard(ctx, added.card.id)).meaning).toBe("поспішати");
  });

  it("leaves a card exactly as it arrived when no queue takes the add", async () => {
    const ctx = await learner(db, "enrich-3", "Kateryna");
    const deck = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const [added] = await addCards(ctx, [CardInput.parse({ deckId: deck.id, term: "magari" })]);
    if (added?.status !== "added") throw new Error("not added");
    expect(added.card.enrichmentStatus).toBeNull();
  });

  it("ends a card that gives up at failed rather than working", async () => {
    const ctx = await learner(db, "enrich-4", "Kateryna");
    const deck = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const [added] = await addCards(
      ctx,
      [CardInput.parse({ deckId: deck.id, term: "sbrigarsi" })],
      queue,
    );
    if (added?.status !== "added") throw new Error("not added");
    await failEnrichment(db, ctx.userId, [added.card.id]);
    expect((await showCard(ctx, added.card.id)).enrichmentStatus).toBe("failed");
  });

  it("settles a card the model answered nothing for, so nothing waits forever", async () => {
    const ctx = await learner(db, "enrich-5", "Kateryna");
    const deck = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const [added] = await addCards(
      ctx,
      [CardInput.parse({ deckId: deck.id, term: "sbrigarsi" })],
      queue,
    );
    if (added?.status !== "added") throw new Error("not added");
    const { enriched } = await enrichCards(
      { ...ctx, actor: "ai" },
      [added.card.id],
      fakeProvider({ cards: [] }),
    );
    expect(enriched).toBe(0);
    const card = await showCard(ctx, added.card.id);
    expect(card.enrichmentStatus).toBeNull();
    expect(card.meaning).toBeNull();
  });

  it("marks the cards failed when the queue refuses the run, and the add still succeeds", async () => {
    const ctx = await learner(db, "enrich-6", "Kateryna");
    const deck = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const refusing: EnrichmentQueue = {
      create: vi.fn().mockRejectedValue(new Error("no workflow here")),
    };
    const [added] = await addCards(
      ctx,
      [CardInput.parse({ deckId: deck.id, term: "sbrigarsi" })],
      refusing,
    );
    if (added?.status !== "added") throw new Error("not added");
    expect(added.card.enrichmentStatus).toBe("failed");
    expect((await showCard(ctx, added.card.id)).enrichmentStatus).toBe("failed");
  });
});
