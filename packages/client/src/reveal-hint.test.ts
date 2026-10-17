import { describe, expect, it } from "vitest";
import { HINTED_REVIEW_DAYS, revealHintDelayMs } from "./reveal-hint";

describe("revealHintDelayMs", () => {
  it("hints a newer account's first cards after a second", () => {
    expect(revealHintDelayMs(0, true)).toBe(1_000);
    expect(revealHintDelayMs(HINTED_REVIEW_DAYS - 1, true)).toBe(1_000);
  });

  it("hints a newer account's later cards only after a minute idle", () => {
    expect(revealHintDelayMs(0, false)).toBe(60_000);
  });

  it("never hints an account that has reviewed on enough days", () => {
    expect(revealHintDelayMs(HINTED_REVIEW_DAYS, true)).toBeNull();
    expect(revealHintDelayMs(HINTED_REVIEW_DAYS, false)).toBeNull();
    expect(revealHintDelayMs(120, false)).toBeNull();
  });

  it("shows nothing while the account's history is unknown", () => {
    expect(revealHintDelayMs(undefined, true)).toBeNull();
  });
});
