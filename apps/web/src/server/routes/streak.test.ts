import { DeckOut, QueueOut, StreakOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { json, type Session, type TestApp, testApp } from "../test-app";

/**
 * Nine consecutive days, each meeting a goal of one review. A streak counted from the seven-day
 * window the lights show would say 7. The streak screen itself is `e2e/streak-exact.spec.ts`.
 */
let app: TestApp;
let learner: Session;

const DAY = 24 * 60 * 60 * 1000;

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("learner");
  const zone = await app.fetch("/api/settings/timezone", {
    ...json({ mode: "manual", timezone: "UTC" }, { method: "PUT" }),
    as: learner,
  });
  expect(zone.status).toBe(200);
  const goal = await app.fetch("/api/settings", {
    ...json({ dailyGoal: 1 }, { method: "PATCH" }),
    as: learner,
  });
  expect(goal.status).toBe(200);

  const deck = await app.fetch("/api/decks", {
    ...json({ name: "Lesson 14", defaultLanguage: "it" }),
    as: learner,
  });
  const deckId = DeckOut.parse(await deck.json()).id;
  const cards = await app.fetch("/api/cards/batch", {
    ...json({
      cards: Array.from({ length: 12 }, (_, i) => ({
        deckId,
        term: `parola ${i}`,
        meaning: `m${i}`,
      })),
    }),
    as: learner,
  });
  expect(cards.status).toBe(200);

  const queue = QueueOut.parse(
    await (await app.fetch("/api/review/queue", { as: learner })).json(),
  );
  // A minute ago, then the same clock time on each of the eight days before: nine UTC days.
  for (let back = 8; back >= 0; back--) {
    const item = queue.items[back % queue.items.length];
    if (!item) throw new Error("The queue is empty");
    const graded = await app.fetch("/api/review/grade", {
      ...json({
        cardId: item.card.id,
        mode: item.mode,
        rating: 3,
        reviewedAt: new Date(Date.now() - back * DAY - 60_000).toISOString(),
      }),
      as: learner,
    });
    expect(graded.status, `day ${back}`).toBe(200);
  }
}, 60_000);

describe("the streak", () => {
  it("counts every day, not only the seven the history window shows", async () => {
    const response = await app.fetch("/api/review/history?days=7&tz=0", { as: learner });
    expect(response.status).toBe(200);
    const history = (await response.json()) as { days: number[]; streak: number };
    expect(history.days).toHaveLength(7);
    expect(history.streak).toBe(9);
  });

  it("is nine days long and its own longest run", async () => {
    const response = await app.fetch("/api/stats/streak?tz=UTC", { as: learner });
    expect(response.status).toBe(200);
    const streak = StreakOut.parse(await response.json());
    expect(streak).toMatchObject({ current: 9, longest: 9, goal: 1 });
    expect(streak.today.outcome).toBe("goal_met");
  });
});
