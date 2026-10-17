import { describe, expect, it } from "vitest";
import {
  commandCount,
  commandTitle,
  type DevCommandSummary,
  matchesQuery,
  parsePaletteQuery,
} from "./dev-palette";

const due: DevCommandSummary = {
  id: "due",
  group: "Simulate",
  title: "Make {count} cards due",
  count: { default: 5, max: 100 },
  keywords: "review",
  confirm: false,
  blocked: null,
};

describe("dev palette", () => {
  it("reads a trailing number as the count", () => {
    expect(parsePaletteQuery("Due 12")).toEqual({ text: "due", count: 12 });
    expect(parsePaletteQuery("  12 ")).toEqual({ text: "", count: 12 });
    expect(parsePaletteQuery("mika")).toEqual({ text: "mika", count: null });
    expect(parsePaletteQuery("due 0")).toEqual({ text: "due", count: 0 });
    expect(parsePaletteQuery("a1")).toEqual({ text: "a1", count: null });
  });

  it("runs with the query's count within the maximum, or the default", () => {
    expect(commandCount(due, parsePaletteQuery("due 12"))).toBe(12);
    expect(commandCount(due, parsePaletteQuery("due 5000"))).toBe(100);
    expect(commandCount(due, parsePaletteQuery("due"))).toBe(5);
    expect(commandCount(due, parsePaletteQuery("due 0"))).toBe(1);
    expect(commandTitle(due, 12)).toBe("Make 12 cards due");
    expect(commandTitle(due, null)).toBe("Make 5 cards due");
  });

  it("matches when every word appears", () => {
    expect(matchesQuery("Make 5 cards due review", "due cards")).toBe(true);
    expect(matchesQuery("Make 5 cards due review", "due mika")).toBe(false);
    expect(matchesQuery("Become Mika japanese", "")).toBe(true);
  });
});
