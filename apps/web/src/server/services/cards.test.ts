import { describe, expect, it } from "vitest";
import { foldForSearch, matchesSearch } from "./cards";

const card = (fields: Partial<Parameters<typeof matchesSearch>[0]>) => ({
  normalizedTerm: "",
  meaning: null,
  example: null,
  notes: null,
  ...fields,
});

describe("matchesSearch", () => {
  it("folds case beyond ASCII, so Cyrillic and accented text match; ß is not expanded", () => {
    expect(matchesSearch(card({ meaning: "Привіт, світе" }), foldForSearch("привіт"))).toBe(true);
    expect(matchesSearch(card({ example: "À l'École" }), foldForSearch("école"))).toBe(true);
    expect(matchesSearch(card({ notes: "straße" }), foldForSearch("STRASSE"))).toBe(false);
  });

  it("treats LIKE wildcards as plain characters", () => {
    expect(matchesSearch(card({ meaning: "100% sure" }), foldForSearch("100%"))).toBe(true);
    expect(matchesSearch(card({ meaning: "100 sure" }), foldForSearch("100%"))).toBe(false);
    expect(matchesSearch(card({ meaning: "a_b" }), foldForSearch("a_b"))).toBe(true);
    expect(matchesSearch(card({ meaning: "axb" }), foldForSearch("a_b"))).toBe(false);
  });

  it("matches the term through its duplicate key", () => {
    expect(matchesSearch(card({ normalizedTerm: "sbrigarsi" }), foldForSearch("Sbrig"))).toBe(true);
    expect(matchesSearch(card({ normalizedTerm: "sbrigarsi" }), foldForSearch("magari"))).toBe(
      false,
    );
  });
});
