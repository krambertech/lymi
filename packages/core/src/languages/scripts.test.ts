import { describe, expect, it } from "vitest";
import { fitsLanguage } from "./scripts";

describe("fitsLanguage", () => {
  it("takes a term with a letter in the language's script", () => {
    expect(fitsLanguage("食べる", "ja")).toBe(true);
    expect(fitsLanguage("Tシャツ", "ja-JP")).toBe(true);
    expect(fitsLanguage("trattoria", "it")).toBe(true);
    expect(fitsLanguage("кіт", "uk")).toBe(true);
    expect(fitsLanguage("pas", "sr-Latn")).toBe(true);
  });

  it("refuses a term written only in another script", () => {
    expect(fitsLanguage("trattoria", "ja")).toBe(false);
    expect(fitsLanguage("猫", "it")).toBe(false);
    expect(fitsLanguage("cat", "ru")).toBe(false);
  });

  it("has no opinion on a language it does not know, no language, or no letters", () => {
    expect(fitsLanguage("猫", "xx")).toBe(true);
    expect(fitsLanguage("猫", null)).toBe(true);
    expect(fitsLanguage("2024", "ja")).toBe(true);
  });
});
