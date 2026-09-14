import { describe, expect, it } from "vitest";
import { dayStudy } from "../simulation/day";
import { fingerprint } from "../simulation/fingerprint";
import { intervalGuide } from "../simulation/intervals";
import results from "../simulation/results.json";
import { CARRY_OVER_EVERY } from "./draw";
import { DESIRED_RETENTION } from "./fsrs";

/**
 * The public scheduling page states these as facts about the generated numbers. When a rule
 * change makes one false, the page's prose needs rewriting along with the rule.
 */

describe("the year-long results", () => {
  it("were generated from the rules as they are now", () => {
    expect(
      results.fingerprint,
      "The draw, the scheduler or a simulation changed. Run `pnpm --filter @lymi/core simulate`.",
    ).toBe(fingerprint());
  });

  it("show what the page says about review orders", () => {
    const row = (id: string) =>
      results.reviewOrder.find((r) => r.id === id) as (typeof results.reviewOrder)[number];
    const others = results.reviewOrder.filter((r) => r.id !== "lymi");
    expect(others.every((r) => row("lymi").late < r.late)).toBe(true);
    expect(results.reviewOrder.every((r) => row("highest").remembered >= r.remembered)).toBe(true);
    expect(results.reviewOrder.every((r) => row("lowest").late >= r.late)).toBe(true);
    expect(row("lymi").remembered).toBeGreaterThan(row("due").remembered);
  });

  it("show what the page says about new cards", () => {
    const row = (id: string) =>
      results.newCards.find((r) => r.id === id) as (typeof results.newCards)[number];
    // The oldest slot keeps a joined deck moving at almost no cost to a fresh lesson.
    expect(row("lymi").joinedStarted).toBeGreaterThan(row("halving").joinedStarted * 1.5);
    expect(row("lymi").medianWait).toBeLessThanOrEqual(row("halving").medianWait + 2);
    expect(row("lymi").medianWait).toBeLessThan(row("floor").medianWait);
    expect(row("oldest").medianWait).toBeGreaterThan(row("lymi").medianWait * 5);
  });
});

describe("the worked examples", () => {
  it("fall due when retrievability reaches the target", () => {
    const guide = intervalGuide();
    for (const card of guide.learnedCards.slice(1)) {
      expect(card.retrievability).toBeCloseTo(DESIRED_RETENTION, 2);
    }
  });

  it("play a day with returns, a stop that resumes on the same card, and carries the next day", () => {
    const day = dayStudy();
    expect(day.day.some((t) => t.kind === "return")).toBe(true);
    expect(day.resumed.same).toBe(true);
    expect(day.resumed.waiting).toBeGreaterThan(0);
    const carries = day.tomorrow.flatMap((t, i) => (t.kind === "carry" ? [i] : []));
    expect(carries.length).toBeGreaterThanOrEqual(day.resumed.waiting);
    expect(carries[0]).toBe(0);
    for (let i = 1; i < carries.length; i++) {
      expect((carries[i] as number) - (carries[i - 1] as number)).toBeGreaterThanOrEqual(
        CARRY_OVER_EVERY,
      );
    }
  });
});
