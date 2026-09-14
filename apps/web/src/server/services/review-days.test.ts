import { newId } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { addDays } from "./days";
import { createDeck } from "./decks";
import { gradeCard } from "./review";
import {
  checkToday,
  reportDeviceTimezone,
  restoreIfLatest,
  reviewZone,
  type StreakDay,
  setReviewTimezone,
  streak,
  summariseStreak,
  undoReview,
} from "./review-days";
import { getSettings, updateSettings } from "./settings";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;
let people = 0;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60_000);

afterAll(async () => {
  await dispose();
});

/** A fresh learner on UTC days with a goal and some cards, so no test sees another's history. */
async function setup(goal: number, terms: string[]) {
  people += 1;
  const ctx = await learner(db, `learner-${people}`, `Learner ${people}`);
  await setReviewTimezone(ctx, { mode: "manual", timezone: "UTC" });
  await updateSettings(ctx, { dailyGoal: goal });
  const deck = await createDeck(ctx, { name: "Lesson", defaultLanguage: "et" });
  const outcomes = await addCards(
    ctx,
    terms.map((term) => ({ deckId: deck.id, term })),
  );
  const cards = outcomes.flatMap((o) => (o.status === "added" ? [o.card] : []));
  return { ctx, cards };
}

const grade = (ctx: ServiceContext, cardId: string, rating: 1 | 2 | 3 | 4, at: Date) =>
  gradeCard(ctx, { cardId, direction: "recognition", rating, reviewedAt: at });

const later = (seconds: number) => new Date(Date.now() + seconds * 1000);
const today = () => new Date().toISOString().slice(0, 10);

/** A past day's row, as a finished day would have left it. */
async function pastDay(ctx: ServiceContext, daysAgo: number, outcome: "goal_met" | "nothing_due") {
  await db.insert(schema.reviewDays).values({
    id: newId(),
    userId: ctx.userId,
    date: addDays(today(), -daysAgo),
    goal: 10,
    timezone: "UTC",
    outcome,
  });
}

describe("the daily goal counts attempts", () => {
  it("completes on the goal's attempt, counting Forgot and a card seen twice", async () => {
    const { ctx, cards } = await setup(3, ["tere", "aitäh"]);
    const [a, b] = cards;
    if (!a || !b) throw new Error("no cards");

    expect((await grade(ctx, a.id, 1, later(1))).day).toMatchObject({
      attempts: 1,
      outcome: "open",
    });
    expect((await grade(ctx, a.id, 3, later(2))).day).toMatchObject({
      attempts: 2,
      outcome: "open",
    });
    expect((await grade(ctx, b.id, 3, later(3))).day).toMatchObject({
      attempts: 3,
      goal: 3,
      outcome: "goal_met",
    });
    expect((await streak(ctx)).current).toBe(1);
  });

  it("completes below the goal once every eligible review is done", async () => {
    const { ctx, cards } = await setup(50, ["üks", "kaks"]);
    const [a, b] = cards;
    if (!a || !b) throw new Error("no cards");

    expect((await grade(ctx, a.id, 3, later(1))).day.outcome).toBe("open");
    expect((await grade(ctx, b.id, 3, later(2))).day).toMatchObject({
      attempts: 2,
      outcome: "exhausted",
    });
    expect((await streak(ctx)).current).toBe(1);
  });

  it("ignores a duplicate grade", async () => {
    const { ctx, cards } = await setup(5, ["kolm", "neli"]);
    const [a] = cards;
    if (!a) throw new Error("no cards");

    await grade(ctx, a.id, 3, later(5));
    const replay = await grade(ctx, a.id, 3, later(4));

    expect(replay).toMatchObject({ duplicate: true, reviewId: null, day: { attempts: 1 } });
  });

  it("stores a grade sent twice at once only once", async () => {
    const { ctx, cards } = await setup(5, ["kaheksa"]);
    const [a] = cards;
    if (!a) throw new Error("no cards");

    const at = later(5);
    const sent = await Promise.all([grade(ctx, a.id, 3, at), grade(ctx, a.id, 3, at)]);

    expect(sent.map((s) => s.duplicate).sort()).toEqual([false, true]);
    const stored = await db.select().from(schema.reviews).where(eq(schema.reviews.cardId, a.id));
    expect(stored).toHaveLength(1);
    expect((await streak(ctx)).today).toMatchObject({ attempts: 1 });
  });

  it("applies a new goal to an open today but never reopens a finished one", async () => {
    const { ctx, cards } = await setup(5, ["viis", "kuus", "seitse"]);
    const [a, b] = cards;
    if (!a || !b) throw new Error("no cards");

    await grade(ctx, a.id, 3, later(1));
    await grade(ctx, b.id, 3, later(2));
    await updateSettings(ctx, { dailyGoal: 2 });
    expect((await streak(ctx)).today).toMatchObject({ goal: 2, outcome: "goal_met" });

    await updateSettings(ctx, { dailyGoal: 10 });
    expect((await streak(ctx)).today).toMatchObject({ goal: 2, outcome: "goal_met" });
    expect((await getSettings(ctx)).dailyGoal).toBe(10);
  });
});

