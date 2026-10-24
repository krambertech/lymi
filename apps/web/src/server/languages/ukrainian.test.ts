import { readFileSync } from "node:fs";
import { type EnrichedField, normalizeCardText, type ReviewModeKey, readingKey } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { decksBrief } from "../lessons/prompt";
import { hookable, hookInput } from "../services/hook-draft";
import { ukrainian } from "./ukrainian";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/uk.json", import.meta.url), "utf8"),
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

describe("the uk lesson slot", () => {
  it("tells the model how a lesson prints stress", () => {
    const brief = decksBrief(
      [{ id: "d", name: "Українська A1", description: null, language: "uk", examples: [] }],
      { fixed: true, hint: undefined, meaningLanguage: "en", limit: 0 },
    );
    expect(brief).toContain(`  Readings: ${ukrainian.lesson}.`);
  });

  it("stores each printed stress as U+0301 on a Cyrillic vowel, fitting its term", () => {
    expect(fixtures.lesson.length).toBeGreaterThanOrEqual(20);
    for (const { term, printed, reading } of fixtures.lesson) {
      const stored = normalizeCardText("uk", { pronunciation: printed }).fields.pronunciation;
      expect(stored, printed).toBe(reading);
      expect(readingKey({ term, language: "uk", pronunciation: stored }), printed).not.toBeNull();
    }
  });

  it("keeps a homograph's two stresses apart", () => {
    const key = (term: string, printed: string) =>
      readingKey({
        term,
        language: "uk",
        pronunciation: normalizeCardText("uk", { pronunciation: printed }).fields.pronunciation,
      });
    expect(key("замок", "за́мок")).not.toBe(key("замок", "замо́к"));
    expect(key("руки", "ру́ки")).not.toBe(key("руки", "руки́"));
    expect(key("замок", "замóк")).toBe(key("замок", "замо́к"));
    expect(key("м'ясо", "м’я́со")).toBe(key("м'ясо", "м'я́со"));
  });
});

describe("the uk hook slot", () => {
  it("sends its advice with every Ukrainian card the keyword method fits", () => {
    expect(fixtures.hook.length).toBeGreaterThanOrEqual(20);
    for (const card of fixtures.hook) {
      const hookCard = { ...card, language: card.language ?? "uk" };
      const meaningLanguage = /\p{Script=Cyrillic}/u.test(card.meaning) ? "ru" : "en";
      expect(hookable(hookCard, meaningLanguage), card.term).toBe(true);
      expect(JSON.parse(hookInput(hookCard)).guide, card.term).toBe(ukrainian.hook);
    }
  });
});

describe("the uk checks", () => {
  it("score each invented reply as a careful reader would", () => {
    expect(fixtures.checks.length).toBeGreaterThanOrEqual(20);
    for (const { rule, field, term = "", text, example, pass } of fixtures.checks) {
      const check = ukrainian.checks.find((one) => one.rule === rule && one.field === field);
      expect(check, `${field}: ${rule}`).toBeDefined();
      expect(check?.pass(text, { term, example }), `${rule}: ${text}`).toBe(pass);
    }
  });
});
