import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { type Db, schema } from "../db";
import type { AnalyticsWriter } from "./analytics";
import { recordFirstReview } from "./analytics-review";
import { addCards } from "./cards";
import { createDeck } from "./decks";
import { addPublishedDeck, publishDeck } from "./publications";
import { gradeCard } from "./review";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;
beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60000);
afterAll(async () => {
  await dispose();
});

function writer(capture = vi.fn()) {
  const work: Promise<void>[] = [];
  const analytics: AnalyticsWriter = {
    capture,
    writeDataPoint: vi.fn(),
    later: (run) => {
      work.push(run());
    },
  };
  return { analytics, capture, settled: () => Promise.all(work.splice(0)) };
}
it("adds, joins and activates a published deck once, without private fields", async () => {
  const publisher = await learner(db, "analytics-publisher", "Publisher");
  const student = await learner(db, "analytics-student", "Learner");
  const { analytics, capture, settled } = writer();
  const ctx = { ...student, analytics };
  const deck = await createDeck(publisher, { name: "Private title", defaultLanguage: "et" });
  const [added] = await addCards(publisher, [
    { deckId: deck.id, term: "private word", meaning: "private meaning" },
  ]);
  if (added?.status !== "added") throw new Error("Card not added");
  await publishDeck(
    publisher,
    deck.id,
    {
      slug: "analytics-example",
      summary: "Public summary",
      meaningLanguage: "en",
      publisher: "Lymi",
      sources: [],
    },
    new Set(["analytics-publisher@lymi.test"]),
  );
  await addPublishedDeck(ctx, "analytics-example");
  await addPublishedDeck(ctx, "analytics-example");
  const grade = {
    cardId: added.card.id,
    direction: "recognition" as const,
    rating: 3 as const,
    reviewedAt: new Date(),
  };
  await gradeCard(ctx, grade);
  await settled();
  await gradeCard(ctx, grade);
  await settled();
  const events = capture.mock.calls.map((call) => call[0]);
  expect(events.filter((event) => event.name === "deck_added")).toEqual([
    { name: "deck_added", deck_slug: "analytics-example" },
  ]);
  expect(events.filter((event) => event.name === "first_session_started")).toEqual([
    { name: "first_session_started", deck_slug: "analytics-example" },
  ]);
  expect(events.filter((event) => event.name === "welcome_step_finished")).toEqual([
    { name: "welcome_step_finished", step_name: "review", skipped: false },
  ]);
  expect(events.filter((event) => event.name === "review_graded")).toHaveLength(1);
  expect(JSON.stringify(events)).not.toContain("private");
  await db.delete(schema.reviews).where(eq(schema.reviews.userId, student.userId));
  recordFirstReview(ctx, deck.id, { id: "later-review", reviewedAt: new Date() });
  await settled();
  expect(
    capture.mock.calls.filter((call) => call[0].name === "first_session_started"),
  ).toHaveLength(1);
});
it("does not manufacture first activation for historical learners", async () => {
  const student = await learner(db, "historical-learner", "Learner");
  const deck = await createDeck(student, { name: "History" });
  const [added] = await addCards(student, [{ deckId: deck.id, term: "historical" }]);
  if (added?.status !== "added") throw new Error("Card not added");
  await gradeCard(student, { cardId: added.card.id, direction: "recognition", rating: 3 });
  const { analytics, capture, settled } = writer();
  recordFirstReview({ ...student, analytics }, deck.id, {
    id: "later-review",
    reviewedAt: new Date(),
  });
  await settled();
  expect(capture).not.toHaveBeenCalled();
});
it("does not fail a stored grade when analytics storage is unavailable", async () => {
  const { analytics, settled } = writer();
  const ctx = {
    db: {
      select: () => {
        throw new Error("unavailable");
      },
    } as unknown as Db,
    userId: "opaque-id",
    actor: "user" as const,
    analytics,
  };
  recordFirstReview(ctx, "deck", { id: "review", reviewedAt: new Date() });
  await expect(settled()).resolves.toEqual([undefined]);
});
it("activates the earlier grade when a later one's marker runs first", async () => {
  const student = await learner(db, "racing-learner", "Learner");
  const deck = await createDeck(student, { name: "Race" });
  const added = await addCards(student, [
    { deckId: deck.id, term: "first" },
    { deckId: deck.id, term: "second" },
  ]);
  const queued: (() => Promise<void>)[] = [];
  const capture = vi.fn();
  const ctx = {
    ...student,
    analytics: {
      capture,
      writeDataPoint: vi.fn(),
      later: (run: () => Promise<void>) => queued.push(run),
    },
  };
  const now = Date.now();
  for (const [index, outcome] of added.entries()) {
    if (outcome.status !== "added") throw new Error("Card not added");
    await gradeCard(ctx, {
      cardId: outcome.card.id,
      direction: "recognition",
      rating: 3,
      reviewedAt: new Date(now + index),
    });
  }
  for (const run of queued.reverse()) await run();
  expect(capture.mock.calls.filter((call) => call[0].name === "welcome_step_finished")).toEqual([
    [{ name: "welcome_step_finished", step_name: "review", skipped: false }],
  ]);
});

