import { CardInput } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { testGateway } from "../../test/ai-gateway";
import { schema } from "../db";
import type { Bindings } from "../env";
import { updateAiConsent } from "../services/ai-consent";
import { addCards } from "../services/cards";
import { createDeck } from "../services/decks";
import { learner, type TestDb, testDb } from "../services/test-db";
import { EnrichWorkflow } from "./workflow";

vi.mock("cloudflare:workers", () => ({
  WorkflowEntrypoint: class {
    constructor(
      readonly ctx: unknown,
      readonly env: unknown,
    ) {}
  },
}));

const KANA = [
  "あめ",
  "いぬ",
  "うみ",
  "えき",
  "おか",
  "かさ",
  "きつね",
  "くま",
  "けむり",
  "こい",
  "さけ",
];

const WORDS = { name: "日本語", suffix: "" };
const PLURALS = { name: "漢字", suffix: "たち" };

describe("EnrichWorkflow", () => {
  let local: TestDb;
  beforeAll(async () => {
    local = await testDb();
  }, 60_000);
  afterAll(async () => {
    await local.dispose();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  async function requestsOf(
    handle: string,
    decks: { name: string; suffix: string }[],
    decline: { after?: string | undefined; during?: string | undefined } = {},
  ) {
    const ctx = await learner(local.db, handle, "Kateryna");
    const cardIds: string[] = [];
    for (const { name, suffix } of decks) {
      const deck = await createDeck(ctx, { name, defaultLanguage: "ja" });
      await local.db
        .update(schema.decks)
        .set({ enrichStyle: "Meanings are one word.", enrichStyleAt: new Date(0) })
        .where(eq(schema.decks.id, deck.id));
      const added = await addCards(
        ctx,
        KANA.map((kana) =>
          CardInput.parse({
            deckId: deck.id,
            term: `${kana}${suffix}`,
            meaning: "a word",
            example: `${kana}${suffix}です。`,
          }),
        ),
        { create: async () => undefined },
      );
      cardIds.push(...added.flatMap((o) => (o.status === "added" ? [o.card.id] : [])));
    }
    const turnOff = () =>
      updateAiConsent(ctx, { allowed: false, version: 1, updated_at: Date.now() });
    const asked: string[] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      const name = JSON.parse(String(init.body)).response_format.json_schema.name;
      asked.push(name);
      if (name === decline.during) await turnOff();
      const content = JSON.stringify({ cards: [], words: [], style: null });
      return Response.json({ choices: [{ message: { content }, finish_reason: "stop" }] });
    });
    const step = {
      do: async (name: string, ...rest: unknown[]) => {
        const result = await (rest.at(-1) as () => Promise<unknown>)();
        if (name === decline.after) await turnOff();
        return result;
      },
    };
    const env = { ...local.env, ...testGateway, OPENAI_API_KEY: "key" } as unknown as Bindings;
    const workflow = new EnrichWorkflow({} as ExecutionContext, env);
    await workflow.run(
      { payload: { userId: ctx.userId, cardIds, trigger: "add" } } as never,
      step as never,
    );
    return asked;
  }

  it("fills, translates and accents each chunk, then learns the deck's style", async () => {
    expect(await requestsOf("enrich-run-allowed", [WORDS])).toEqual([
      "enriched_cards",
      "example_translations",
      "pitch_accents",
      "enriched_cards",
      "example_translations",
      "pitch_accents",
      "deck_style",
    ]);
  });

  it.each([
    ["consent", []],
    ["cards 0", ["enriched_cards"]],
    ["translate 0", ["enriched_cards", "example_translations"]],
    ["pitch 0", ["enriched_cards", "example_translations", "pitch_accents"]],
    [
      "pitch 1",
      [
        "enriched_cards",
        "example_translations",
        "pitch_accents",
        "enriched_cards",
        "example_translations",
        "pitch_accents",
      ],
    ],
  ])("sends nothing more once the learner turns AI off after %s", async (after, sent) => {
    const handle = `enrich-run-${after.replace(" ", "-")}`;
    expect(await requestsOf(handle, [WORDS], { after })).toEqual(sent);
  });

  it.each([
    [2, undefined],
    [1, "deck_style"],
  ])("learns %s of two decks' styles when AI goes off during %s", async (learned, during) => {
    const asked = await requestsOf(`enrich-run-decks-${learned}`, [WORDS, PLURALS], { during });
    expect(asked.filter((name) => name === "deck_style")).toHaveLength(learned);
  });
});
