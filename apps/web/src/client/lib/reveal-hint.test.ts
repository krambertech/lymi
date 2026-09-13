import { describe, expect, it } from "vitest";
import { hintDelayMs, LEARNED_AFTER } from "./reveal-hint";

describe("hintDelayMs", () => {
  it("hints a new learner after a second", () => {
    expect(hintDelayMs(0)).toBe(1_000);
    expect(hintDelayMs(LEARNED_AFTER - 1)).toBe(1_000);
  });

  it("waits a minute once the learner has revealed enough cards", () => {
    expect(hintDelayMs(LEARNED_AFTER)).toBe(60_000);
  });
});