describe("undo", () => {
  it("takes the attempt back, restores the card and reopens the goal", async () => {
    const { ctx, cards } = await setup(2, ["kaheksa", "üheksa"]);
    const [a, b] = cards;
    if (!a || !b) throw new Error("no cards");

    await grade(ctx, a.id, 3, later(1));
    const last = await grade(ctx, b.id, 4, later(2));
    expect(last.day.outcome).toBe("goal_met");
    if (!last.reviewId) throw new Error("no review id");

    const day = await undoReview(ctx, last.reviewId);

    expect(day).toMatchObject({ attempts: 1, outcome: "open" });
    const [state] = await db
      .select()
      .from(schema.cardStates)
      .where(eq(schema.cardStates.cardId, b.id));
    expect(state).toMatchObject({ state: 0, lastReview: null });
    expect((await undoReview(ctx, last.reviewId)).attempts).toBe(1);
  });

  it("leaves a newer grade alone when it lands between the check and the write", async () => {
    const { ctx, cards } = await setup(10, ["viisteist"]);
    const [a] = cards;
    if (!a) throw new Error("no cards");
    const first = await grade(ctx, a.id, 1, later(1));
    if (!first.reviewId) throw new Error("no review id");
    const [review] = await db
      .select()
      .from(schema.reviews)
      .where(eq(schema.reviews.id, first.reviewId));
    if (!review?.stateBefore) throw new Error("no review");
    // Undo has read the state and decided this grade is the latest; then a newer grade lands.
    const newer = await grade(ctx, a.id, 4, later(2));

    await restoreIfLatest(ctx, {
      reviewId: review.id,
      stateId: review.cardStateId,
      reviewedAt: review.reviewedAt,
      before: JSON.parse(review.stateBefore),
      now: new Date(),
    });

    const [state] = await db
      .select()
      .from(schema.cardStates)
      .where(eq(schema.cardStates.id, review.cardStateId));
    expect(state?.due.toISOString()).toBe(newer.due);
    expect(
      await db.select().from(schema.reviewUndos).where(eq(schema.reviewUndos.reviewId, review.id)),
    ).toHaveLength(0);
  });

  it("refuses an older grade of a card that was graded again", async () => {
    const { ctx, cards } = await setup(10, ["kümme", "üksteist"]);
    const [a] = cards;
    if (!a) throw new Error("no cards");

    const first = await grade(ctx, a.id, 1, later(1));
    await grade(ctx, a.id, 3, later(2));
    if (!first.reviewId) throw new Error("no review id");

    await expect(undoReview(ctx, first.reviewId)).rejects.toMatchObject({ code: "conflict" });
  });
});

