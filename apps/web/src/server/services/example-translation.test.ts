import { CardInput, exampleFingerprint } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TextProvider, TextRequest } from "../ai";
import { promptHash } from "../ai/prompt-hash";
import { type Db, schema } from "../db";
import {
  readTranslations,
  TRANSLATION_INSTRUCTIONS,
  TRANSLATION_PROMPT_VERSION,
  TRANSLATION_REPLY_SCHEMA,
  translationBrief,
} from "../enrichment/translation";
import { addCards, requestEnrichment, showCard, updateCard } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck, updateDeck } from "./decks";
import { type EnrichmentQueue, type EnrichRunParams, settleEnrichment } from "./enrichment";
import { failTranslations, translateExamples } from "./example-translation";
import { learner, testDb } from "./test-db";

describe("the translation prompt", () => {
  it("changes only with a new prompt version", () => {
    const hash = promptHash({ TRANSLATION_INSTRUCTIONS, TRANSLATION_REPLY_SCHEMA });
    // Raise TRANSLATION_PROMPT_VERSION with any change to what the model reads, then update both.
    expect({ TRANSLATION_PROMPT_VERSION, hash }).toEqual({
      TRANSLATION_PROMPT_VERSION: 1,
      hash: "f532b6393f7520cd",
    });
  });

  it("reads the example as shown, so readings never reach the translation", () => {
    expect(
      translationBrief({
        id: "c1",
        term: "食べる",
        meaning: "to eat",
        language: "ja",
        example: "毎朝[まいあさ]パンを食[た]べます。",
      }),
    ).toEqual({
      id: "c1",
      term: "食べる",
      meaning: "to eat",
      language: "ja",
      example: "毎朝パンを食べます。",
    });
  });

  it("drops a reply that would not fit the card", () => {
    const replies = readTranslations({
      cards: [
        { id: "a", translation: " I eat bread. " },
        { id: "b", translation: "x".repeat(251) },
        { id: "c", translation: null },
      ],
    });
    expect([...replies]).toEqual([
      ["a", "I eat bread."],
      ["b", null],
      ["c", null],
    ]);
    expect(readTranslations("nonsense").size).toBe(0);
  });
});

/** A provider that answers each card it is asked about, and can act while the model "thinks". */
function translator(
  answer: (example: string) => string | null,
  meanwhile?: () => Promise<void>,
): TextProvider & { asked: TextRequest[] } {
  const asked: TextRequest[] = [];
  return {
    provider: "openai",
    model: "test",
    asked,
    complete: async (request) => {
      asked.push(request);
      await meanwhile?.();
      const { cards } = JSON.parse(request.input) as { cards: { id: string; example: string }[] };
      return { cards: cards.map((card) => ({ id: card.id, translation: answer(card.example) })) };
    },
  };
}

const GERMAN: Record<string, string> = {
  "Ich esse Brot.": "I eat bread.",
  "Ich aß Brot.": "I ate bread.",
  "Wir essen zusammen.": "We eat together.",
};
const english = (example: string) => GERMAN[example] ?? null;

