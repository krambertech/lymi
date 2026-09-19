import { describe, expect, it } from "vitest";
import { LANDING_BLURB } from "../components/landing/LandingView";
import { pageI18n } from "./i18n";
import { llmsTxt } from "./llms";

describe("llmsTxt", () => {
  const text = llmsTxt();

  it("defines Lymi the way the homepage does, word for word", () => {
    expect(text).toContain(`> ${pageI18n("en")._(LANDING_BLURB)}`);
  });

  it("points at the pages an assistant should read, and at the source", () => {
    for (const url of [
      "https://lymi.app/",
      "https://lymi.app/explore",
      "https://lymi.app/docs",
      "https://lymi.app/privacy",
      "https://github.com/krambertech/lymi",
    ]) {
      expect(text).toContain(url);
    }
  });

  it("says Lymi is free and open source", () => {
    expect(text).toContain("open-source");
    expect(text).toContain("free");
  });

  it("carries no count that a deploy can make wrong", () => {
    expect(text).not.toMatch(/\b\d[\d,.]*\+?\s*(cards|decks|learners|users|words)\b/i);
  });
});
