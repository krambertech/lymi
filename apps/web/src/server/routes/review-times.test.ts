// Recall and grade times are stored with a grade exactly as sent, and never move the schedule.
import { AddCardOutcomeOut, DeckOut, GradeOut, REVIEW_TIME_LIMIT_MS } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { beforeAll, describe, expect, it } from "vitest";
import { schema } from "../db";
import { json, type Session, type TestApp, testApp } from "../test-app";

let app: TestApp;
let timed: Session;
let twin: Session;
let untimed: Session;

beforeAll(async () => {
  app = await testApp();
  timed = await app.signUp("review-times");
  twin = await app.signUp("review-twin");
  untimed = await app.signUp("review-untimed");
}, 60_000);

async function card(as: Session, term: string) {
  const deck = await app.fetch("/api/decks", {
    ...json({ name: `Times ${term}`, defaultLanguage: "et" }),
    as,
  });
  const deckId = DeckOut.parse(await deck.json()).id;
  const added = await app.fetch("/api/cards", {
    ...json({ deckId, term, meaning: "snow", enrich: false }),
    as,
  });
  const outcome = AddCardOutcomeOut.parse(await added.json());
  if (outcome.status !== "added") throw new Error("not added");
  return outcome.card;
}

const grade = (
  as: Session,
  cardId: string,
  rating: number,
  reviewedAt: string,
  extra: Record<string, unknown> = {},
) =>
  app.fetch("/api/review/grade", {
    ...json({
      cardId,
      mode: { cue: "term", target: "meaning" },
      rating,
      reviewedAt,
      timezone: "UTC",
      ...extra,
    }),
    as,
  });

const stored = (cardId: string) =>
  app.db
    .select({ recallMs: schema.reviews.recallMs, gradeMs: schema.reviews.gradeMs })
    .from(schema.reviews)
    .where(eq(schema.reviews.cardId, cardId))
    .orderBy(schema.reviews.reviewedAt);

describe("recall and grade times", () => {
  it("stores both when sent, and nulls when left out", async () => {
    const { id } = await card(timed, "lumi");
    const times = { recallMs: 4210, gradeMs: 870 };
    expect((await grade(timed, id, 3, "2026-09-13T09:00:00Z", times)).status).toBe(200);
    expect((await grade(timed, id, 3, "2026-09-14T09:00:00Z")).status).toBe(200);
    expect(await stored(id)).toEqual([times, { recallMs: null, gradeMs: null }]);
  });

  it("refuses a negative, fractional or over-limit time", async () => {
    const { id } = await card(timed, "jää");
    for (const bad of [
      { recallMs: -1 },
      { gradeMs: 1.5 },
      { recallMs: REVIEW_TIME_LIMIT_MS + 1 },
      { gradeMs: "900" },
    ]) {
      expect((await grade(timed, id, 3, "2026-09-13T09:00:00Z", bad)).status).toBe(400);
    }
    expect(await stored(id)).toEqual([]);
  });

  it("schedules the same log the same way with and without times", async () => {
    const log = [
      [1, "2026-09-13T09:00:00Z"],
      [3, "2026-09-13T09:10:00Z"],
      [4, "2026-09-15T09:00:00Z"],
    ] as const;
    const a = await card(twin, "tuli");
    const b = await card(untimed, "tuli");
    for (const [rating, at] of log) {
      const withTimes = GradeOut.parse(
        await (await grade(twin, a.id, rating, at, { recallMs: 9000, gradeMs: 1200 })).json(),
      );
      const without = GradeOut.parse(await (await grade(untimed, b.id, rating, at)).json());
      expect({
        due: withTimes.due,
        state: withTimes.state,
        attempts: withTimes.day.attempts,
      }).toEqual({
        due: without.due,
        state: without.state,
        attempts: without.day.attempts,
      });
    }
  });
});
