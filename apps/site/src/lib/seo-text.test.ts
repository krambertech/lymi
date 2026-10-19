import { describe, expect, it } from "vitest";
import { firstThatFits, namesLanguage, quotable } from "./seo-text";

describe("firstThatFits", () => {
  it("takes the first candidate within the limit", () => {
    expect(firstThatFits(["a long candidate", "short"], 10)).toBe("short");
    expect(firstThatFits(["fits", "also"], 10)).toBe("fits");
  });

  it("cuts the last candidate at a word when none fits", () => {
    expect(firstThatFits(["one two three four five"], 12)).toBe("one two…");
  });

  it("counts characters, not UTF-16 units", () => {
    expect(firstThatFits(["日本語".repeat(3)], 9)).toBe("日本語日本語日本語");
  });
});

describe("quotable", () => {
  it("keeps the first alternative and drops asides in brackets", () => {
    expect(quotable("hello / hi")).toBe("hello");
    expect(quotable("Warning signs (Gefahrzeichen)", 40)).toBe("Warning signs");
    expect(quotable("Thank you.")).toBe("Thank you");
    expect(quotable("Where is ...")).toBe("Where is ...");
  });

  it("refuses text too long to quote", () => {
    expect(quotable("a".repeat(30))).toBeNull();
    expect(quotable(null)).toBeNull();
  });
});

describe("namesLanguage", () => {
  it("finds the language in a name whatever its ending", () => {
    expect(namesLanguage("Турецкая лексика A1", "Турецкий", "ru")).toBe(true);
    expect(namesLanguage("Фінська: найнеобхідніше", "Фінська", "uk")).toBe(true);
    expect(namesLanguage("Read Japanese Kana", "Japanese", "en")).toBe(true);
    expect(namesLanguage("Island hopping", "Greek", "en")).toBe(false);
  });
});
