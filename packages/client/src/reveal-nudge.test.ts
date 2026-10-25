import { describe, expect, it } from "vitest";
import { NUDGED_REVIEW_DAYS, revealNudgeDelayMs } from "./reveal-nudge";

describe("revealNudgeDelayMs", () => {
  it("nudges a newer account's first cards after a second", () => {
    expect(revealNudgeDelayMs(0, true)).toBe(1_000);
    expect(revealNudgeDelayMs(NUDGED_REVIEW_DAYS - 1, true)).toBe(1_000);
  });

  it("nudges a newer account's later cards only after a minute idle", () => {
    expect(revealNudgeDelayMs(0, false)).toBe(60_000);
  });

  it("never nudges an account that has reviewed on enough days", () => {
    expect(revealNudgeDelayMs(NUDGED_REVIEW_DAYS, true)).toBeNull();
    expect(revealNudgeDelayMs(NUDGED_REVIEW_DAYS, false)).toBeNull();
    expect(revealNudgeDelayMs(120, false)).toBeNull();
  });

  it("shows nothing while the account's history is unknown", () => {
    expect(revealNudgeDelayMs(undefined, true)).toBeNull();
  });
});
