import { readFileSync } from "node:fs";
import { type EnrichedField, normalizeCardText, type ReviewModeKey, readingKey } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { decksBrief } from "../lessons/prompt";
import { hookable, hookInput } from "../services/hook-draft";
import { cantonese } from "./cantonese";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/yue.json", import.meta.url), "utf8"),
) as {
  lesson: { term: string; printed: string; reading: string }[];
  hook: {
    term: string;
    pronunciation: string;
    meaning: string;
    language?: string;
    asked: ReviewModeKey[];
  }[];
  checks: {
    rule: string;
    field: EnrichedField;
    term?: string;
    text: string;
    example?: string;
    pass: boolean;
  }[];
};

describe("the yue lesson slot", () => {
  it("tells the model every way a lesson prints Jyutping", () => {
    const brief = decksBrief(
      [{ id: "d", name: "廣東話", description: null, language: "yue", examples: [] }],
      { fixed: true, hint: undefined, meaningLanguage: "en", limit: 0 },
    );
    expect(brief).toContain(`  Readings: ${cantonese.lesson}.`);
  });

  it("stores each printed reading with plain tone numbers, fitting its term", () => {
    expect(fixtures.lesson.length).toBeGreaterThanOrEqual(20);
    for (const { term, printed, reading } of fixtures.lesson) {
      const stored = normalizeCardText("yue", { pronunciation: printed }).fields.pronunciation;
      expect(stored, printed).toBe(reading);
      expect(readingKey({ term, language: "yue", pronunciation: stored }), printed).not.toBeNull();
    }
  });

  it("keeps a polyphone's two readings apart", () => {
    const key = (term: string, printed: string) =>
      readingKey({
        term,
        language: "yue",
        pronunciation: normalizeCardText("yue", { pronunciation: printed }).fields.pronunciation,
      });
    expect(key("行", "hong4")).not.toBe(key("行", "hang4"));
    expect(key("長", "coeng4")).not.toBe(key("長", "zoeng2"));
    expect(key("你好", "nei⁵ hou²")).toBe(key("你好", "nei5 hou2"));
  });
});

describe("the yue hook slot", () => {
  it("sends its advice with every Cantonese card the keyword method fits", () => {
    expect(fixtures.hook.length).toBeGreaterThanOrEqual(20);
    for (const card of fixtures.hook) {
      const hookCard = { ...card, language: card.language ?? "yue" };
      const meaningLanguage = /[а-я]/i.test(card.meaning) ? "ru" : "en";
      expect(hookable(hookCard, meaningLanguage), card.term).toBe(true);
      expect(JSON.parse(hookInput(hookCard)).guide, card.term).toBe(cantonese.hook);
    }
  });
});

describe("the yue checks", () => {
  it("score each invented reply as a careful reader would", () => {
    expect(fixtures.checks.length).toBeGreaterThanOrEqual(20);
    for (const { rule, field, term = "", text, example, pass } of fixtures.checks) {
      const check = cantonese.checks.find((one) => one.rule === rule && one.field === field);
      expect(check, `${field}: ${rule}`).toBeDefined();
      expect(check?.pass(text, { term, example }), `${rule}: ${text}`).toBe(pass);
    }
  });
});
