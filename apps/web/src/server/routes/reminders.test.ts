import { DeckOut, QueueOut, type Reminder } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { schema } from "../db";
import { dispatchReviewReminders } from "../push-delivery";
import { json, type Session, type TestApp, testApp } from "../test-app";

/** The dispatcher against real rows: the day's reviews, the streak and the last opening. */
let app: TestApp;
let people = 0;

const DAY = 24 * 60 * 60 * 1000;
const now = () => new Date();

/** A learner on UTC days with a goal of `goal`, reminded this quarter hour, who graded once per day ago. */
async function seed(goal: number, daysAgo: number[]) {
  people += 1;
  const who = await app.signUp(`learner-${people}`);
  const send = (input: string, init: Parameters<typeof json>[1], body: unknown) =>
    app.fetch(input, { ...json(body, init), as: who });
  await send("/api/settings/timezone", { method: "PUT" }, { mode: "manual", timezone: "UTC" });
  await send("/api/settings", { method: "PATCH" }, { dailyGoal: goal });
  const deck = DeckOut.parse(
    await (await send("/api/decks", {}, { name: "Lesson 14", defaultLanguage: "it" })).json(),
  );
  await send(
    "/api/cards/batch",
    {},
    {
      cards: Array.from({ length: 12 }, (_, i) => ({
        deckId: deck.id,
        term: `parola ${i}`,
        meaning: `m${i}`,
      })),
    },
  );
  const at = now();
  const quarter = String(Math.floor(at.getUTCMinutes() / 15) * 15).padStart(2, "0");
  const subscribed = await send(
    "/api/push/subscription",
    { method: "PUT" },
    {
      endpoint: `https://push.example/${people}`,
      expirationTime: null,
      keys: { p256dh: "BPublicKey", auth: "AuthKey" },
      reminderTime: `${String(at.getUTCHours()).padStart(2, "0")}:${quarter}`,
      timezone: "UTC",
    },
  );
  expect(subscribed.status).toBe(200);

  const queue = QueueOut.parse(await (await app.fetch("/api/review/queue", { as: who })).json());
  for (const [i, back] of [...daysAgo].sort((a, b) => b - a).entries()) {
    const item = queue.items[i];
    if (!item) throw new Error("The queue is empty");
    const graded = await send(
      "/api/review/grade",
      {},
      {
        cardId: item.card.id,
        mode: item.mode,
        rating: 3,
        reviewedAt: new Date(Date.now() - back * DAY - 60_000).toISOString(),
      },
    );
    expect(graded.status, `day ${back}`).toBe(200);
  }
  return who;
}

/** What the dispatcher sends this learner now, leaving everyone else's device out. */
async function dispatch(who: Session) {
  await app.env.DB.prepare("UPDATE push_subscriptions SET last_sent_local_date = NULL").run();
  const sent: Reminder[] = [];
  await dispatchReviewReminders(app.env, now(), async (candidate, reminder) => {
    if (candidate.user_id === who.userId) sent.push(reminder);
  });
  return sent;
}

beforeAll(async () => {
  app = await testApp();
  vi.spyOn(console, "log").mockImplementation(() => undefined);
}, 60_000);

describe("the daily reminder", () => {
  it("says what is ready on a day not started", async () => {
    const who = await seed(3, [3]);
    expect(await dispatch(who)).toEqual([{ message: "ready", count: expect.any(Number) }]);
  });

  it("counts toward the goal once the day has started", async () => {
    const who = await seed(3, [0]);
    expect(await dispatch(who)).toEqual([{ message: "to_goal", count: 2 }]);
  });

  it("stays silent once the goal is met, with cards still left", async () => {
    const who = await seed(1, [0]);
    expect(await dispatch(who)).toEqual([]);
  });

  it("says the next cards are ready the day after a first review", async () => {
    const who = await seed(3, [1]);
    expect(await dispatch(who)).toEqual([{ message: "next_cards", count: expect.any(Number) }]);
  });

  it("says yesterday was a rest day, the morning after one", async () => {
    const who = await seed(1, [3, 2]);
    expect(await dispatch(who)).toEqual([{ message: "after_rest", count: expect.any(Number) }]);
  });

  it("stops a week after the last opening and starts again on return", async () => {
    const who = await seed(3, []);
    await app.db
      .update(schema.userSettings)
      .set({ lastOpenedAt: new Date(Date.now() - 7 * DAY) })
      .where(eq(schema.userSettings.userId, who.userId));
    expect(await dispatch(who)).toEqual([]);

    const opened = await app.fetch("/api/review/today", {
      ...json({ timezone: "UTC" }),
      as: who,
    });
    expect(opened.status).toBe(200);
    expect(await dispatch(who)).toHaveLength(1);
  });

  it("counts the week from opting in until the learner has opened Lymi", async () => {
    const who = await seed(3, []);
    expect(await dispatch(who)).toHaveLength(1);
    await app.env.DB.prepare("UPDATE push_subscriptions SET created_at = ? WHERE user_id = ?")
      .bind(Date.now() - 7 * DAY, who.userId)
      .run();
    expect(await dispatch(who)).toEqual([]);
  });
});
