import { describe, expect, it } from "vitest";
import { normaliseTerm } from "./terms";

describe("normaliseTerm", () => {
  it("trims, collapses whitespace and case-folds", () => {
    expect(normaliseTerm("  Sbrigarsi ")).toBe("sbrigarsi");
    expect(normaliseTerm("in  bocca\tal lupo")).toBe("in bocca al lupo");
  });
  it("keeps accents", () => {
    expect(normaliseTerm("pèsca")).not.toBe(normaliseTerm("pesca"));
  });
  it("treats composed and decomposed accents as one", () => {
    expect(normaliseTerm("café")).toBe(normaliseTerm("café"));
  });
  it("folds non-Latin case", () => {
    expect(normaliseTerm("Їжак")).toBe("їжак");
  });
});
