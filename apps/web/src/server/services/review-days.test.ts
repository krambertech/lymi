import { newId } from "@lymi/core";
import { and, eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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
  setReviewTimezone,
  streak,
  undoReview,
} from "./review-days";
import { getSettings, updateSettings } from "./settings";
import { insights } from "./stats";
import { learner, testDb } from "./test-db";
import { batchRacedBy, insertRacedBy, racedBy } from "./test-race";

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
    const summary = await streak(ctx);
    expect(summary.current).toBe(1);
    // The calendar reads this to say "nothing left" rather than borrowing "goal reached".
    expect(summary.days.at(-1)).toMatchObject({ outcome: "exhausted", satisfied: true });
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

  it("names the stored attempt when a grade is replayed, even behind a later grade", async () => {
    const { ctx, cards } = await setup(5, ["kaks"]);
    const [a] = cards;
    if (!a) throw new Error("no cards");

    const at = later(5);
    const first = await grade(ctx, a.id, 3, at);
    expect(await grade(ctx, a.id, 3, at)).toMatchObject({
      duplicate: true,
      reviewId: first.reviewId,
      day: { attempts: 1 },
    });

    await grade(ctx, a.id, 3, later(6));
    expect(await grade(ctx, a.id, 3, at)).toMatchObject({
      duplicate: true,
      reviewId: first.reviewId,
    });
  });

  it("names no attempt when the replayed grade was taken back", async () => {
    const { ctx, cards } = await setup(5, ["kolmas"]);
    const [a] = cards;
    if (!a) throw new Error("no cards");

    const at = later(5);
    const first = await grade(ctx, a.id, 3, at);
    if (!first.reviewId) throw new Error("no review id");
    await undoReview(ctx, first.reviewId);

    expect(await grade(ctx, a.id, 3, at)).toMatchObject({
      duplicate: true,
      reviewId: null,
      day: { attempts: 0 },
    });
  });

  describe("when another grade lands between reading the state and writing it", () => {
    /** Lands `rival` just before this context's grade writes reach the database, `times` over. */
    const overtakenBy = (
      ctx: ServiceContext,
      rival: () => Promise<unknown>,
      times = 1,
    ): ServiceContext => {
      let raced = 0;
      const batch = async (statements: Parameters<Db["batch"]>[0]) => {
        if (raced < times && statements.length > 2) {
          raced += 1;
          await rival();
        }
        return ctx.db.batch(statements);
      };
      return {
        ...ctx,
        db: new Proxy(ctx.db, {
          get: (db, key, receiver) => (key === "batch" ? batch : Reflect.get(db, key, receiver)),
        }),
      };
    };
    const history = async (ctx: ServiceContext, cardId: string) => {
      const [state] = await db
        .select()
        .from(schema.cardStates)
        .where(
          and(eq(schema.cardStates.cardId, cardId), eq(schema.cardStates.direction, "recognition")),
        );
      const reviews = await db
        .select()
        .from(schema.reviews)
        .where(eq(schema.reviews.cardId, cardId));
      const audited = await db
        .select()
        .from(schema.auditLog)
        .where(and(eq(schema.auditLog.entity, "review"), eq(schema.auditLog.userId, ctx.userId)));
      return { state, reviews, audited };
    };

    it("ignores an older grade, leaving the newer one's schedule and one audit row", async () => {
      const { ctx, cards } = await setup(5, ["viiendik"]);
      const [a] = cards;
      if (!a) throw new Error("no cards");

      const newer = later(6);
      const outcome = await grade(
        overtakenBy(ctx, () => grade(ctx, a.id, 4, newer)),
        a.id,
        1,
        later(5),
      );

      expect(outcome).toMatchObject({ duplicate: true, reviewId: null, day: { attempts: 1 } });
      const { state, reviews, audited } = await history(ctx, a.id);
      expect(state?.lastReview?.getTime()).toBe(newer.getTime());
      expect(reviews.map((r) => r.rating)).toEqual([4]);
      expect(audited).toHaveLength(1);
    });

    it("gives up with a 503 and writes nothing when every try is overtaken", async () => {
      const { ctx, cards } = await setup(5, ["kaheksandik"]);
      const [a] = cards;
      if (!a) throw new Error("no cards");

      let rivals = 0;
      const everyTry = overtakenBy(
        ctx,
        () => {
          rivals += 1;
          return grade(ctx, a.id, 3, later(rivals));
        },
        Number.POSITIVE_INFINITY,
      );

      await expect(grade(everyTry, a.id, 4, later(10))).rejects.toMatchObject({
        code: "unavailable",
      });
      expect(rivals).toBe(4);
      const { reviews, audited } = await history(ctx, a.id);
      expect(reviews).toHaveLength(4);
      expect(audited).toHaveLength(4);
    });

    it("audits a grade once when its copy and a later grade both land first", async () => {
      const { ctx, cards } = await setup(5, ["seitsmendik"]);
      const [a] = cards;
      if (!a) throw new Error("no cards");

      const at = later(5);
      await grade(
        overtakenBy(ctx, async () => {
          await grade(ctx, a.id, 3, at);
          await grade(ctx, a.id, 3, later(6));
        }),
        a.id,
        3,
        at,
      );

      const { reviews, audited } = await history(ctx, a.id);
      expect(reviews).toHaveLength(2);
      expect(audited).toHaveLength(2);
    });

    it("schedules a newer grade on top of the older one that beat it", async () => {
      const { ctx, cards } = await setup(5, ["kuuendik"]);
      const [a] = cards;
      if (!a) throw new Error("no cards");

      const older = later(5);
      const newer = later(6);
      const outcome = await grade(
        overtakenBy(ctx, () => grade(ctx, a.id, 3, older)),
        a.id,
        4,
        newer,
      );

      expect(outcome).toMatchObject({ duplicate: false, day: { attempts: 2 } });
      const { state, reviews, audited } = await history(ctx, a.id);
      expect(state?.lastReview?.getTime()).toBe(newer.getTime());
      const landed = reviews.find((r) => r.id === outcome.reviewId);
      expect(JSON.parse(landed?.stateBefore ?? "{}").lastReview).toBe(older.getTime());
      expect(reviews).toHaveLength(2);
      expect(audited).toHaveLength(2);
    });
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

  it("reports a grade taken back once, however often the undo is sent", async () => {
    const { ctx, cards } = await setup(10, ["kaksteist"]);
    const [a] = cards;
    if (!a) throw new Error("no cards");
    const capture = vi.fn();
    const watched = { ...ctx, analytics: { capture, writeDataPoint: vi.fn() } };
    const graded = await grade(watched, a.id, 2, later(1));
    if (!graded.reviewId) throw new Error("no review id");

    await undoReview(watched, graded.reviewId);
    await undoReview(watched, graded.reviewId);

    const undone = capture.mock.calls
      .map(([event]) => event)
      .filter((e) => e.name === "review_undone");
    expect(undone).toEqual([{ name: "review_undone", mode: "term_to_meaning", grade: 2 }]);
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

  it("confirms today found in the current zone though it opened in another", async () => {
    const { ctx } = await setup(10, []);
    // A zone whose date is not today's UTC date right now, as after the learner travelled.
    const away = new Date().getUTCHours() >= 10 ? "Pacific/Kiritimati" : "Pacific/Pago_Pago";
    await db.insert(schema.reviewDays).values({
      id: newId(),
      userId: ctx.userId,
      date: today(),
      goal: 10,
      timezone: away,
    });

    expect(await checkToday(ctx)).toMatchObject({ attempts: 0, outcome: "nothing_due" });
  });

  it("stays protected when cards added after the visit are graded below the goal", async () => {
    const { ctx } = await setup(2, []);
    expect(await checkToday(ctx)).toMatchObject({ outcome: "nothing_due" });
    const deck = await createDeck(ctx, { name: "Later", defaultLanguage: "et" });
    const added = await addCards(ctx, [
      { deckId: deck.id, term: "esimene" },
      { deckId: deck.id, term: "teine" },
      { deckId: deck.id, term: "kolmas" },
    ]);
    const [a, b] = added.flatMap((o) => (o.status === "added" ? [o.card.id] : []));
    if (!a || !b) throw new Error("no cards");

    expect((await grade(ctx, a, 3, new Date())).day).toMatchObject({
      attempts: 1,
      outcome: "nothing_due",
    });
    expect((await grade(ctx, b, 3, new Date())).day).toMatchObject({
      attempts: 2,
      outcome: "goal_met",
    });
  });

  it("does not confirm a day that still has cards to review", async () => {
    const { ctx } = await setup(10, ["kaksteist"]);

    expect(await checkToday(ctx)).toMatchObject({ outcome: "open" });
  });
});

describe("a grade that lands while the day is being settled", () => {
  /** A learner whose cards are not due, so opening Lymi finds nothing to review. */
  async function nothingDue(goal: number) {
    const { ctx, cards } = await setup(goal, ["hiljem", "homme"]);
    const [card, other] = cards;
    if (!card || !other) throw new Error("no cards");
    await db
      .update(schema.cardStates)
      .set({ due: later(30 * 86_400) })
      .where(eq(schema.cardStates.userId, ctx.userId));
    return { ctx, card, other };
  }

  const stored = async (ctx: ServiceContext) => {
    const [row] = await db
      .select()
      .from(schema.reviewDays)
      .where(and(eq(schema.reviewDays.userId, ctx.userId), eq(schema.reviewDays.date, today())));
    return row;
  };

  it("never confirms nothing due over a grade that landed after the visit read the day", async () => {
    const { ctx, card } = await nothingDue(1);
    const visit = racedBy(ctx, schema.reviewDays, () => grade(ctx, card.id, 3, new Date()));

    expect(await checkToday(visit)).toMatchObject({ attempts: 1, outcome: "goal_met" });
    expect(await stored(ctx)).toMatchObject({ outcome: "goal_met", zeroDueConfirmedAt: null });
  });

  it("settles a grade on the attempts that are there when it writes", async () => {
    const { ctx, card, other } = await nothingDue(2);
    await checkToday(ctx);
    const first = racedBy(ctx, schema.reviewDays, () => grade(ctx, other.id, 3, new Date()));

    const { day } = await grade(first, card.id, 3, new Date());
    expect(day).toMatchObject({ attempts: 2, outcome: "goal_met" });
    expect(await stored(ctx)).toMatchObject({ outcome: "goal_met" });
  });

  it("keeps the goal a day was met against when a grade meets it during a goal change", async () => {
    const { ctx, cards } = await setup(2, ["üks", "kaks"]);
    const [a, b] = cards;
    if (!a || !b) throw new Error("no cards");
    await grade(ctx, a.id, 3, later(-60));
    const raising = racedBy(ctx, schema.reviewDays, () => grade(ctx, b.id, 3, new Date()));

    await updateSettings(raising, { dailyGoal: 5 });
    expect(await stored(ctx)).toMatchObject({ goal: 2, outcome: "goal_met" });
  });

  it("opens today on a goal changed after the visit read the settings", async () => {
    const { ctx } = await setup(10, []);
    // Today's visit read a goal of 10; the new goal lands before its row does, so there is no row to move.
    const visit = insertRacedBy(ctx, schema.reviewDays, () =>
      updateSettings(ctx, { dailyGoal: 4 }),
    );

    await checkToday(visit);
    expect(await stored(ctx)).toMatchObject({ goal: 4 });
    expect((await streak(ctx)).today.goal).toBe(4);
  });

  it("settles an Undo on the day as it is when the Undo lands, not as it read it", async () => {
    const { ctx, card, other } = await nothingDue(2);
    const { reviewId } = await grade(ctx, card.id, 3, new Date());
    if (!reviewId) throw new Error("no review");
    // The Undo read the day as exhausted; another grade meets the goal before it lands.
    const undo = batchRacedBy(ctx, () => grade(ctx, other.id, 3, new Date()));

    expect(await undoReview(undo, reviewId)).toMatchObject({ attempts: 1, outcome: "exhausted" });
    expect(await stored(ctx)).toMatchObject({ outcome: "exhausted" });
  });

  it("settles a grade on the day as it is when the grade lands, not as it read it", async () => {
    const { ctx, card, other } = await nothingDue(2);
    const { reviewId } = await grade(ctx, card.id, 3, later(-60));
    if (!reviewId) throw new Error("no review");
    // The grade read the day as exhausted; an Undo and a visit make it nothing due before it lands.
    const late = batchRacedBy(
      ctx,
      async () => {
        await undoReview(ctx, reviewId);
        await checkToday(ctx);
      },
      (statements) => statements.length > 2,
    );

    expect((await grade(late, other.id, 3, new Date())).day).toMatchObject({
      attempts: 1,
      outcome: "exhausted",
    });
    expect(await stored(ctx)).toMatchObject({ outcome: "exhausted" });
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

  it("draws the grid in the review zone, not the one the caller reports", async () => {
    const { ctx, cards } = await setup(10, ["neljateist"]);
    const [a] = cards;
    if (!a) throw new Error("no cards");
    await setReviewTimezone(ctx, { mode: "manual", timezone: "Europe/Helsinki" });
    await grade(ctx, a.id, 3, new Date("2026-01-15T22:30:00Z"));

    // Kiritimati is nineteen hours from New York, so a grid built in the reported zone would
    // put today on a different cell from the day rows it draws.
    await setReviewTimezone(ctx, { mode: "manual", timezone: "Pacific/Kiritimati" });
    const view = await insights(ctx, { period: 0, zone: "America/New_York" });

    expect(view.activity.today).toBe(inZone(new Date(), "Pacific/Kiritimati"));
    expect(view.activity.days.map((d) => d.date)).toContain("2026-01-16");
  });
});

const inZone = (at: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);

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
