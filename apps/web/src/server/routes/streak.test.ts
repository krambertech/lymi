import { DeckOut, QueueOut, StreakOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { json, type Session, type TestApp, testApp } from "../test-app";

/**
 * Nine consecutive days, each meeting a goal of one review. A streak counted from the seven-day
 * window the lights show would say 7. A second learner misses yesterday, which becomes a rest day. The streak screen itself is `e2e/streak-exact.spec.ts`.
 */
let app: TestApp;
let learner: Session;

const DAY = 24 * 60 * 60 * 1000;

/** A learner on UTC days with a goal of one, who graded once on each of the given days ago. */
async function seed(name: string, daysAgo: number[]) {
  const who = await app.signUp(name);
  const zone = await app.fetch("/api/settings/timezone", {
    ...json({ mode: "manual", timezone: "UTC" }, { method: "PUT" }),
    as: who,
  });
  expect(zone.status).toBe(200);
  const goal = await app.fetch("/api/settings", {
    ...json({ dailyGoal: 1 }, { method: "PATCH" }),
    as: who,
  });
  expect(goal.status).toBe(200);

  const deck = await app.fetch("/api/decks", {
    ...json({ name: "Lesson 14", defaultLanguage: "it" }),
    as: who,
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
    as: who,
  });
  expect(cards.status).toBe(200);

  const queue = QueueOut.parse(await (await app.fetch("/api/review/queue", { as: who })).json());
  // A minute ago, then the same clock time on each earlier day: one UTC day each.
  for (const back of [...daysAgo].sort((a, b) => b - a)) {
    const item = queue.items[back % queue.items.length];
    if (!item) throw new Error("The queue is empty");
    const graded = await app.fetch("/api/review/grade", {
      ...json({
        cardId: item.card.id,
        mode: item.mode,
        rating: 3,
        reviewedAt: new Date(Date.now() - back * DAY - 60_000).toISOString(),
      }),
      as: who,
    });
    expect(graded.status, `day ${back}`).toBe(200);
  }
  return who;
}

let rested: Session;

beforeAll(async () => {
  app = await testApp();
  learner = await seed("learner", [8, 7, 6, 5, 4, 3, 2, 1, 0]);
  // Yesterday missed inside a run: a rest day.
  rested = await seed("rested", [8, 7, 6, 5, 4, 3, 2, 0]);
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

  it("marks a rest day and carries the run through it without adding it", async () => {
    const response = await app.fetch("/api/stats/streak?tz=UTC", { as: rested });
    const streak = StreakOut.parse(await response.json());
    const yesterday = new Date(Date.now() - 60_000 - DAY).toISOString().slice(0, 10);
    expect(streak).toMatchObject({ current: 8, longest: 8, reviewedDays: 8 });
    expect(streak.restDays).toEqual([yesterday]);
  });
});
