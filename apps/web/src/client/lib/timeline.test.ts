import { describe, expect, it } from "vitest";
import { layoutTimeline, spread, TIMELINE } from "./timeline";

const day = 86_400_000;
const now = new Date(2026, 8, 13, 18, 30);
const daysAgo = (n: number) => new Date(now.getTime() - n * day);

describe("spread", () => {
  it("leaves marks that are already apart where they are", () => {
    expect(spread([10, 50, 90], 18, 0, 100)).toEqual([10, 50, 90]);
  });

  it("centres a crowd on the mean of its real positions", () => {
    expect(spread([49, 50, 51], 18, 0, 100)).toEqual([32, 50, 68]);
  });

  it("merges groups that touch once spread, keeping order and the gap", () => {
    const xs = spread([20, 22, 40, 42], 18, 0, 200);
    for (let i = 1; i < xs.length; i++) expect((xs[i] ?? 0) - (xs[i - 1] ?? 0)).toBeCloseTo(18);
    expect(xs.reduce((a, b) => a + b, 0) / xs.length).toBeCloseTo(31);
  });

  it("stays inside its bounds", () => {
    const xs = spread([98, 99, 100], 18, 0, 100);
    expect(Math.max(...xs)).toBe(100);
    expect(xs[0]).toBe(64);
  });
});

describe("layoutTimeline", () => {
  it("never overlaps reviews a day apart", () => {
    const layout = layoutTimeline({
      start: daysAgo(90),
      now,
      reviews: [daysAgo(2), daysAgo(1), daysAgo(0.4)],
      dues: [new Date(now.getTime() + day)],
      width: 320,
    });
    const xs = layout.marks.map((m) => m.x);
    for (let i = 1; i < xs.length; i++)
      expect((xs[i] ?? 0) - (xs[i - 1] ?? 0)).toBeGreaterThanOrEqual(TIMELINE.gap - 0.001);
    expect(Math.max(...xs)).toBeLessThan(layout.today);
    expect(layout.rings[0]).toBeGreaterThan(layout.today);
  });

  it("folds the oldest reviews into a count when the line is too short", () => {
    const reviews = Array.from({ length: 60 }, (_, i) => daysAgo(120 - i * 2));
    const layout = layoutTimeline({ start: daysAgo(120), now, reviews, dues: [], width: 240 });
    expect(layout.hidden).toBeGreaterThan(0);
    expect(layout.marks).toHaveLength(60 - layout.hidden);
    expect(layout.marks.at(-1)?.index).toBe(59);
    expect(layout.marks[0]?.x).toBeGreaterThanOrEqual(TIMELINE.mark / 2 + TIMELINE.more);
  });

  it("ends on the furthest due date and says so", () => {
    const due = new Date(now.getTime() + 24 * day);
    const layout = layoutTimeline({
      start: daysAgo(80),
      now,
      reviews: [],
      dues: [due],
      width: 300,
    });
    expect(layout.end).toEqual(due);
    expect(layout.endIsDue).toBe(true);
    expect(layout.at(due)).toBe(300);
  });
});
