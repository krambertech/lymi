import { CardInput, CardPatch } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { TextProvider, TextRequest } from "../ai";
import { type Db, schema } from "../db";
import { addCards, updateCard } from "./cards";
import { STYLE_LEARN_AFTER, STYLE_RELEARN_AFTER, spread } from "./deck-style";
import { createDeck, updateDeck } from "./decks";
import { enrichCards, learnDeckStyles } from "./index";
import { learner, testDb } from "./test-db";

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

const article = { style: "Meanings usually give the article." };

describe("spread", () => {
  it("takes cards from the whole deck, first and last included", () => {
    expect(spread([1, 2, 3], 5)).toEqual([1, 2, 3]);
    expect(spread([...Array(100).keys()], 5)).toEqual([0, 25, 50, 74, 99]);
  });
});

describe("learnDeckStyles", () => {
  let db: Db;
  let dispose: () => Promise<void>;
  let clock = Date.parse("2026-10-01T09:00:00Z");
  /** Moves the clock a minute on, so every write lands after the one before it. */
  const tick = () => {
    clock += 60_000;
    vi.setSystemTime(clock);
  };

  beforeAll(async () => {
    ({ db, dispose } = await testDb());
  }, 60_000);
  afterAll(async () => {
    await dispose();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  async function write(ctx: Awaited<ReturnType<typeof learner>>, deckId: string, terms: string[]) {
    tick();
    const outcomes = await addCards(
      ctx,
      terms.map((term) => CardInput.parse({ deckId, term, meaning: `the ${term}`, example: "" })),
    );
    return outcomes.flatMap((o) => (o.status === "added" ? [o.card.id] : []));
  }

  it("waits for enough cards, learns from the owner's text only, then waits for change", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const ctx = await learner(db, "style-1", "Kateryna");
    const deck = await createDeck(ctx, { name: "Deutsch", defaultLanguage: "de" });
    await updateDeck(ctx, deck.id, { enrichInstructions: "Nouns from my A2 course." });
    const provider = fakeProvider(article);

    const early = await write(
      ctx,
      deck.id,
      Array.from({ length: STYLE_LEARN_AFTER - 1 }, (_, i) => `Wort ${i}`),
    );
    expect(await learnDeckStyles(ctx, early, provider)).toEqual({ learned: 0, deckIds: [] });
    expect(provider.asked).toHaveLength(0);

    const [ai] = await write(ctx, deck.id, ["KI-Wort"]);
    await db
      .update(schema.cards)
      .set({ meaning: "AI's meaning", meaningSource: "ai" })
      .where(eq(schema.cards.id, ai ?? ""));
    const last = await write(ctx, deck.id, ["das Haus"]);
    tick();
    expect(await learnDeckStyles(ctx, last, provider)).toMatchObject({ learned: 1 });

    const input = JSON.parse(provider.asked[0]?.input ?? "{}");
    expect(input.deck).toMatchObject({ name: "Deutsch", instructions: "Nouns from my A2 course." });
    expect(input.previous).toBeNull();
    expect(input.cards).toHaveLength(STYLE_LEARN_AFTER);
    expect(input.topic).toBe(false);
    expect(input.cards.find((card: { term: string }) => card.term === "Wort 0")).toEqual({
      day: "2026-10-01",
      term: "Wort 0",
      meaning: "the Wort 0",
      example: "",
      notes: "",
      pronunciation: "",
    });
    expect(JSON.stringify(input.cards)).not.toContain("AI's meaning");

    const [stored] = await db.select().from(schema.decks).where(eq(schema.decks.id, deck.id));
    expect(stored?.enrichStyle).toBe("Meanings usually give the article.");

    // Not due again until enough cards change.
    const more = await write(
      ctx,
      deck.id,
      Array.from({ length: STYLE_RELEARN_AFTER - 1 }, (_, i) => `Neu ${i}`),
    );
    expect(await learnDeckStyles(ctx, more, provider)).toEqual({ learned: 0, deckIds: [] });
    const enough = await write(ctx, deck.id, ["der Tisch"]);
    expect(await learnDeckStyles(ctx, enough, provider)).toMatchObject({ learned: 1 });
    expect(JSON.parse(provider.asked[1]?.input ?? "{}").previous).toEqual(stored?.enrichStyle);
  });

  it("stores no style when there is nothing worth saying, and still waits", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const ctx = await learner(db, "style-2", "Kateryna");
    const deck = await createDeck(ctx, { name: "Mixed" });
    const ids = await write(
      ctx,
      deck.id,
      Array.from({ length: STYLE_LEARN_AFTER }, (_, i) => `word ${i}`),
    );
    tick();
    const provider = fakeProvider({ style: null });
    expect(await learnDeckStyles(ctx, ids, provider)).toMatchObject({ learned: 1 });
    const [stored] = await db.select().from(schema.decks).where(eq(schema.decks.id, deck.id));
    expect(stored?.enrichStyle).toBeNull();
    expect(stored?.enrichStyleAt).not.toBeNull();
    expect(await learnDeckStyles(ctx, ids, provider)).toEqual({ learned: 0, deckIds: [] });
  });

  it("records each learning call as counts, and a failed call before it rethrows", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const capture = vi.fn();
    const base = await learner(db, "style-events", "Kateryna");
    const ctx = { ...base, analytics: { capture, writeDataPoint: vi.fn() } };
    const deck = await createDeck(ctx, { name: "Events" });
    const ids = await write(
      ctx,
      deck.id,
      Array.from({ length: STYLE_LEARN_AFTER }, (_, i) => `event ${i}`),
    );
    tick();
    const failing: TextProvider = {
      provider: "openai",
      model: "test",
      complete: async () => {
        throw new Error("vendor down");
      },
    };
    await expect(learnDeckStyles(ctx, ids, failing)).rejects.toThrow("vendor down");
    await learnDeckStyles(ctx, ids, fakeProvider(article));
    const events = capture.mock.calls
      .map(([event]) => event)
      .filter((event) => event.name === "deck_style_learned");
    expect(events).toEqual([
      {
        name: "deck_style_learned",
        outcome: "failed",
        cards: 8,
        corrections: 0,
        topic: false,
        chars: 0,
        prompt_version: 3,
      },
      {
        name: "deck_style_learned",
        outcome: "learned",
        cards: 8,
        corrections: 0,
        topic: false,
        chars: article.style.length,
        prompt_version: 3,
      },
    ]);
  });

  /** Stands in for enrichment writing each card's example. */
  async function aiExamples(ids: readonly string[]) {
    for (const id of ids) {
      await db
        .update(schema.cards)
        .set({ example: `AI example ${id}`, exampleSource: "ai" })
        .where(eq(schema.cards.id, id));
    }
  }

  async function correct(ctx: Awaited<ReturnType<typeof learner>>, id: string, example: string) {
    tick();
    await updateCard(ctx, id, CardPatch.parse({ example }));
  }

  it("reads the owner's corrections, newest first, with the learner's text as the card holds it", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const capture = vi.fn();
    const base = await learner(db, "style-corrections", "Kateryna");
    const ctx = { ...base, analytics: { capture, writeDataPoint: vi.fn() } };
    const deck = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const other = await createDeck(ctx, { name: "Altro", defaultLanguage: "it" });
    const ids = await write(
      ctx,
      deck.id,
      Array.from({ length: STYLE_LEARN_AFTER }, (_, i) => `parola ${i}`),
    );
    const [elsewhere] = await write(ctx, other.id, ["altrove"]);
    const [first = "", second = "", undone = "", archived = ""] = ids;
    await aiExamples([first, second, undone, archived, elsewhere ?? ""]);

    await correct(ctx, first, "Una frase mia.");
    await correct(ctx, second, "Prima.");
    await correct(ctx, second, "Dopo, più breve.");
    await correct(ctx, undone, "Annullata.");
    await correct(ctx, archived, "Archiviata.");
    await correct(ctx, elsewhere ?? "", "Altrove.");
    // Undo puts the AI's text back, and the card's correction no longer holds.
    await updateCard(ctx, undone, { example: `AI example ${undone}`, exampleSource: "ai" });
    await db
      .update(schema.cards)
      .set({ archivedAt: new Date() })
      .where(eq(schema.cards.id, archived));
    tick();

    const provider = fakeProvider(article);
    expect(await learnDeckStyles(ctx, ids, provider)).toMatchObject({ learned: 1 });
    const input = JSON.parse(provider.asked[0]?.input ?? "{}");
    expect(input.corrections).toEqual([
      {
        term: "parola 1",
        field: "example",
        ai: `AI example ${second}`,
        learner: "Dopo, più breve.",
      },
      { term: "parola 0", field: "example", ai: `AI example ${first}`, learner: "Una frase mia." },
    ]);
    expect(provider.asked[0]?.instructions).toContain("They are the strongest signal you have");
    const [event] = capture.mock.calls
      .map(([event]) => event)
      .filter((event) => event.name === "deck_style_learned");
    expect(event).toMatchObject({ corrections: 2, prompt_version: 3 });
  });

  it("counts corrections toward learning again, beside the cards they changed", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const ctx = await learner(db, "style-relearn", "Kateryna");
    const deck = await createDeck(ctx, { name: "Deutsch", defaultLanguage: "de" });
    const ids = await write(
      ctx,
      deck.id,
      Array.from({ length: STYLE_RELEARN_AFTER }, (_, i) => `Wort ${i}`),
    );
    await aiExamples(ids.slice(0, 3));
    tick();
    const provider = fakeProvider(article);
    expect(await learnDeckStyles(ctx, ids, provider)).toMatchObject({ learned: 1 });

    // Four plain edits are four changed cards, short of the ten that learn again.
    for (const id of ids.slice(-4)) {
      tick();
      await updateCard(ctx, id, CardPatch.parse({ notes: "Mine." }));
    }
    expect(await learnDeckStyles(ctx, ids, provider)).toMatchObject({ learned: 0 });
    // Three corrections count as three cards and three corrections.
    for (const id of ids.slice(0, 3)) await correct(ctx, id, "Mein Beispiel.");
    tick();
    expect(await learnDeckStyles(ctx, ids, provider)).toMatchObject({ learned: 1 });
  });

  it("never reads a deck the learner does not own", async () => {
    const owner = await learner(db, "style-owner", "Giulia");
    const other = await learner(db, "style-other", "Kateryna");
    const deck = await createDeck(owner, { name: "Italiano" });
    const ids = await write(
      owner,
      deck.id,
      Array.from({ length: STYLE_LEARN_AFTER }, (_, i) => `parola ${i}`),
    );
    const provider = fakeProvider(article);
    expect(await learnDeckStyles(other, ids, provider)).toEqual({ learned: 0, deckIds: [] });
    expect(provider.asked).toHaveLength(0);
  });

  it("learns first only a deck never learned, and skips one this run already learned", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const ctx = await learner(db, "style-4", "Kateryna");
    const fresh = await createDeck(ctx, { name: "Neu" });
    const known = await createDeck(ctx, { name: "Alt" });
    const terms = (prefix: string) =>
      Array.from({ length: STYLE_RELEARN_AFTER }, (_, i) => `${prefix} ${i}`);
    const freshIds = await write(ctx, fresh.id, terms("neu"));
    const knownIds = await write(ctx, known.id, terms("alt"));
    await db
      .update(schema.decks)
      .set({ enrichStyleAt: new Date(clock - 3_600_000) })
      .where(eq(schema.decks.id, known.id));
    tick();
    const provider = fakeProvider(article);
    const ids = [...freshIds, ...knownIds];
    expect(await learnDeckStyles(ctx, ids, provider, { firstOnly: true })).toEqual({
      learned: 1,
      deckIds: [fresh.id],
    });
    expect(await learnDeckStyles(ctx, ids, provider, { skip: [fresh.id] })).toEqual({
      learned: 1,
      deckIds: [known.id],
    });
  });

  it("hands the learned style to enrichment, under the owner's instructions and samples", async () => {
    const ctx = await learner(db, "style-3", "Kateryna");
    const deck = await createDeck(ctx, { name: "Deutsch", defaultLanguage: "de" });
    const style = "Kitchen words from a cooking course.";
    await db.update(schema.decks).set({ enrichStyle: style }).where(eq(schema.decks.id, deck.id));
    const outcomes = await addCards(
      ctx,
      [CardInput.parse({ deckId: deck.id, term: "der Löffel" })],
      {
        create: async () => undefined,
      },
    );
    const id = outcomes[0]?.status === "added" ? outcomes[0].card.id : "";
    const provider = fakeProvider({ cards: [] });
    await enrichCards({ ...ctx, actor: "ai" }, [id], provider);
    const input = JSON.parse(provider.asked[0]?.input ?? "{}");
    expect(input.decks[0].style).toBe(style);
    expect(provider.asked[0]?.instructions).toMatch(
      /1\. The deck's instructions\n2\. The deck's samples\n3\. The deck's style/,
    );
  });
});
