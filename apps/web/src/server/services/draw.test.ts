import { drawableCount as countDrawable, type DrawCard, drawOrder, modeKey } from "@lymi/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck, listDecks, updateDeck } from "./decks";
import { drawableCount } from "./draw";
import { gradeCard, reviewDraw, reviewQueue, reviewRounds } from "./review";
import { checkToday, setReviewTimezone, undoReview } from "./review-days";
import { updateSettings } from "./settings";
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

const DAY = 86_400_000;

/** A fresh learner on UTC days with one deck, so no test sees another's cards or log. */
async function setup(
  terms: { term: string; meaning?: string }[],
  directions: "recognition" | "production" | "both" = "recognition",
) {
  people += 1;
  const ctx = await learner(db, `drawer-${people}`, `Drawer ${people}`);
  await setReviewTimezone(ctx, { mode: "manual", timezone: "UTC" });
  await updateSettings(ctx, { dailyGoal: 50 });
  const deck = await createDeck(ctx, { name: "Lesson", defaultLanguage: "et", directions });
  const outcomes = await addCards(
    ctx,
    terms.map((t) => ({ deckId: deck.id, ...t })),
  );
  const cards = outcomes.flatMap((o) => (o.status === "added" ? [o.card] : []));
  return { ctx, deck, cards };
}

const deckDue = async (ctx: ServiceContext, deckId: string) =>
  (await listDecks(ctx)).find((d) => d.id === deckId)?.due;

describe("every count is the drawable set", () => {
  it("agrees between the queue, the deck, the day and the draw", async () => {
    const { ctx, deck } = await setup([
      { term: "üks", meaning: "one" },
      { term: "kaks", meaning: "two" },
      { term: "kolm", meaning: "three" },
    ]);
    const queue = await reviewQueue(ctx);
    expect(queue.total).toBe(3);
    expect(queue.items).toHaveLength(3);
    expect(await deckDue(ctx, deck.id)).toBe(3);
    expect(await drawableCount(ctx, { zone: "UTC" })).toBe(3);
    const draw = await reviewDraw(ctx, {});
    expect(draw).toMatchObject({ total: 3, attempts: 0, goal: 50, day: { zone: "UTC" } });
    expect(draw.cards.map((c) => c.card.id)).toEqual(queue.items.map((i) => i.card.id));
    expect(draw.log).toEqual([]);
  });

  it("gives the same order twice, and a deck scope only its own cards", async () => {
    const { ctx, deck } = await setup(
      Array.from({ length: 12 }, (_, i) => ({ term: `sõna ${i}`, meaning: `word ${i}` })),
    );
    const other = await createDeck(ctx, { name: "Other", defaultLanguage: "et" });
    await addCards(
      ctx,
      Array.from({ length: 6 }, (_, i) => ({ deckId: other.id, term: `muu ${i}` })),
    );
    const ids = (q: Awaited<ReturnType<typeof reviewQueue>>) => q.items.map((i) => i.card.id);
    const all = ids(await reviewQueue(ctx));
    expect(all).toHaveLength(18);
    expect(ids(await reviewQueue(ctx))).toEqual(all);
    const scoped = ids(await reviewQueue(ctx, { deckId: deck.id }));
    expect(scoped).toHaveLength(12);
    expect(ids(await reviewQueue(ctx, { deckId: deck.id }))).toEqual(scoped);
    expect(scoped.every((id) => all.includes(id))).toBe(true);
    expect(await deckDue(ctx, deck.id)).toBe(12);
    expect(await deckDue(ctx, other.id)).toBe(6);
  });
});

describe("one direction per card per day", () => {
  it("starts production first, and holds recognition until production reaches Review", async () => {
    const { ctx, deck, cards } = await setup([{ term: "üks", meaning: "one" }], "both");
    const [card] = cards;
    if (!card) throw new Error("no card");

    const queue = await reviewQueue(ctx);
    expect(queue.items.map((i) => i.direction)).toEqual(["production"]);

    await gradeCard(ctx, { cardId: card.id, direction: "production", rating: 3 });
    expect((await reviewQueue(ctx)).items).toEqual([]);
    expect(await deckDue(ctx, deck.id)).toBe(0);

    // Tomorrow production is in Review, so recognition is introduced.
    const tomorrow = new Date(Date.now() + DAY);
    expect(await drawableCount(ctx, { zone: "UTC", now: tomorrow })).toBe(1);
    expect(await drawableCount(ctx, { zone: "UTC" })).toBe(0);
  });

  it("skips a direction whose cue the card lacks", async () => {
    const { ctx } = await setup([{ term: "kaks" }], "both");
    expect((await reviewQueue(ctx)).items.map((i) => i.direction)).toEqual(["recognition"]);
    const { ctx: production } = await setup([{ term: "kolm" }], "production");
    expect((await reviewQueue(production)).total).toBe(0);
    expect((await checkToday(production)).outcome).toBe("nothing_due");
  });
});

