import { describe, expect, it } from "vitest";
import { lightLevel, lightReference } from "./lights";

describe("lightLevel", () => {
  it("is full for a day that counted, whatever it held", () => {
    expect(lightLevel(0, 10, 50, true)).toBe(3);
  });

  it("reaches the middle step at half of the day's own goal", () => {
    expect(lightLevel(24, 10, 50)).toBe(1);
    expect(lightLevel(25, 10, 50)).toBe(2);
    expect(lightLevel(50, 10, 50)).toBe(3);
  });

  it("measures a day without a goal against the week's busiest day, floored at ten", () => {
    const reference = lightReference([2, 3, 0, 1, 0, 0, 1]);
    expect(reference).toBe(10);
    expect(lightLevel(3, reference)).toBe(1);
    expect(lightLevel(4, reference)).toBe(2);
    expect(lightLevel(7, reference)).toBe(3);
    expect(lightLevel(0, reference)).toBe(0);
  });
});
