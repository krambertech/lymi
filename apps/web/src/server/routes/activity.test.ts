import { ActivityPageOut, AddCardOutcomeOut, ApiKeyCreatedOut, DeckOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { json, type Session, type TestApp, testApp } from "../test-app";

/**
 * Activity is what keeps an integration honest: a key writes, and the learner reads what landed
 * and whose it was. Grouping and naming rules are `services/activity.test.ts`; this is the route.
 */
let app: TestApp;
let learner: Session;
let key: string;
let deckId: string;
let cardId: string;

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("learner");
  const made = await app.fetch("/api/keys", {
    ...json({ name: "Lesson notes script", scope: "write" }),
    as: learner,
  });
  expect(made.status).toBe(201);
  key = ApiKeyCreatedOut.parse(await made.json()).key;
  const deck = await app.fetch("/api/decks", {
    ...json({ name: "Activity deck", defaultLanguage: "it" }),
    as: learner,
  });
  expect(deck.status).toBe(201);
  deckId = DeckOut.parse(await deck.json()).id;
  for (const term of ["sbrigarsi", "affrettarsi"]) {
    const card = await app.fetch(
      "/api/cards",
      json(
        { deckId, term, meaning: "to hurry", language: "it" },
        { headers: { "x-api-key": key } },
      ),
    );
    expect(card.status).toBe(201);
    const outcome = AddCardOutcomeOut.parse(await card.json());
    if (outcome.status === "added" && term === "sbrigarsi") cardId = outcome.card.id;
  }
  const section = await app.fetch(
    `/api/decks/${deckId}/sections`,
    json({ name: "Lesson 1" }, { headers: { "x-api-key": key } }),
  );
  expect(section.status).toBe(201);
}, 60_000);

const activity = async (as: Session) => {
  const response = await app.fetch("/api/activity", { as });
  expect(response.status).toBe(200);
  return ActivityPageOut.parse(await response.json());
};

describe("GET /api/activity", () => {
  it("groups a key's cards into one row and names the key on every row", async () => {
    const { entries } = await activity(learner);
    const cards = entries.find((entry) => entry.kind === "cards_added");
    expect(cards).toMatchObject({
      actor: "api",
      app: "Lesson notes script",
      count: 2,
      deck: { id: deckId, name: "Activity deck", archived: false },
    });
    expect(cards?.cards.map((card) => card.term).sort()).toEqual(["affrettarsi", "sbrigarsi"]);
    expect(entries.find((entry) => entry.kind === "section_added")).toMatchObject({
      app: "Lesson notes script",
      person: "Lesson 1",
    });
  });

  it("says on the row when a card the key wrote was archived since", async () => {
    const archived = await app.fetch(`/api/cards/${cardId}/archive`, {
      method: "POST",
      as: learner,
    });
    expect(archived.status).toBe(200);

    const { entries } = await activity(learner);
    const row = entries.find((entry) => entry.kind === "cards_added");
    expect(row?.cards.find((card) => card.id === cardId)).toMatchObject({ archived: true });
    // The learner's own archive is not activity: only what came from outside is.
    expect(entries.some((entry) => entry.kind === "cards_archived")).toBe(false);
  });

  it("keeps the screen from the keys it names", async () => {
    const response = await app.fetch("/api/activity", { headers: { "x-api-key": key } });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "Only the learner can do this, from the app" });
  });
});
