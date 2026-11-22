import { CardInput } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { testGateway } from "../../test/ai-gateway";
import { schema } from "../db";
import type { Bindings } from "../env";
import { updateAiConsent } from "../services/ai-consent";
import { addCards } from "../services/cards";
import { STYLE_RELEARN_AFTER } from "../services/deck-style";
import { createDeck } from "../services/decks";
import { learner, type TestDb, testDb } from "../services/test-db";
import { STYLE_REPLY_SCHEMA } from "./style";
import { EnrichWorkflow } from "./workflow";

vi.mock("cloudflare:workers", () => ({
  WorkflowEntrypoint: class {
    constructor(
      readonly ctx: unknown,
      readonly env: unknown,
    ) {}
  },
}));

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

  async function requestsOf(handle: string, afterFill: "allow" | "decline") {
    const ctx = await learner(local.db, handle, "Kateryna");
    const deck = await createDeck(ctx, { name: "Deutsch", defaultLanguage: "de" });
    await local.db
      .update(schema.decks)
      .set({ enrichStyle: "Meanings give the article.", enrichStyleAt: new Date(0) })
      .where(eq(schema.decks.id, deck.id));
    const added = await addCards(
      ctx,
      Array.from({ length: STYLE_RELEARN_AFTER }, (_, i) =>
        CardInput.parse({ deckId: deck.id, term: `Wort ${i}`, meaning: `the word ${i}` }),
      ),
    );
    const cardIds = added.flatMap((o) => (o.status === "added" ? [o.card.id] : []));
    const asked: string[] = [];
    vi.stubGlobal("fetch", async (_url: string, init: RequestInit) => {
      asked.push(JSON.parse(String(init.body)).response_format.json_schema.name);
      return Response.json({
        choices: [{ message: { content: '{"style":null}' }, finish_reason: "stop" }],
      });
    });
    const step = {
      do: async (name: string, ...rest: unknown[]) => {
        const result = await (rest.at(-1) as () => Promise<unknown>)();
        if (name === "cards 0" && afterFill === "decline") {
          await updateAiConsent(ctx, { allowed: false, version: 1, updated_at: Date.now() });
        }
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

  it("learns a deck's style again after the fill", async () => {
    expect(await requestsOf("enrich-workflow-1", "allow")).toContain(STYLE_REPLY_SCHEMA.name);
  });

  it("sends no style request once the learner turns AI off mid-run", async () => {
    expect(await requestsOf("enrich-workflow-2", "decline")).not.toContain(STYLE_REPLY_SCHEMA.name);
  });
});
