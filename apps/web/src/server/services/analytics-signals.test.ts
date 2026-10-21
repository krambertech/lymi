import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { type Db, schema } from "../db";
import type { AnalyticsWriter } from "./analytics";
import { addCards, archiveCards, updateCard } from "./cards";
import { addDays, dateFormatter } from "./days";
import { createDeck } from "./decks";
import { gradeCard } from "./review";
import { openDay } from "./review-days";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;
beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60000);
afterAll(async () => {
  await dispose();
});

function writer() {
  const capture = vi.fn();
  const work: Promise<void>[] = [];
  const analytics: AnalyticsWriter = {
    capture,
    writeDataPoint: vi.fn(),
    later: (run) => {
      work.push(run());
    },
  };
  const events = async () => {
    await Promise.all(work.splice(0));
    return capture.mock.calls.map((call) => call[0]);
  };
  return { analytics, events };
}

async function cardFor(id: string) {
  const { analytics, events } = writer();
  const ctx = { ...(await learner(db, id, "Learner")), analytics };
  const deck = await createDeck(ctx, { name: "Deck", defaultLanguage: "et" });
  const added = await addCards(ctx, [
    { deckId: deck.id, term: "private term", meaning: "private meaning" },
    { deckId: deck.id, term: "second term", meaning: "second meaning" },
  ]);
  const cards = added.flatMap((outcome) => (outcome.status === "added" ? [outcome.card] : []));
  return { ctx, cards, events };
}

it("names the card's state before the grade and a peek at the hook", async () => {
  const { ctx, cards, events } = await cardFor("signals-grade");
  const card = cards[0];
  if (!card) throw new Error("Card not added");
  await gradeCard(ctx, {
    cardId: card.id,
    direction: "recognition",
    rating: 3,
    aid: "hook",
    reviewedAt: new Date(),
  });
  const graded = (await events()).filter((event) => event.name === "review_graded");
  expect(graded).toMatchObject([{ name: "review_graded", grade: 3, state: "new", aid: "hook" }]);
});

it("says where web review drew a Japanese term's reading, and nothing for other cards or the phone", async () => {
  const { analytics, events } = writer();
  const ctx = { ...(await learner(db, "signals-reading", "Learner")), analytics };
  const deck = await createDeck(ctx, { name: "日本語", defaultLanguage: "ja", directions: "both" });
  const added = await addCards(ctx, [
    { deckId: deck.id, term: "食べる", meaning: "to eat", pronunciation: "たべる" },
    { deckId: deck.id, term: "ありがとう", meaning: "thank you" },
    { deckId: deck.id, term: "学校", meaning: "school", pronunciation: "がっこう" },
  ]);
  const [eat, thanks, school] = added.flatMap((o) => (o.status === "added" ? [o.card] : []));
  if (!eat || !thanks || !school) throw new Error("Cards not added");
  const at = new Date();
  await gradeCard(ctx, { cardId: eat.id, direction: "recognition", rating: 3, reviewedAt: at });
  await gradeCard(ctx, { cardId: eat.id, direction: "production", rating: 3, reviewedAt: at });
  await gradeCard(ctx, { cardId: thanks.id, direction: "recognition", rating: 3, reviewedAt: at });
  // The phone draws no furigana yet, so its grades say nothing about where it was.
  const phone = { cardId: school.id, direction: "recognition" as const, rating: 3 as const };
  await gradeCard(ctx, { ...phone, reviewedAt: at }, { over: false, inPlace: {}, byWord: false });
  const graded = (await events()).filter((event) => event.name === "review_graded");
  expect(graded.map((event) => event.reading)).toEqual(["cue", "answer", undefined, undefined]);
});

it("reports a rest day and a broken run once, from the day's first activity", async () => {
  const { analytics, events } = writer();
  const ctx = { ...(await learner(db, "signals-streak", "Learner")), analytics };
  const today = dateFormatter("UTC").format(new Date());
  // Two met days, then two empty ones: the first is a rest day, the second ends the run.
  for (const offset of [4, 3]) {
    await db.insert(schema.reviewDays).values({
      id: `met-${offset}`,
      userId: ctx.userId,
      date: addDays(today, -offset),
      goal: 1,
      timezone: "UTC",
      outcome: "goal_met",
    });
  }
  await openDay(ctx, today, "UTC", 10);
  await openDay(ctx, today, "UTC", 10);
  const streak = (await events()).filter(
    (event) => event.name === "rest_day_used" || event.name === "streak_ended",
  );
  expect(streak).toEqual([
    { name: "rest_day_used", streak_days: 2 },
    { name: "streak_ended", streak_days: 2 },
  ]);
});

it("reports a first hook with its source, and archives by origin without card text", async () => {
  const { ctx, cards, events } = await cardFor("signals-cards");
  const [first, second] = cards;
  if (!first || !second) throw new Error("Cards not added");
  await updateCard(ctx, first.id, { hook: "a picture" });
  await updateCard(ctx, first.id, { hook: "another picture" });
  await db.update(schema.cards).set({ meaningSource: "ai" }).where(eq(schema.cards.id, second.id));
  await archiveCards(ctx, [first.id, second.id]);
  await archiveCards(ctx, [first.id, second.id]);
  const all = await events();
  expect(all.filter((event) => event.name === "hook_added")).toEqual([
    { name: "hook_added", source: "manual" },
  ]);
  expect(all.filter((event) => event.name === "cards_archived")).toEqual([
    { name: "cards_archived", origin: "typed", count: 2, ai_written: 1 },
  ]);
  expect(JSON.stringify(all)).not.toContain("private");
});
