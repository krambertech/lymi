import { describe, expect, it } from "vitest";
import { bestStreak, daysReviewed, streakLength } from "./streak";

describe("streakLength", () => {
  it("counts back from today", () => {
    expect(streakLength([0, 1, 2, 3, 4])).toBe(4);
  });

  it("keeps the streak while today is still open", () => {
    expect(streakLength([1, 1, 1, 0])).toBe(3);
  });

  it("breaks on a finished day with no review", () => {
    expect(streakLength([1, 1, 0, 1])).toBe(1);
  });

  it("is zero when yesterday was missed and today is open", () => {
    expect(streakLength([1, 1, 0, 0])).toBe(0);
  });

  it("handles an empty window", () => {
    expect(streakLength([])).toBe(0);
  });
});

describe("bestStreak", () => {
  it("finds the longest run anywhere", () => {
    expect(bestStreak([1, 1, 1, 0, 1, 1])).toBe(3);
  });

  it("is zero with no reviews", () => {
    expect(bestStreak([0, 0])).toBe(0);
  });
});

describe("daysReviewed", () => {
  it("counts reviewed days in the last seven", () => {
    expect(daysReviewed([9, 9, 9, 0, 1, 0, 2, 3, 0])).toBe(4);
  });
});
