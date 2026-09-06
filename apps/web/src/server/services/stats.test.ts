import { describe, expect, it } from "vitest";
import { byMonth, type DayLight, longestRun } from "./stats";

const day = (date: string, lit: boolean): DayLight => ({ date, lit });

describe("longestRun", () => {
  it("finds the longest unbroken stretch, not the most recent one", () => {
    const days = [
      day("2026-05-01", true),
      day("2026-05-02", true),
      day("2026-05-03", true),
      day("2026-05-04", false),
      day("2026-05-05", true),
    ];

    expect(longestRun(days)).toBe(3);
  });

  it("counts a run that reaches the end", () => {
    const days = [day("2026-05-01", false), day("2026-05-02", true), day("2026-05-03", true)];

    expect(longestRun(days)).toBe(2);
  });

  it("is zero when nothing is lit", () => {
    expect(longestRun([day("2026-05-01", false)])).toBe(0);
    expect(longestRun([])).toBe(0);
  });
});

describe("byMonth", () => {
  it("counts days elapsed, not days in the month, so an unfinished month is honest", () => {
    const days = [
      day("2026-05-30", true),
      day("2026-05-31", false),
      day("2026-06-01", true),
      day("2026-06-02", true),
    ];

    expect(byMonth(days)).toEqual([
      { month: "2026-05", lit: 1, days: 2 },
      { month: "2026-06", lit: 2, days: 2 },
    ]);
  });

  it("keeps months in order and does not merge a month that comes back", () => {
    expect(byMonth([day("2026-05-01", true), day("2026-06-01", true)]).map((m) => m.month)).toEqual(
      ["2026-05", "2026-06"],
    );
  });

  it("is empty when there is no history", () => {
    expect(byMonth([])).toEqual([]);
  });
});
