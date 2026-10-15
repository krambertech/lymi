import { describe, expect, it } from "vitest";
import { shownOutcome } from "./review-day";

describe("shownOutcome", () => {
  it("reads a day confirmed as nothing due as open once cards are due", () => {
    expect(shownOutcome("nothing_due", 4)).toBe("open");
  });

  it("keeps nothing due while nothing is due, and every other outcome as it is", () => {
    expect(shownOutcome("nothing_due", 0)).toBe("nothing_due");
    expect(shownOutcome("goal_met", 4)).toBe("goal_met");
    expect(shownOutcome("exhausted", 0)).toBe("exhausted");
  });
});
