import { describe, expect, it } from "vitest";
import type { StreakDay } from "./review-days";
import { type DayLight, lastThirty, longestRun, withImported } from "./stats";

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

describe("withImported", () => {
  const helsinki = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Helsinki",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const streakDay = (
    date: string,
    attempts: number,
    extra: Partial<StreakDay> = {},
  ): StreakDay => ({
    date,
    attempts,
    goal: 50,
    satisfied: attempts >= 50,
    outcome: attempts >= 50 ? "goal_met" : "open",
    ...extra,
  });

  it("lights a day the import filled and never lets it count toward a goal", () => {
    const days = withImported([], [{ at: Date.parse("2026-01-15T10:00:00Z"), n: 214 }], helsinki);

    expect(days).toEqual([
      { date: "2026-01-15", attempts: 214, goal: null, satisfied: false, outcome: null },
    ]);
  });

  it("adds imported attempts onto a day the learner also reviewed, keeping how it ended", () => {
    const days = withImported(
      [streakDay("2026-01-15", 60)],
      [{ at: Date.parse("2026-01-15T10:00:00Z"), n: 12 }],
      helsinki,
    );

    expect(days[0]).toEqual({
      date: "2026-01-15",
      attempts: 72,
      goal: 50,
      satisfied: true,
      outcome: "goal_met",
    });
  });

  it("files an imported bucket by the learner's local day, not the UTC one", () => {
    // 22:30 UTC is already the next day in Helsinki, which is +2 in January.
    const days = withImported([], [{ at: Date.parse("2026-01-15T22:30:00Z"), n: 3 }], helsinki);

    expect(days[0]?.date).toBe("2026-01-16");
  });

  it("keeps days in date order however the buckets arrive", () => {
    const days = withImported(
      [streakDay("2026-01-20", 50)],
      [
        { at: Date.parse("2026-01-18T10:00:00Z"), n: 4 },
        { at: Date.parse("2026-01-02T10:00:00Z"), n: 7 },
      ],
      helsinki,
    );

    expect(days.map((d) => d.date)).toEqual(["2026-01-02", "2026-01-18", "2026-01-20"]);
  });

  it("is empty when there is no history at all", () => {
    expect(withImported([], [], helsinki)).toEqual([]);
  });
});

describe("lastThirty", () => {
  it("is always thirty days ending today, however little history there is", () => {
    const strip = lastThirty([day("2026-09-16", true)], "2026-09-16");

    expect(strip).toHaveLength(30);
    expect(strip.at(-1)).toEqual({ date: "2026-09-16", lit: true });
    expect(strip.at(0)).toEqual({ date: "2026-08-18", lit: false });
    expect(strip.filter((d) => d.lit)).toHaveLength(1);
  });

  it("drops days that fell out of the window and keeps the ones inside it", () => {
    const strip = lastThirty([day("2026-07-01", true), day("2026-09-10", true)], "2026-09-16");

    expect(strip.filter((d) => d.lit).map((d) => d.date)).toEqual(["2026-09-10"]);
  });

  it("is thirty unlit days when nothing has been reviewed", () => {
    const strip = lastThirty([], "2026-09-16");

    expect(strip).toHaveLength(30);
    expect(strip.some((d) => d.lit)).toBe(false);
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

  it("files an imported bucket on the right side of a clock change", () => {
    // Europe changes its clocks on 29 March 2026: Helsinki is +2 before and +3 after, so the
    // same wall time either side of it belongs to a different UTC hour.
    expect(
      withImported([], [{ at: Date.parse("2026-03-28T22:30:00Z"), n: 1 }], helsinki)[0]?.date,
    ).toBe("2026-03-29");
    expect(
      withImported([], [{ at: Date.parse("2026-03-29T21:30:00Z"), n: 1 }], helsinki)[0]?.date,
    ).toBe("2026-03-30");
  });
});
