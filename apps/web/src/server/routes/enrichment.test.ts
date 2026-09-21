import { AddCardOutcomeOut, AddCardsOut, ApiKeyCreatedOut, DeckOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import type { EnrichmentQueue } from "../services/enrichment";
import { json, type Session, type TestApp, testApp } from "../test-app";

/** Who gets enrichment by default is the route's promise; how a run fills is `services/enrichment.test.ts`. */
let app: TestApp;
let learner: Session;
let key: string;
let deckId: string;

beforeAll(async () => {
  const queue: EnrichmentQueue = { create: async () => undefined };
  app = await testApp({
    env: { OPENAI_API_KEY: "test", ENRICH_WORKFLOW: queue } as never,
  });
  learner = await app.signUp("enrich-route");
  const made = await app.fetch("/api/keys", {
    ...json({ name: "Lesson script", scope: "write" }),
    as: learner,
  });
  key = ApiKeyCreatedOut.parse(await made.json()).key;
  const deck = await app.fetch("/api/decks", {
    ...json({ name: "Eesti", defaultLanguage: "et" }),
    as: learner,
  });
  deckId = DeckOut.parse(await deck.json()).id;
}, 60_000);

const statusOf = async (response: Response) => {
  const outcome = AddCardOutcomeOut.parse(await response.json());
  if (outcome.status !== "added") throw new Error("not added");
  return outcome.card.enrichmentStatus;
};

describe("POST /api/cards enrichment", () => {
  it("leaves an API key's card as sent unless it asks", async () => {
    const plain = await app.fetch(
      "/api/cards",
      json({ deckId, term: "pere" }, { headers: { "x-api-key": key } }),
    );
    expect(await statusOf(plain)).toBeNull();

    const asked = await app.fetch(
      "/api/cards/batch",
      json({ cards: [{ deckId, term: "ema", enrich: true }] }, { headers: { "x-api-key": key } }),
    );
    const [outcome] = AddCardsOut.parse(await asked.json()).results;
    expect(outcome?.status === "added" && outcome.card.enrichmentStatus).toBe("working");
  });

  it("enriches the learner's own add in the app by default", async () => {
    const added = await app.fetch("/api/cards", { ...json({ deckId, term: "isa" }), as: learner });
    expect(await statusOf(added)).toBe("working");
  });
});