describe("returns and undo", () => {
  it("keeps a forgotten card drawable and the day open, and Undo restores the count", async () => {
    const { ctx, cards } = await setup([{ term: "üks", meaning: "one" }]);
    const [card] = cards;
    if (!card) throw new Error("no card");

    const forgot = await gradeCard(ctx, { cardId: card.id, direction: "recognition", rating: 1 });
    expect(forgot.day.outcome).toBe("open");
    expect(forgot.state).toBe(1);
    const queue = await reviewQueue(ctx);
    expect(queue.total).toBe(1);
    expect(queue.items.map((i) => i.card.id)).toEqual([card.id]);
    const draw = await reviewDraw(ctx, { limit: 1 });
    expect(draw.log).toHaveLength(1);
    expect(draw.log[0]).toMatchObject({ cardId: card.id, rating: 1, stateBefore: 0 });
    expect(draw.cards.map((c) => c.card.id)).toEqual([card.id]);

    const good = await gradeCard(ctx, {
      cardId: card.id,
      direction: "recognition",
      rating: 3,
      reviewedAt: new Date(Date.now() + 1000),
    });
    expect(good.day.outcome).toBe("exhausted");
    expect(await drawableCount(ctx, { zone: "UTC" })).toBe(0);

    if (!good.reviewId) throw new Error("no review");
    expect((await undoReview(ctx, good.reviewId)).outcome).toBe("open");
    expect(await drawableCount(ctx, { zone: "UTC" })).toBe(1);
  });

  it("stops after three returns and calls the day exhausted", async () => {
    const { ctx, cards } = await setup([{ term: "üks", meaning: "one" }]);
    const [card] = cards;
    if (!card) throw new Error("no card");
    let day = { outcome: "open" as string };
    for (let i = 0; i < 4; i++) {
      ({ day } = await gradeCard(ctx, {
        cardId: card.id,
        direction: "recognition",
        rating: 1,
        reviewedAt: new Date(Date.now() + i * 1000),
      }));
    }
    expect(day.outcome).toBe("exhausted");
    expect((await reviewQueue(ctx)).total).toBe(0);
  });
});

describe("a card asked both ways", () => {
  it("brings the other direction to the draw even when it is not due", async () => {
    const { ctx, cards } = await setup([{ term: "üks", meaning: "one" }], "both");
    const [card] = cards;
    if (!card) throw new Error("no card");
    await gradeCard(ctx, { cardId: card.id, direction: "production", rating: 3 });
    const draw = await reviewDraw(ctx, {});
    expect(draw.total).toBe(0);
    expect(draw.cards).toEqual([]);
    const tomorrow = await drawableCount(ctx, { zone: "UTC", now: new Date(Date.now() + DAY) });
    expect(tomorrow).toBe(1);
    await updateDeck(ctx, (await listDecks(ctx))[0]?.id ?? "", { directions: "recognition" });
    expect(await drawableCount(ctx, { zone: "UTC", now: new Date(Date.now() + DAY) })).toBe(1);
  });
});

