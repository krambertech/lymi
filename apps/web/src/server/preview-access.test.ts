import { describe, expect, it } from "vitest";
import { equalPreviewKeys } from "./preview-access";

describe("app preview access", () => {
  it("accepts only the complete capability", () => {
    const expected = "a-preview-capability-that-is-long-enough";
    expect(equalPreviewKeys(expected, expected)).toBe(true);
    expect(equalPreviewKeys(`${expected}x`, expected)).toBe(false);
    expect(equalPreviewKeys(expected.slice(0, -1), expected)).toBe(false);
    expect(equalPreviewKeys(undefined, expected)).toBe(false);
  });
});
