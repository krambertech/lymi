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

describe("date bucketing", () => {
  const helsinki = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  it("resolves each timestamp in its own offset, not today's", () => {
    // Helsinki is UTC+2 in January and UTC+3 in July. A single offset taken in summer
    // would push this winter review onto the following day.
    expect(helsinki.format(new Date("2026-01-15T21:30:00Z"))).toBe("2026-01-15");
    expect(helsinki.format(new Date("2026-07-15T21:30:00Z"))).toBe("2026-07-16");
  });

  it("counts the days a month spans without a timezone shifting them", () => {
    const days: DayLight[] = [];
    for (let d = 1; d <= 31; d++) {
      days.push(day(`2026-03-${String(d).padStart(2, "0")}`, d % 2 === 0));
    }

    // March is when Europe changes its clocks; the month still has 31 days.
    expect(byMonth(days)).toEqual([{ month: "2026-03", lit: 15, days: 31 }]);
  });
});