it("says where a Japanese term's reading showed, only when the grader draws furigana", async () => {
  const student = await learner(db, "analytics-reading", "Learner");
  const { analytics, capture, settled } = writer();
  const ctx = { ...student, analytics };
  const deck = await createDeck(ctx, {
    name: "Japanese",
    defaultLanguage: "ja",
    reviewModes: [
      { cue: "term", target: "meaning" },
      { cue: "meaning", target: "term" },
    ],
  });
  const added = await addCards(ctx, [
    { deckId: deck.id, term: "食べる", meaning: "to eat", pronunciation: "たべる" },
    { deckId: deck.id, term: "見る", meaning: "to see", pronunciation: "みる" },
  ]);
  const [eat, see] = added.map((a) => (a.status === "added" ? a.card.id : ""));
  const at = (cardId: string, furigana: boolean, mode: "term_to_meaning" | "meaning_to_term") =>
    gradeCard(
      ctx,
      {
        cardId,
        mode:
          mode === "term_to_meaning"
            ? { cue: "term", target: "meaning" }
            : { cue: "meaning", target: "term" },
        rating: 3,
        reviewedAt: new Date(),
      },
      furigana,
    );
  await at(eat as string, true, "term_to_meaning");
  await at(eat as string, true, "meaning_to_term");
  await at(see as string, false, "term_to_meaning");
  await settled();
  const readings = capture.mock.calls
    .map((call) => call[0])
    .filter((event) => event.name === "review_graded")
    .map((event) => event.reading);
  expect(readings).toEqual(["cue", "answer", undefined]);
});

it("names the language whose reading was drawn, so Chinese and Japanese chart apart", async () => {
  const student = await learner(db, "analytics-reading-language", "Learner");
  const { analytics, capture, settled } = writer();
  const ctx = { ...student, analytics };
  const ids: string[] = [];
  for (const [language, term, pronunciation] of [
    ["zh-TW", "學習", "xue2 xi2"],
    ["ja", "見る", "みる"],
    ["ko", "학교", "hakgyo"],
  ] as const) {
    const deck = await createDeck(ctx, { name: language, defaultLanguage: language });
    const [added] = await addCards(ctx, [{ deckId: deck.id, term, meaning: "m", pronunciation }]);
    ids.push(added?.status === "added" ? added.card.id : "");
  }
  for (const cardId of ids) {
    await gradeCard(ctx, { cardId, direction: "recognition", rating: 3, reviewedAt: new Date() });
  }
  await settled();
  const graded = capture.mock.calls
    .map((call) => call[0])
    .filter((event) => event.name === "review_graded")
    .map((event) => [event.reading, event.reading_language]);
  expect(graded).toEqual([
    ["cue", "zh"],
    ["cue", "ja"],
    [undefined, undefined],
  ]);
});

it("counts the example's readings and the ones that faded, never the example", async () => {
  const student = await learner(db, "analytics-example-readings", "Learner");
  const { analytics, capture, settled } = writer();
  const ctx = { ...student, analytics };
  const deck = await createDeck(ctx, { name: "Japanese", defaultLanguage: "ja" });
  const added = await addCards(ctx, [
    {
      deckId: deck.id,
      term: "毎朝",
      meaning: "every morning",
      pronunciation: "まいあさ",
      example: "毎朝[まいあさ]パンを食[た]べます。",
    },
    { deckId: deck.id, term: "水", meaning: "water", pronunciation: "みず", example: "水です。" },
  ]);
  const [morning, water] = added.map((a) => (a.status === "added" ? a.card.id : ""));
  const grade = (cardId: string, readingsFaded?: number) =>
    gradeCard(ctx, {
      cardId,
      direction: "recognition",
      rating: 3,
      reviewedAt: new Date(),
      ...(readingsFaded === undefined ? {} : { readingsFaded }),
    });
  await grade(morning as string, 9);
  await grade(water as string, 0);
  await settled();
  const graded = capture.mock.calls
    .map((call) => call[0])
    .filter((event) => event.name === "review_graded");
  expect(graded.map((e) => [e.example_readings, e.readings_faded])).toEqual([
    [2, 2],
    [undefined, undefined],
  ]);
  expect(JSON.stringify(graded)).not.toContain("パン");
});

it("counts a Chinese example's pinyin one character at a time, as zh", async () => {
  const student = await learner(db, "analytics-example-pinyin", "Learner");
  const { analytics, capture, settled } = writer();
  const ctx = { ...student, analytics };
  const deck = await createDeck(ctx, { name: "中文", defaultLanguage: "zh" });
  const [added] = await addCards(ctx, [
    {
      deckId: deck.id,
      term: "行长",
      meaning: "bank president",
      pronunciation: "hángzhǎng",
      example: "行长说不行[hángzhǎng shuō bù xíng]。",
    },
  ]);
  await gradeCard(ctx, {
    cardId: added?.status === "added" ? added.card.id : "",
    direction: "recognition",
    rating: 3,
    reviewedAt: new Date(),
    readingsFaded: 1,
  });
  await settled();
  const [graded] = capture.mock.calls
    .map((call) => call[0])
    .filter((event) => event.name === "review_graded");
  expect(graded).toMatchObject({
    reading: "cue",
    example_readings: 5,
    readings_faded: 1,
    reading_language: "zh",
  });
  expect(JSON.stringify(graded)).not.toContain("说");
});
