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
  recordFirstReview(ctx, deck.id, "later-review");
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
  recordFirstReview({ ...student, analytics }, deck.id, "later-review");
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
  recordFirstReview(ctx, "deck", "review");
  await expect(settled()).resolves.toEqual([undefined]);
});