describe("translating examples", () => {
  let db: Db;
  let dispose: () => Promise<void>;
  let ctx: ServiceContext;
  let deckId: string;
  const runs: EnrichRunParams[] = [];
  const queue: EnrichmentQueue = {
    create: async ({ params }) => {
      runs.push(params);
    },
  };
  const ai = () => ({ ...ctx, actor: "ai" as const });

  beforeAll(async () => {
    ({ db, dispose } = await testDb());
    ctx = await learner(db, "translations", "Kateryna");
    deckId = (await createDeck(ctx, { name: "Deutsch", defaultLanguage: "de" })).id;
  }, 60_000);

  afterAll(async () => {
    await dispose();
  });

  async function add(fields: Partial<CardInput> = {}) {
    const [outcome] = await addCards(
      ctx,
      [CardInput.parse({ deckId, term: "essen", meaning: "to eat", ...fields })],
      queue,
    );
    if (outcome?.status !== "added") throw new Error("card not added");
    // The other fields' fill is enrichment's own test; here only the translation is outstanding.
    await settleEnrichment(db, ctx.userId, [outcome.card.id]);
    return outcome.card;
  }

  async function auditFor(cardId: string) {
    return (await db.select().from(schema.auditLog).where(eq(schema.auditLog.entityId, cardId)))
      .filter((row) => row.action === "enrich")
      .map((row) => (typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload));
  }

  it("translates an example the learner wrote once, and a second run writes nothing", async () => {
    const card = await add({ example: "Ich esse Brot.", term: "essen 1" });
    expect(card.exampleTranslationStatus).toBe("working");
    expect(runs.at(-1)).toMatchObject({ cardIds: [card.id], trigger: "add" });

    const first = translator(english);
    expect(await translateExamples(ai(), [card.id], first)).toEqual({ translated: 1 });
    const second = translator(english);
    expect(await translateExamples(ai(), [card.id], second)).toEqual({ translated: 0 });
    expect(second.asked).toHaveLength(0);

    const shown = await showCard(ctx, card.id);
    expect(shown).toMatchObject({
      exampleTranslation: "I eat bread.",
      exampleTranslationSource: "ai",
      exampleTranslationStatus: null,
      exampleTranslationStale: false,
    });
    expect(shown).not.toHaveProperty("exampleTranslationOf");
    expect(await auditFor(card.id)).toEqual([
      expect.objectContaining({ exampleTranslation: "I eat bread." }),
    ]);
  });

  it("keeps the learner's own translation and asks for none", async () => {
    const card = await add({
      term: "essen 2",
      example: "Ich esse Brot.",
      exampleTranslation: "I'm eating bread.",
      exampleTranslationSource: "lesson",
    });
    expect(card).toMatchObject({
      exampleTranslation: "I'm eating bread.",
      exampleTranslationSource: "lesson",
      exampleTranslationStatus: null,
    });
  });

  it("asks for nothing in a deck whose owner turned translations off", async () => {
    const off = await createDeck(ctx, {
      name: "No translations",
      defaultLanguage: "de",
      enrichFields: ["meaning", "example"],
    });
    const [outcome] = await addCards(
      ctx,
      [CardInput.parse({ deckId: off.id, term: "essen 3", example: "Ich esse Brot." })],
      queue,
    );
    expect(outcome?.status === "added" && outcome.card.exampleTranslationStatus).toBe(null);
  });

  it("writes the AI's translation again for a new example, from any channel", async () => {
    const card = await add({ term: "essen 4", example: "Ich esse Brot." });
    await translateExamples(ai(), [card.id], translator(english));
    runs.length = 0;

    const edited = await updateCard(
      { ...ctx, actor: "mcp" },
      card.id,
      { example: "Ich aß Brot." },
      queue,
    );
    expect(edited).toMatchObject({
      exampleTranslation: null,
      exampleTranslationSource: null,
      exampleTranslationStatus: "working",
    });
    expect(runs).toEqual([{ userId: ctx.userId, cardIds: [card.id], trigger: "edit" }]);
    await translateExamples(ai(), [card.id], translator(english), "edit");
    expect((await showCard(ctx, card.id)).exampleTranslation).toBe("I ate bread.");
  });

  it("keeps a translation once readings or stress are added to the same sentence", async () => {
    const card = await add({ term: "essen 5", example: "Ich esse Brot." });
    await translateExamples(ai(), [card.id], translator(english));
    runs.length = 0;
    await updateCard(ctx, card.id, { example: "Ich ésse Brot." }, queue);
    expect(runs).toEqual([]);
    expect(await showCard(ctx, card.id)).toMatchObject({
      exampleTranslation: "I eat bread.",
      exampleTranslationStale: false,
    });
  });

  it("never lands a translation of an example the learner changed while it was written", async () => {
    const card = await add({ term: "essen 6", example: "Ich esse Brot." });
    const slow = translator(english, async () => {
      await updateCard(ctx, card.id, { example: "Ich aß Brot." }, queue);
    });
    expect(await translateExamples(ai(), [card.id], slow)).toEqual({ translated: 0 });
    // The edit's own run is still to come, so the card waits for it rather than settling.
    expect(await showCard(ctx, card.id)).toMatchObject({
      exampleTranslation: null,
      exampleTranslationStatus: "working",
    });
    await translateExamples(ai(), [card.id], translator(english), "edit");
    expect((await showCard(ctx, card.id)).exampleTranslation).toBe("I ate bread.");
    expect(await auditFor(card.id)).toEqual([
      expect.objectContaining({ exampleTranslation: "I ate bread." }),
    ]);
  });

  it("never lets a translation the learner typed meanwhile be overwritten", async () => {
    const card = await add({ term: "essen 7", example: "Ich esse Brot." });
    const slow = translator(english, async () => {
      await updateCard(ctx, card.id, { exampleTranslation: "Bread, I eat." });
    });
    await translateExamples(ai(), [card.id], slow);
    expect(await showCard(ctx, card.id)).toMatchObject({
      exampleTranslation: "Bread, I eat.",
      exampleTranslationSource: "manual",
      exampleTranslationStatus: null,
    });
  });

  it("flags a person's translation of an earlier example instead of replacing it", async () => {
    const card = await add({
      term: "essen 8",
      example: "Ich esse Brot.",
      exampleTranslation: "I eat bread.",
    });
    runs.length = 0;
    const edited = await updateCard(ctx, card.id, { example: "Ich aß Brot." }, queue);
    expect(runs).toEqual([]);
    expect(edited).toMatchObject({
      exampleTranslation: "I eat bread.",
      exampleTranslationSource: "manual",
      exampleTranslationStale: true,
    });
    const fixed = await updateCard(ctx, card.id, { exampleTranslation: "I ate bread." }, queue);
    expect(fixed).toMatchObject({
      exampleTranslation: "I ate bread.",
      exampleTranslationStale: false,
    });
    const [row] = await db.select().from(schema.cards).where(eq(schema.cards.id, card.id));
    expect(row?.exampleTranslationOf).toBe(exampleFingerprint("Ich aß Brot."));
  });

  it("leaves a cleared translation cleared until Enrich asks for it", async () => {
    const card = await add({ term: "essen 9", example: "Ich esse Brot." });
    await translateExamples(ai(), [card.id], translator(english));
    await updateCard(ctx, card.id, { exampleTranslation: "" }, queue);
    runs.length = 0;
    await updateCard(ctx, card.id, { example: "Ich aß Brot." }, queue);
    expect(runs).toEqual([]);
    const provider = translator(english);
    await translateExamples(ai(), [card.id], provider);
    expect(provider.asked).toHaveLength(0);
    expect((await showCard(ctx, card.id)).exampleTranslation).toBe("");

    const asked = await requestEnrichment(ctx, card.id, queue);
    expect(asked).toMatchObject({ exampleTranslation: null, exampleTranslationStatus: "working" });
    expect(runs.at(-1)).toMatchObject({ cardIds: [card.id], trigger: "card" });
    await translateExamples(ai(), [card.id], translator(english), "card");
    expect((await showCard(ctx, card.id)).exampleTranslation).toBe("I ate bread.");
  });

  it("drops the translation with its example", async () => {
    const card = await add({
      term: "essen 10",
      example: "Ich esse Brot.",
      exampleTranslation: "I eat bread.",
    });
    expect(await updateCard(ctx, card.id, { example: "" }, queue)).toMatchObject({
      exampleTranslation: null,
      exampleTranslationSource: null,
      exampleTranslationStale: false,
    });
    expect(await updateCard(ctx, card.id, { exampleTranslation: "Bread." }, queue)).toMatchObject({
      exampleTranslation: null,
    });
  });

  it("asks for a first translation from the app, never from a connected app's edit", async () => {
    const card = await add({ term: "essen 11" });
    runs.length = 0;
    await updateCard({ ...ctx, actor: "mcp" }, card.id, { example: "Ich esse Brot." }, queue);
    expect(runs).toEqual([]);
    await updateCard(ctx, card.id, { example: "Wir essen zusammen." }, queue);
    expect(runs).toEqual([{ userId: ctx.userId, cardIds: [card.id], trigger: "edit" }]);
  });

  it("ends a failed translation at failed, and Enrich tries again once", async () => {
    const card = await add({ term: "essen 12", example: "Ich esse Brot." });
    await failTranslations(db, ctx.userId, [card.id]);
    expect((await showCard(ctx, card.id)).exampleTranslationStatus).toBe("failed");
    runs.length = 0;
    await requestEnrichment(ctx, card.id, queue);
    await requestEnrichment(ctx, card.id, queue);
    expect(runs).toHaveLength(1);
    await translateExamples(ai(), [card.id], translator(english), "card");
    expect(await showCard(ctx, card.id)).toMatchObject({
      exampleTranslation: "I eat bread.",
      exampleTranslationStatus: null,
    });
  });

  it("settles a card whose model gave no translation, and one whose deck turned translations off", async () => {
    const declined = await add({ term: "essen 13", example: "Das ist unübersetzbar." });
    await translateExamples(ai(), [declined.id], translator(english));
    expect(await showCard(ctx, declined.id)).toMatchObject({
      exampleTranslation: null,
      exampleTranslationStatus: null,
    });

    const deck = await createDeck(ctx, { name: "Later off", defaultLanguage: "de" });
    const [outcome] = await addCards(
      ctx,
      [CardInput.parse({ deckId: deck.id, term: "essen 14", example: "Ich esse Brot." })],
      queue,
    );
    if (outcome?.status !== "added") throw new Error("card not added");
    await updateDeck(ctx, deck.id, { enrichFields: ["meaning"] });
    const provider = translator(english);
    await translateExamples(ai(), [outcome.card.id], provider);
    expect(provider.asked).toHaveLength(0);
    expect((await showCard(ctx, outcome.card.id)).exampleTranslationStatus).toBeNull();
  });

  it("takes back an example longer than the limit unchanged, and refuses a new one", async () => {
    const card = await add({ term: "essen 16", example: "Ich esse Brot." });
    const long = "Ein langer Satz. ".repeat(20).trim();
    await db.update(schema.cards).set({ example: long }).where(eq(schema.cards.id, card.id));
    expect((await updateCard(ctx, card.id, { example: long, meaning: "to dine" })).meaning).toBe(
      "to dine",
    );
    await expect(updateCard(ctx, card.id, { example: `${long} Noch mehr.` })).rejects.toMatchObject(
      { code: "invalid" },
    );
  });

  it("writes in the learner's meaning language", async () => {
    const card = await add({ term: "essen 15", example: "Ich esse Brot." });
    const provider = translator(english);
    await translateExamples(ai(), [card.id], provider);
    expect(JSON.parse(provider.asked[0]?.input ?? "{}")).toMatchObject({
      meaningLanguage: "en",
      cards: [{ id: card.id, term: "essen 15", meaning: "to eat", example: "Ich esse Brot." }],
    });
  });
});
