import { describe, expect, it } from "vitest";
import { termFromCopy } from "./term.js";

describe("the selected text as a term", () => {
  it("takes one short line, its spaces tidied", () => {
    expect(termFromCopy("  raamatukogu \n")).toBe("raamatukogu");
    expect(termFromCopy("la   stazione\tcentrale")).toBe("la stazione centrale");
  });

  it("leaves a paragraph, a long line or nothing for the learner to type", () => {
    expect(termFromCopy("first line\nsecond line")).toBeNull();
    expect(termFromCopy("x".repeat(121))).toBeNull();
    expect(termFromCopy("   ")).toBeNull();
  });
});
