import { readFileSync } from "node:fs";
import { type EnrichedField, normalizeCardText, type ReviewModeKey, readingKey } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { decksBrief } from "../lessons/prompt";
import { hookable, hookInput } from "../services/hook-draft";
import { chinese } from "./chinese";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/zh.json", import.meta.url), "utf8"),
) as {
  lesson: { term: string; printed: string; reading: string }[];
  hook: {
    term: string;
    pronunciation: string;
    meaning: string;
    language?: string;
    asked: ReviewModeKey[];
  }[];
  checks: { rule: string; field: EnrichedField; text: string; example?: string; pass: boolean }[];
};

describe("the zh lesson slot", () => {
  it("tells the model every way a lesson prints pinyin", () => {
    const brief = decksBrief(
      [{ id: "d", name: "HSK 1", description: null, language: "zh", examples: [] }],
      { fixed: true, hint: undefined, meaningLanguage: "en", limit: 0 },
    );
    expect(brief).toContain(`  Readings: ${chinese.lesson}.`);
  });

  it("stores each printed reading in tone marks, fitting its term", () => {
    expect(fixtures.lesson.length).toBeGreaterThanOrEqual(20);
    for (const { term, printed, reading } of fixtures.lesson) {
      const stored = normalizeCardText("zh", { pronunciation: printed }).fields.pronunciation;
      expect(stored, printed).toBe(reading);
      expect(readingKey({ term, language: "zh", pronunciation: stored }), printed).not.toBeNull();
    }
  });

  it("keeps a polyphone's two readings apart", () => {
    const key = (term: string, printed: string) =>
      readingKey({
        term,
        language: "zh",
        pronunciation: normalizeCardText("zh", { pronunciation: printed }).fields.pronunciation,
      });
    expect(key("行", "hang2")).not.toBe(key("行", "xing2"));
    expect(key("东西", "dong1xi5")).not.toBe(key("东西", "dong1 xi1"));
    expect(key("一起", "yi1 qi3")).toBe(key("一起", "yì qǐ"));
  });
});

describe("the zh hook slot", () => {
  it("sends its advice with every Chinese card the keyword method fits", () => {
    expect(fixtures.hook.length).toBeGreaterThanOrEqual(20);
    for (const card of fixtures.hook) {
      const hookCard = { ...card, language: card.language ?? "zh" };
      const meaningLanguage = /[а-я]/i.test(card.meaning) ? "ru" : "en";
      expect(hookable(hookCard, meaningLanguage), card.term).toBe(true);
      expect(JSON.parse(hookInput(hookCard)).guide, card.term).toBe(chinese.hook);
    }
  });
});

describe("the zh checks", () => {
  it("score each invented reply as a careful reader would", () => {
    expect(fixtures.checks.length).toBeGreaterThanOrEqual(20);
    for (const { rule, field, text, example, pass } of fixtures.checks) {
      const check = chinese.checks.find((one) => one.rule === rule && one.field === field);
      expect(check, `${field}: ${rule}`).toBeDefined();
      expect(check?.pass(text, { term: "", example }), `${rule}: ${text}`).toBe(pass);
    }
  });
});
