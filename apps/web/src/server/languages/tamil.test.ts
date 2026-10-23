import { readFileSync } from "node:fs";
import { type EnrichedField, hookable, normalizeCardText, type ReviewModeKey } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { decksBrief } from "../lessons/prompt";
import { hookInput } from "../services/hook-draft";
import { tamil } from "./tamil";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/ta.json", import.meta.url), "utf8"),
) as {
  lesson: { term: string; printed: string; stored: string | null }[];
  hook: { term: string; pronunciation: string; meaning: string; asked: ReviewModeKey[] }[];
  checks: { rule: string; field: EnrichedField; term?: string; text: string; pass: boolean }[];
};

describe("the ta lesson slot", () => {
  it("tells the model how a lesson prints a reading", () => {
    const brief = decksBrief(
      [{ id: "d", name: "Tamil A1", description: null, language: "ta", examples: [] }],
      { fixed: true, hint: undefined, meaningLanguage: "en", limit: 0 },
    );
    expect(brief).toContain(`  Readings: ${tamil.lesson}.`);
  });

  it("keeps a printed reading only for a word not said as spelled", () => {
    expect(fixtures.lesson.length).toBeGreaterThanOrEqual(20);
    for (const { term, printed, stored } of fixtures.lesson) {
      const { fields } = normalizeCardText("ta", { term, pronunciation: printed });
      expect(fields.pronunciation, `${term} ${printed}`).toBe(stored);
    }
  });
});

describe("the ta hook slot", () => {
  it("sends its advice with every Tamil card the keyword method fits", () => {
    expect(fixtures.hook.length).toBeGreaterThanOrEqual(20);
    for (const card of fixtures.hook) {
      const hookCard = { ...card, language: "ta" };
      expect(hookable(hookCard, "en"), card.term).toBe(true);
      expect(JSON.parse(hookInput(hookCard)).guide, card.term).toBe(tamil.hook);
    }
  });
});

describe("the ta checks", () => {
  it("score each invented reply as a careful reader would", () => {
    expect(fixtures.checks.length).toBeGreaterThanOrEqual(20);
    for (const { rule, field, term = "", text, pass } of fixtures.checks) {
      const check = tamil.checks.find((one) => one.rule === rule && one.field === field);
      expect(check, `${field}: ${rule}`).toBeDefined();
      expect(check?.pass(text, { term }), `${rule}: ${text}`).toBe(pass);
    }
  });
});
