import { describe, expect, it } from "vitest";
import { dueToday } from "./due";

const decks = [{ due: 4 }, { due: 3 }];

describe("dueToday", () => {
  it("sums the decks while they are current", () => {
    expect(dueToday(decks, 2, false)).toBe(7);
  });

  it("counts the draw on the device while the decks are kept, so offline grades come off", () => {
    expect(dueToday(decks, 2, true)).toBe(2);
    expect(dueToday(decks, 0, true)).toBe(0);
  });

  it("falls back to the decks while the draw has not loaded", () => {
    expect(dueToday(decks, undefined, true)).toBe(7);
    expect(dueToday([], undefined, false)).toBe(0);
  });
});
