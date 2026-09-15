import { describe, expect, it } from "vitest";
import { QUOTE_MAX, shortQuote } from "./short-quote";

describe("shortQuote", () => {
  it("keeps a short term whole", () => {
    expect(shortQuote("sbrigarsi")).toBe("sbrigarsi");
  });

  it("cuts a long term at a word and stays within the limit", () => {
    const quoted = shortQuote("Die Wendung beschreibt jemanden, der zu spät handelt. ".repeat(10));
    expect(quoted).toBe("Die Wendung beschreibt jemanden, der zu spät handelt. Die…");
    expect(Array.from(quoted).length).toBeLessThanOrEqual(QUOTE_MAX);
  });

  it("cuts an unbroken compound mid-word", () => {
    expect(shortQuote("Rechtsschutzversicherungsgesellschaften", 20)).toBe("Rechtsschutzversich…");
  });

  it("puts line breaks on one line and never splits an emoji", () => {
    expect(shortQuote("to hurry\nup")).toBe("to hurry up");
    expect(Array.from(shortQuote("🙂".repeat(80))).length).toBe(QUOTE_MAX);
  });
});