describe("a day with nothing due", () => {
  it("protects the run without adding to it, only after a visit", async () => {
    const { ctx } = await setup(10, []);
    await pastDay(ctx, 2, "goal_met");
    await pastDay(ctx, 1, "goal_met");

    expect(await checkToday(ctx)).toMatchObject({ attempts: 0, outcome: "nothing_due" });
    expect((await streak(ctx)).current).toBe(2);
  });

  it("does not confirm a day that still has cards to review", async () => {
    const { ctx } = await setup(10, ["kaksteist"]);

    expect(await checkToday(ctx)).toMatchObject({ outcome: "open" });
  });
});

describe("the review zone", () => {
  it("takes the first zone a client reports, and only a visible page moves it after", async () => {
    people += 1;
    const ctx = await learner(db, `learner-${people}`, `Learner ${people}`);

    expect(await reviewZone({ ...ctx, actor: "mcp" }, "Asia/Dubai")).toBe("Asia/Dubai");
    expect((await getSettings(ctx)).reviewTimezone).toBeNull();
    expect(await reviewZone(ctx, "Europe/Tallinn")).toBe("Europe/Tallinn");
    expect(await reviewZone(ctx, "America/New_York")).toBe("Europe/Tallinn");

    await reportDeviceTimezone(ctx, { timezone: "Asia/Tokyo" });
    expect((await getSettings(ctx)).reviewTimezone).toBe("Asia/Tokyo");

    await setReviewTimezone(ctx, { mode: "manual", timezone: "Europe/Helsinki" });
    await reportDeviceTimezone(ctx, { timezone: "America/New_York" });
    expect((await getSettings(ctx)).reviewTimezone).toBe("Europe/Helsinki");
  });

  it("files a grade on the day it happened in the review zone", async () => {
    const { ctx, cards } = await setup(10, ["kolmteist"]);
    const [a] = cards;
    if (!a) throw new Error("no cards");
    await setReviewTimezone(ctx, { mode: "manual", timezone: "Europe/Helsinki" });

    const graded = await grade(ctx, a.id, 3, new Date("2026-01-15T22:30:00Z"));

    expect(graded.day.date).toBe("2026-01-16");
  });
});

describe("history from before goals", () => {
  it("still counts a reviewed day as a streak day", async () => {
    const { ctx, cards } = await setup(10, ["neliteist"]);
    const [a] = cards;
    if (!a) throw new Error("no cards");
    const yesterday = new Date(Date.now() - 86_400_000);
    await grade(ctx, a.id, 3, yesterday);
    await db
      .update(schema.reviews)
      .set({ reviewDayId: null })
      .where(eq(schema.reviews.userId, ctx.userId));
    await db.delete(schema.reviewDays).where(eq(schema.reviewDays.userId, ctx.userId));

    const summary = await streak(ctx);

    expect(summary.current).toBe(1);
    expect(summary.days.at(-1)).toMatchObject({ attempts: 1, satisfied: true });
  });
});

describe("summariseStreak", () => {
  const day = (date: string, kind: "met" | "missed" | "nothing"): StreakDay => ({
    date,
    attempts: kind === "nothing" ? 0 : 3,
    goal: 3,
    satisfied: kind === "met",
    nothingDue: kind === "nothing",
  });

  it("keeps yesterday's run while today is unfinished", () => {
    const days = [day("2026-09-11", "met"), day("2026-09-12", "met"), day("2026-09-13", "missed")];

    expect(summariseStreak(days, "2026-09-13").current).toBe(2);
  });

  it("lets a nothing-due day carry a run without adding to it", () => {
    const days = [day("2026-09-10", "met"), day("2026-09-11", "nothing"), day("2026-09-12", "met")];

    expect(summariseStreak(days, "2026-09-12")).toMatchObject({ current: 2, longest: 2 });
  });

  it("breaks on a missed day or a day with no visit", () => {
    const days = [
      day("2026-09-05", "met"),
      day("2026-09-06", "met"),
      day("2026-09-07", "met"),
      day("2026-09-08", "missed"),
      day("2026-09-09", "met"),
      day("2026-09-11", "met"),
    ];

    expect(summariseStreak(days, "2026-09-11")).toMatchObject({
      current: 1,
      longest: 3,
      reviewedDays: 6,
    });
  });
});
