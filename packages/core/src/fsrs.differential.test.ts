import { assert, describe, expect, it } from "vitest";
import histories from "./scheduler-snapshot/histories.json";
import schedules from "./scheduler-snapshot/schedules.json";
import {
  differences,
  formatShift,
  type History,
  type Schedule,
  scheduleOf,
  schedulesOf,
  summarize,
} from "./scheduler-snapshot/snapshot";

describe("the scheduler on its recorded histories", () => {
  it("gives every card the schedule approved in schedules.json", () => {
    const actual = schedulesOf(histories as unknown as Record<string, History>);
    const summary = summarize(differences(schedules as Record<string, Schedule>, actual));
    if (summary) assert.fail(`\n${summary}`);
  });

  it("counts Easy on a card already graded that day as Good, as the server does", () => {
    const history = (second: 3 | 4): History => ({
      start: "2026-01-05T08:00:00Z",
      grades: [
        ["2026-01-05T08:01:00Z", 1],
        ["2026-01-05T08:12:00Z", second],
      ],
      previewAt: "2026-01-06T08:00:00Z",
    });
    expect(scheduleOf(history(4))).toEqual(scheduleOf(history(3)));
  });
});

describe("the summary of what moved", () => {
  const card: Schedule = {
    state: "Review",
    due: "2026-03-01T08:00:00Z",
    stability: 10,
    difficulty: 5,
    forgot: "2026-03-01T08:10:00Z",
    hard: "2026-03-08T08:00:00Z",
    good: "2026-03-11T08:00:00Z",
    easy: "2026-03-20T08:00:00Z",
  };

  it("is empty when nothing moved, including a last-digit rounding flip", () => {
    const flipped = { ...card, stability: 10.0001, difficulty: 4.9999 };
    expect(summarize(differences({ a: card }, { a: flipped }))).toBe("");
  });

  it("counts moved cards and names the largest shift per grade", () => {
    const expected = { "steady-001": card, "steady-002": card, "gaps-001": card };
    const actual = {
      "steady-001": { ...card, good: "2026-03-14T08:00:00Z" },
      "steady-002": card,
      "gaps-001": {
        ...card,
        good: "2026-03-10T08:00:00Z",
        stability: 12,
        state: "Relearning" as const,
      },
    };
    const summary = summarize(differences(expected, actual));
    expect(summary).toContain("The scheduler moved 2 of 3 cards (steady 1, gaps 1).");
    expect(summary).toMatch(/Good\s+2\s+1\s+1\s+2 d\s+\+3 d steady-001/);
    expect(summary).toMatch(/Forgot\s+0\s+0\s+0$/m);
    expect(summary).toContain("largest x1.200 gaps-001");
    expect(summary).toContain("state Review -> Relearning: 1 (gaps-001)");
  });

  it("shows a card leaving New as its stability from zero", () => {
    const fresh = { ...card, state: "New" as const, stability: 0 };
    const summary = summarize(differences({ "new-001": fresh }, { "new-001": card }));
    expect(summary).toContain("largest 0 -> 10 new-001");
  });

  it("names histories added or dropped since the snapshot", () => {
    const summary = summarize(differences({ old: card }, { new: card }));
    expect(summary).toContain("Not in the snapshot yet: new");
    expect(summary).toContain("In the snapshot but no longer a history: old");
  });

  it("reads shifts in minutes, hours or days", () => {
    expect(formatShift(10 * 60_000)).toBe("+10 min");
    expect(formatShift(-5 * 3_600_000)).toBe("-5 h");
    expect(formatShift(36 * 3_600_000)).toBe("+1.5 d");
  });
});
