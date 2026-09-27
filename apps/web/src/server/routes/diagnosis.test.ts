import { AddCardOutcomeOut, CardDetailOut, DeckOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import type { DiagnoseRunParams, DiagnosisQueue } from "../services/diagnosis";
import { json, type Session, type TestApp, testApp } from "../test-app";

/** That the review routes hand often-forgotten cards over is the route's promise; the rest is `services/diagnosis.test.ts`. */
let app: TestApp;
let learner: Session;
const runs: DiagnoseRunParams[] = [];

const DAY = 86_400_000;

beforeAll(async () => {
  const queue: DiagnosisQueue = {
    create: async ({ params }) => {
      runs.push(params);
    },
  };
  app = await testApp({ env: { OPENAI_API_KEY: "test", DIAGNOSE_WORKFLOW: queue } as never });
  learner = await app.signUp("diagnosis-route");
}, 60_000);

describe("review routes and diagnosis", () => {
  it("queues a card that turned often forgotten once, after the response", async () => {
    const deck = await app.fetch("/api/decks", {
      ...json({ name: "Eesti", defaultLanguage: "et" }),
      as: learner,
    });
    const deckId = DeckOut.parse(await deck.json()).id;
    const added = await app.fetch("/api/cards", {
      ...json({ deckId, term: "alustama", meaning: "to start something", enrich: false }),
      as: learner,
    });
    const outcome = AddCardOutcomeOut.parse(await added.json());
    if (outcome.status !== "added") throw new Error("not added");
    const cardId = outcome.card.id;
    for (const [daysAgo, rating] of [
      [4, 1],
      [3, 1],
      [2, 1],
    ] as const) {
      const graded = await app.fetch("/api/review/grade", {
        ...json({
          cardId,
          direction: "recognition",
          rating,
          reviewedAt: new Date(Date.now() - daysAgo * DAY).toISOString(),
          timezone: "UTC",
        }),
        as: learner,
      });
      expect(graded.status).toBe(200);
    }

    expect((await app.fetch("/api/review/rounds?tz=UTC", { as: learner })).status).toBe(200);
    expect((await app.fetch("/api/review/draw?tz=UTC", { as: learner })).status).toBe(200);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.diagnosisIds).toHaveLength(1);

    const card = await app.fetch(`/api/cards/${cardId}`, { as: learner });
    expect(CardDetailOut.parse(await card.json()).diagnosis).toBeNull();
  });
});
