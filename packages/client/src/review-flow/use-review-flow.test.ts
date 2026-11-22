import { expect, test } from "vitest";
import { drawQuery, insightsQuery, roundsQuery } from "../queries";
import {
  DECKS,
  DRAW,
  GRADE,
  gradeShown,
  hookReview,
  INSIGHTS,
  ROUNDS,
  SECTIONS,
  STREAK,
  UNDO,
} from "../test/review-hook";
import { DAY, draw, end } from "./review-harness";

const ACCEPTED = { duplicate: false, reviewId: "r1", state: 2 };
const SECTION = { deck: "a", section: "s" };
const sections = (due: number) => ({ sections: [{ id: "s", due }], progress: null });

test("takes one grade per position, however fast the taps come", async () => {
  const review = hookReview();
  review.server.answers(GRADE, ACCEPTED);
  await review.open(draw(["a", "b"]));
  const [first, second] = await review.tap((flow) => [gradeShown(flow), gradeShown(flow)]);
  expect(first).not.toBeNull();
  expect(second).toBeNull();
  expect(review.flow.position).toBe(1);
  expect(review.server.count(GRADE)).toBe(1);
});

test("refreshes what a grade moves once it is answered", async () => {
  const review = hookReview();
  review.server.holds(GRADE);
  review.server.answers(INSIGHTS, {});
  await review.open(draw(["a", "b", "c", "d"]));
  await review.watch(roundsQuery);
  await review.watch(insightsQuery(30));
  const asked = () => [DECKS, ROUNDS, STREAK, INSIGHTS].map((e) => review.server.count(e));
  await review.grade();
  expect(asked()).toEqual([1, 1, 1, 1]);
  await review.answer(GRADE, ACCEPTED);
  expect(asked()).toEqual([2, 2, 2, 2]);
});

test("checks the end of a section with one fetch, ahead of the day's other reads", async () => {
  const review = hookReview();
  review.server.answers(GRADE, ACCEPTED);
  review.server.answers(SECTIONS, sections(1));
  await review.open(draw(["a"]), SECTION);
  await review.watch({ ...drawQuery({}), staleTime: Number.POSITIVE_INFINITY });
  const drawn = review.server.count(DRAW);
  const counted = review.server.count(DECKS);

  review.server.holds(DRAW);
  await review.grade();
  expect(review.server.count(DRAW)).toBe(drawn + 1);
  expect(review.server.last(DRAW)?.get("section")).toBe("s");
  expect(review.server.count(DECKS)).toBe(counted);
  expect(review.flow.end).toBeNull();

  await review.answer(DRAW, draw(["a"]));
  expect(review.flow.end).not.toBeNull();
  expect(review.server.count(DECKS)).toBe(counted + 1);
  expect(review.server.count(DRAW)).toBe(drawn + 1);
});

test("still refreshes the counts and ends when the end's draw fails", async () => {
  const review = hookReview();
  review.server.answers(GRADE, ACCEPTED);
  await review.open(draw(["a"]));
  const counted = review.server.count(DECKS);
  review.server.refuses(DRAW, 500);
  await review.grade();
  expect(review.flow.end).toBe("unchecked");
  expect(review.server.count(DECKS)).toBe(counted + 1);
});

test("keeps a section's end while the deck's new count lands before the section's", async () => {
  const review = hookReview();
  review.server.answers(GRADE, ACCEPTED);
  review.server.answers(DECKS, [{ id: "a", due: 2 }]);
  review.server.answers(SECTIONS, sections(1));
  await review.open(draw(["a"]), SECTION);

  review.server.holds(SECTIONS);
  review.server.answers(DECKS, [{ id: "a", due: 1 }]);
  await review.grade();
  expect(review.flow.decks?.[0]?.due).toBe(1);
  expect(review.heading).toBe("scope_done");
  await review.answer(SECTIONS, sections(1));
  expect(review.heading).toBe("day_done");
});

test("holds a section's end until its first counts have settled together", async () => {
  const review = hookReview();
  review.server.answers(GRADE, ACCEPTED);
  review.server.holds(SECTIONS);
  await review.open(draw(["a"]), SECTION);

  review.server.holds(DECKS);
  await review.grade();
  await review.answer(SECTIONS, sections(0));
  expect(review.flow.end).toBeNull();
  await review.answer(DECKS, []);
  expect(review.flow.end).not.toBeNull();
});

test("drops the answer to a grade taken back while its send was pending", async () => {
  const review = hookReview();
  review.server.holds(GRADE);
  await review.open(draw(["a", "b"]));
  const card = review.shown;
  const graded = await review.grade();
  expect(review.flow.position).toBe(1);
  await review.tap((flow) => flow.undo());
  expect(review.shown).toBe(card);
  await review.refuse(GRADE, 422);
  expect(await graded?.answered).toBeNull();
  expect(review.shown).toBe(card);
});

test("steps forward again when the server keeps a grade Undo took back", async () => {
  const review = hookReview();
  review.server.answers(GRADE, ACCEPTED);
  review.server.refuses(UNDO, 409);
  await review.open(draw(["a", "b"]));
  const card = review.shown;
  await review.grade();
  const taken = await review.tap((flow) => flow.undo());
  expect(await taken?.kept).toEqual({ kept: true, stepped: true });
  expect(review.flow.position).toBe(1);
  expect(review.shown).not.toBe(card);
});

test("takes a grade back once, however fast the taps come", async () => {
  const review = hookReview();
  review.server.answers(GRADE, ACCEPTED);
  review.server.answers(UNDO, {});
  await review.open(draw(["a", "b"]));
  await review.grade();
  const [first, second] = await review.tap((flow) => [flow.undo(), flow.undo()]);
  expect(await first?.kept).toEqual({ kept: false, stepped: false });
  expect(second).toBeNull();
  expect(review.flow.position).toBe(0);
  expect(await review.grade()).not.toBeNull();
});

test("fetches the next day's draw when the day ends during a review", async () => {
  const review = hookReview();
  await review.open(draw(["a"]));
  expect(review.shown).toBe("a");
  expect(review.flow.leg?.date).toBe("2026-09-13");
  const drawn = review.server.count(DRAW);
  const tomorrow = {
    date: "2026-09-14",
    zone: "UTC",
    start: end.toISOString(),
    end: new Date(end.getTime() + DAY).toISOString(),
  };
  review.server.answers(DRAW, { ...draw(["b"]), day: tomorrow });
  await review.advance(end.getTime() - Date.now() + 100);
  expect(review.server.count(DRAW)).toBeGreaterThan(drawn);
  expect(review.flow.leg?.date).toBe("2026-09-14");
  expect(review.shown).toBe("b");
});
