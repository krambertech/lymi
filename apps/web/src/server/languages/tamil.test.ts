import { readFileSync } from "node:fs";
import { type EnrichedField, hintable, normalizeCardText, type ReviewModeKey } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { decksBrief } from "../lessons/prompt";
import { hintInput } from "../services/hint-draft";
import { tamil } from "./tamil";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/ta.json", import.meta.url), "utf8"),
) as {
  lesson: { term: string; printed: string; stored: string | null }[];
  hint: { term: string; pronunciation: string; meaning: string; asked: ReviewModeKey[] }[];
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

describe("the ta hint slot", () => {
  it("sends its advice with every Tamil card the keyword method fits", () => {
    expect(fixtures.hint.length).toBeGreaterThanOrEqual(20);
    for (const card of fixtures.hint) {
      const hintCard = { ...card, language: "ta" };
      expect(hintable(hintCard, "en"), card.term).toBe(true);
      expect(JSON.parse(hintInput(hintCard)).guide, card.term).toBe(tamil.hint);
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
