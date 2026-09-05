import { describe, expect, it } from "vitest";
import {
  deserializeState,
  emptyState,
  formatInterval,
  preview,
  State,
  schedule,
  serializeState,
} from "./fsrs";

describe("fsrs", () => {
  const now = new Date("2026-09-05T20:00:00Z");

  it("starts a new card in the New state", () => {
    const s = emptyState(now);
    expect(s.state).toBe(State.New);
    expect(s.reps).toBe(0);
  });

  it("orders the four outcomes: Again < Hard < Good < Easy", () => {
    const p = preview(emptyState(now), now);
    expect(p[1].getTime()).toBeLessThan(p[2].getTime());
    expect(p[2].getTime()).toBeLessThan(p[3].getTime());
    expect(p[3].getTime()).toBeLessThan(p[4].getTime());
  });

  it("schedules Good further out on each successful review", () => {
    let s = emptyState(now);
    let t = now;
    const gaps: number[] = [];
    for (let i = 0; i < 4; i++) {
      const r = schedule(s, 3, t);
      gaps.push(r.card.due.getTime() - t.getTime());
      s = r.card;
      t = r.card.due;
    }
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i]).toBeGreaterThanOrEqual(gaps[i - 1] as number);
    }
  });

  it("round-trips through JSON", () => {
    const r = schedule(emptyState(now), 3, now);
    const back = deserializeState(serializeState(r.card));
    expect(back.due.getTime()).toBe(r.card.due.getTime());
    expect(back.stability).toBe(r.card.stability);
  });

  it("formats intervals the way the grade buttons show them", () => {
    expect(formatInterval(now, new Date(now.getTime() + 60_000))).toBe("1 min");
    expect(formatInterval(now, new Date(now.getTime() + 2 * 86_400_000))).toBe("2 d");
    expect(formatInterval(now, new Date(now.getTime() + 90 * 86_400_000))).toBe("3 mo");
  });
});