describe("a client can draw for itself", () => {
  it("recomputes the server's queue from what GET /review/draw returns", async () => {
    const { ctx, cards } = await setup(
      Array.from({ length: 14 }, (_, i) => ({ term: `sõna ${i}`, meaning: `word ${i}` })),
      "both",
    );
    const at = (s: number) => new Date(Date.now() + s * 1000);
    // Three misses and two successes, so returns, finished cards and fresh ones all mix.
    for (const [i, rating] of ([1, 1, 3, 1, 4] as const).entries()) {
      const card = cards[i];
      if (!card) throw new Error("no card");
      await gradeCard(ctx, { cardId: card.id, direction: "production", rating, reviewedAt: at(i) });
    }

    const draw = await reviewDraw(ctx, { limit: 500 });
    const rebuilt: DrawCard[] = draw.cards.map(({ card, modes }) => ({
      cardId: card.id,
      deckId: card.deckId,
      modes: modes.map((m) => ({
        mode: modeKey(m.mode),
        state: m.fsrsState,
        due: new Date(m.due),
        retrievability: m.retrievability,
        added: new Date(m.added),
        hasCue: m.hasCue,
      })),
    }));
    const log = draw.log.map((e) => ({
      cardId: e.cardId,
      mode: modeKey(e.mode),
      rating: e.rating,
      stateBefore: e.stateBefore,
      at: new Date(e.at),
    }));
    const day = {
      date: draw.day.date,
      start: new Date(draw.day.start),
      end: new Date(draw.day.end),
    };

    const queue = await reviewQueue(ctx);
    const key = (cardId: string, direction: string) => `${cardId} ${direction}`;
    expect(drawOrder(rebuilt, log, day).map((d) => key(d.cardId, d.mode))).toEqual(
      queue.items.map((i) => key(i.card.id, modeKey(i.mode))),
    );
    expect(countDrawable(rebuilt, log, day)).toBe(queue.total);
    expect(draw.attempts).toBe(5);
    expect(draw.log.map((e) => e.rating)).toEqual([1, 1, 3, 1, 4]);
    // Every card asked both ways arrives with both directions, so the client can hold one back.
    expect(draw.cards.every((c) => c.modes.length === 2)).toBe(true);
  });

  it("ignores an offline grade that arrives after a later grade of the same card", async () => {
    const { ctx, cards } = await setup([{ term: "üks", meaning: "one" }]);
    const [card] = cards;
    if (!card) throw new Error("no card");
    const good = await gradeCard(ctx, { cardId: card.id, direction: "recognition", rating: 3 });
    const stale = await gradeCard(ctx, {
      cardId: card.id,
      direction: "recognition",
      rating: 1,
      reviewedAt: new Date(Date.now() - 60_000),
    });
    expect(stale.duplicate).toBe(true);
    expect(good.duplicate).toBe(false);
    const draw = await reviewDraw(ctx, {});
    expect(draw.log.map((e) => e.rating)).toEqual([3]);
    expect(draw.total).toBe(0);
  });

  it("forgets a return when the miss is undone", async () => {
    const { ctx, cards } = await setup([
      { term: "üks", meaning: "one" },
      { term: "kaks", meaning: "two" },
    ]);
    const [a] = cards;
    if (!a) throw new Error("no card");
    const miss = await gradeCard(ctx, { cardId: a.id, direction: "recognition", rating: 1 });
    if (!miss.reviewId) throw new Error("no review");
    expect((await reviewQueue(ctx)).items.map((i) => i.card.id)).toContain(a.id);
    await undoReview(ctx, miss.reviewId);
    const draw = await reviewDraw(ctx, {});
    expect(draw.log).toEqual([]);
    expect(draw.cards.map((c) => c.modes[0]?.fsrsState)).toEqual([0, 0]);
    expect(draw.total).toBe(2);
  });
});

describe("the day follows the review zone", () => {
  it("keeps a grade at 23:50 Tokyo in that Tokyo day and starts the next one at midnight", async () => {
    const { ctx, cards } = await setup([{ term: "üks", meaning: "one" }]);
    const [card] = cards;
    if (!card) throw new Error("no card");
    await setReviewTimezone(ctx, { mode: "manual", timezone: "Asia/Tokyo" });
    // 14:50 UTC is 23:50 in Tokyo. Missed then, the card is a pending return until midnight.
    const lateNight = new Date(Date.now() + 5 * 3_600_000);
    lateNight.setUTCHours(14, 50, 0, 0);
    await gradeCard(ctx, {
      cardId: card.id,
      direction: "recognition",
      rating: 1,
      reviewedAt: lateNight,
    });
    const beforeMidnight = new Date(lateNight.getTime() + 5 * 60_000);
    const afterMidnight = new Date(lateNight.getTime() + 20 * 60_000);
    expect(await drawableCount(ctx, { zone: "Asia/Tokyo", now: beforeMidnight })).toBe(1);
    expect(await drawableCount(ctx, { zone: "Asia/Tokyo", now: afterMidnight })).toBe(1);
    // Seen from a zone still on the earlier date, the grade is in today's log; from Tokyo it is yesterday's.
    const tokyo = await reviewDraw(ctx, {});
    expect(tokyo.day.zone).toBe("Asia/Tokyo");
  });
});

describe("Today rounds", () => {
  it("counts and queues forgotten, new and slipping cards", async () => {
    const { ctx, cards } = await setup([
      { term: "tähelepanelik", meaning: "attentive" },
      { term: "vihmavari", meaning: "umbrella" },
      { term: "kolima", meaning: "to move house" },
    ]);
    const [slipping, forgotten, fresh] = cards;
    if (!slipping || !forgotten || !fresh) throw new Error("no cards");

    const history = [1, 1, 3, 1, 1, 3] as const;
    for (const [i, rating] of history.entries()) {
      await gradeCard(ctx, {
        cardId: slipping.id,
        direction: "recognition",
        rating,
        reviewedAt: new Date(Date.now() - (12 - i) * DAY),
      });
    }
    await gradeCard(ctx, { cardId: forgotten.id, direction: "recognition", rating: 1 });

    expect(await reviewRounds(ctx)).toEqual({ forgotten: 1, new: 1, slipping: 1 });
    const round = async (name: "forgotten" | "new" | "slipping") => {
      const queue = await reviewQueue(ctx, { round: name });
      return { total: queue.total, ids: queue.items.map((i) => i.card.id) };
    };
    expect(await round("forgotten")).toEqual({ total: 1, ids: [forgotten.id] });
    expect(await round("new")).toEqual({ total: 1, ids: [fresh.id] });
    expect(await round("slipping")).toEqual({ total: 1, ids: [slipping.id] });
  });
});
