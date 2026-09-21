import { CardInput, CardPatch, emptyFields, needsEnrichment } from "@lymi/core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { TextProvider, TextRequest } from "../ai";
import type { Db } from "../db";
import {
  addCards,
  archiveCard,
  cardHistory,
  requestEnrichment,
  showCard,
  updateCard,
} from "./cards";
import { ServiceError } from "./context";
import { createDeck } from "./decks";
import {
  CARDS_PER_CALL,
  chunked,
  type EnrichmentQueue,
  enrichCards,
  enrichmentQueue,
  enrichmentWrite,
  failEnrichment,
} from "./enrichment";
import { join } from "./members";
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
    expect(
      outcomes.every((o) => o.status === "added" && o.card.enrichmentStatus === "working"),
    ).toBe(true);

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
    const enrichments = history.events.filter((e) => e.actor === "ai" && e.action === "enrich");
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

  it("leaves an integration's card unenriched unless the card asks", async () => {
    const ctx = await learner(db, "enrich-mcp", "Kateryna");
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    const statuses = async (actor: "mcp" | "api") =>
      (
        await addCards(
          { ...ctx, actor },
          [
            CardInput.parse({ deckId: deck.id, term: `pere ${actor}` }),
            CardInput.parse({ deckId: deck.id, term: `ema ${actor}`, enrich: true }),
          ],
          queue,
        )
      ).map((o) => (o.status === "added" ? o.card.enrichmentStatus : "skipped"));
    expect(await statuses("mcp")).toEqual([null, "working"]);
    expect(await statuses("api")).toEqual([null, "working"]);
  });

  it("lets the learner in the app turn enrichment off for one card", async () => {
    const ctx = await learner(db, "enrich-off", "Kateryna");
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    const [added] = await addCards(
      ctx,
      [CardInput.parse({ deckId: deck.id, term: "isa", enrich: false })],
      queue,
    );
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

  it("keeps what the learner typed while the model was thinking", async () => {
    const ctx = await learner(db, "enrich-7", "Kateryna");
    const deck = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const [added] = await addCards(
      ctx,
      [CardInput.parse({ deckId: deck.id, term: "sbrigarsi" })],
      queue,
    );
    if (added?.status !== "added") throw new Error("not added");

    // The provider stands in for a slow model: the learner saves a meaning mid-call.
    const provider: TextProvider = {
      provider: "openai",
      model: "test",
      complete: async () => {
        await updateCard(
          ctx,
          added.card.id,
          CardPatch.parse({ meaning: "mine", meaningSource: "manual" }),
        );
        return {
          cards: [
            {
              id: added.card.id,
              meaning: "the model's",
              example: "Sbrigati!",
              pronunciation: null,
              language: null,
            },
          ],
        };
      },
    };
    await enrichCards({ ...ctx, actor: "ai" }, [added.card.id], provider);

    const card = await showCard(ctx, added.card.id);
    expect(card.meaning).toBe("mine");
    expect(card.meaningSource).toBe("manual");
    // The field that was still empty is filled, and the card settles either way.
    expect(card.example).toBe("Sbrigati!");
    expect(card.enrichmentStatus).toBeNull();

    // Activity names what landed, not what was attempted.
    const history = await cardHistory(ctx, added.card.id);
    const enriched = history.events.filter((e) => e.actor === "ai" && e.action === "enrich");
    expect(enriched).toHaveLength(1);
    const { landedIn: _deck, ...fields } = (enriched[0]?.payload ?? {}) as Record<string, unknown>;
    expect(Object.keys(fields)).toEqual(["example"]);
  });

  it("keeps a field cleared while the model was thinking empty", async () => {
    const ctx = await learner(db, "enrich-clear", "Kateryna");
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    const [added] = await addCards(
      ctx,
      [CardInput.parse({ deckId: deck.id, term: "pere" })],
      queue,
    );
    if (added?.status !== "added") throw new Error("not added");

    const provider: TextProvider = {
      provider: "openai",
      model: "test",
      complete: async () => {
        await updateCard(ctx, added.card.id, CardPatch.parse({ example: "" }));
        return {
          cards: [
            {
              id: added.card.id,
              meaning: "family",
              example: "Minu pere on suur.",
              pronunciation: null,
              language: null,
            },
          ],
        };
      },
    };
    await enrichCards({ ...ctx, actor: "ai" }, [added.card.id], provider);

    const card = await showCard(ctx, added.card.id);
    expect(card.example).toBeFalsy();
    expect(card.meaning).toBe("family");
    expect(card.enrichmentStatus).toBeNull();
  });

  it("keeps a field cleared before its wave started empty, and reopens it on request", async () => {
    const ctx = await learner(db, "enrich-wave", "Kateryna");
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    const [added] = await addCards(
      ctx,
      [CardInput.parse({ deckId: deck.id, term: "ema", example: "Ema on kodus." })],
      queue,
    );
    if (added?.status !== "added") throw new Error("not added");
    // The agent clears the example long before the run reaches this card.
    await updateCard(ctx, added.card.id, CardPatch.parse({ example: "" }));
    const reply = {
      cards: [
        {
          id: added.card.id,
          meaning: "mother",
          example: "Minu ema on õpetaja.",
          pronunciation: null,
          language: null,
        },
      ],
    };
    await enrichCards({ ...ctx, actor: "ai" }, [added.card.id], fakeProvider(reply));
    expect((await showCard(ctx, added.card.id)).example).toBe("");

    // Asking for enrichment is changing their mind: the blank field is open to fill again.
    const asked = await requestEnrichment(ctx, added.card.id, queue);
    expect(asked.example).toBeNull();
    await enrichCards({ ...ctx, actor: "ai" }, [added.card.id], fakeProvider(reply));
    expect((await showCard(ctx, added.card.id)).example).toBe("Minu ema on õpetaja.");
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

describe("requestEnrichment", () => {
  let db: Db;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ db, dispose } = await testDb());
  }, 60_000);

  afterAll(async () => {
    await dispose();
  });

  /** A card with only a term, added without a queue, the way one added before enrichment existed is. */
  async function bareCard(who: string) {
    const ctx = await learner(db, who, "Kateryna");
    const deck = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const [added] = await addCards(ctx, [CardInput.parse({ deckId: deck.id, term: "sbrigarsi" })]);
    if (added?.status !== "added") throw new Error("not added");
    return { ctx, deck, card: added.card };
  }

  const code = async (run: Promise<unknown>) =>
    run.then(
      () => "no error",
      (error: unknown) => (error instanceof ServiceError ? error.code : String(error)),
    );

  it("moves the card to working and hands the run over", async () => {
    const { ctx, card } = await bareCard("ask-1");
    const queue: EnrichmentQueue = { create: vi.fn().mockResolvedValue(undefined) };
    const asked = await requestEnrichment(ctx, card.id, queue);
    expect(asked.enrichmentStatus).toBe("working");
    expect((await showCard(ctx, card.id)).enrichmentStatus).toBe("working");
    expect(queue.create).toHaveBeenCalledWith(
      expect.objectContaining({ params: { userId: ctx.userId, cardIds: [card.id] } }),
    );
  });

  it("asking twice queues one run, because the outstanding one is the answer", async () => {
    const { ctx, card } = await bareCard("ask-2");
    const queue: EnrichmentQueue = { create: vi.fn().mockResolvedValue(undefined) };
    await requestEnrichment(ctx, card.id, queue);
    const again = await requestEnrichment(ctx, card.id, queue);
    expect(again.enrichmentStatus).toBe("working");
    expect(queue.create).toHaveBeenCalledTimes(1);
  });

  it("lifts a failed card back to working, so the quiet line's Try again works", async () => {
    const { ctx, card } = await bareCard("ask-3");
    await failEnrichment(db, ctx.userId, [card.id]);
    const queue: EnrichmentQueue = { create: vi.fn().mockResolvedValue(undefined) };
    expect((await requestEnrichment(ctx, card.id, queue)).enrichmentStatus).toBe("working");
  });

  it("refuses a card with no empty field rather than accepting it silently", async () => {
    const { ctx, card } = await bareCard("ask-4");
    await updateCard(ctx, card.id, CardPatch.parse(full));
    expect(needsEnrichment(await showCard(ctx, card.id))).toBe(false);
    const queue: EnrichmentQueue = { create: vi.fn() };
    expect(await code(requestEnrichment(ctx, card.id, queue))).toBe("invalid");
    expect(queue.create).not.toHaveBeenCalled();
    expect((await showCard(ctx, card.id)).enrichmentStatus).toBeNull();
  });

  it("forbids a member of a shared deck who does not own the card", async () => {
    const { ctx, deck, card } = await bareCard("ask-5");
    const anna = await learner(db, "ask-5-anna", "Anna");
    await join(anna, deck.id);
    // Anna can read the card, which is what makes this forbidden rather than not found.
    expect(emptyFields(await showCard(anna, card.id))).toContain("meaning");
    const queue: EnrichmentQueue = { create: vi.fn() };
    expect(await code(requestEnrichment(anna, card.id, queue))).toBe("forbidden");
    expect(queue.create).not.toHaveBeenCalled();
    expect((await showCard(ctx, card.id)).enrichmentStatus).toBeNull();
  });

  it("is not found for a stranger, who cannot see the card at all", async () => {
    const { card } = await bareCard("ask-6");
    const marko = await learner(db, "ask-6-marko", "Marko");
    expect(await code(requestEnrichment(marko, card.id, { create: vi.fn() }))).toBe("not_found");
  });

  it("says the server cannot when no text vendor is configured", async () => {
    const { ctx, card } = await bareCard("ask-7");
    expect(await code(requestEnrichment(ctx, card.id, null))).toBe("unavailable");
    expect((await showCard(ctx, card.id)).enrichmentStatus).toBeNull();
  });

  it("refuses an archived card, which no run would reach", async () => {
    const { ctx, card } = await bareCard("ask-8");
    await archiveCard(ctx, card.id);
    expect(await code(requestEnrichment(ctx, card.id, { create: vi.fn() }))).toBe("invalid");
  });

  it("leaves the card failed when the queue refuses the run", async () => {
    const { ctx, card } = await bareCard("ask-9");
    const refusing: EnrichmentQueue = {
      create: vi.fn().mockRejectedValue(new Error("no workflow")),
    };
    expect((await requestEnrichment(ctx, card.id, refusing)).enrichmentStatus).toBe("failed");
    expect((await showCard(ctx, card.id)).enrichmentStatus).toBe("failed");
  });

  it("fills only what was still empty, so a hand-written meaning is kept", async () => {
    const { ctx, card } = await bareCard("ask-10");
    await updateCard(ctx, card.id, CardPatch.parse({ meaning: "mine", meaningSource: "manual" }));
    await requestEnrichment(ctx, card.id, { create: async () => undefined });
    await enrichCards(
      { ...ctx, actor: "ai" },
      [card.id],
      fakeProvider({ cards: [{ id: card.id, ...full, meaning: "the model\u2019s" }] }),
    );
    const after = await showCard(ctx, card.id);
    expect(after.meaning).toBe("mine");
    expect(after.meaningSource).toBe("manual");
    expect(after.example).toBe(full.example);
    expect(after.exampleSource).toBe("ai");
    expect(after.enrichmentStatus).toBeNull();
  });
});
