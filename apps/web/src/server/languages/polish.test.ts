import { readFileSync } from "node:fs";
import {
  type EnrichedField,
  normalizeCardText,
  type ReviewModeKey,
  readingKey,
  termKey,
} from "@lymi/core";
import { describe, expect, it } from "vitest";
import { decksBrief } from "../lessons/prompt";
import { hookable, hookInput } from "../services/hook-draft";
import { polish } from "./polish";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/pl.json", import.meta.url), "utf8"),
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

describe("the pl lesson slot", () => {
  it("tells the model how a lesson prints stress", () => {
    const brief = decksBrief(
      [{ id: "d", name: "Polski A1", description: null, language: "pl", examples: [] }],
      { fixed: true, hint: undefined, meaningLanguage: "en", limit: 0 },
    );
    expect(brief).toContain(`  Readings: ${polish.lesson}.`);
  });

  it("stores each printed stress as a grave over the stressed vowel, fitting its term", () => {
    expect(fixtures.lesson.length).toBeGreaterThanOrEqual(20);
    for (const { term, printed, reading } of fixtures.lesson) {
      const stored = normalizeCardText("pl", { pronunciation: printed }).fields.pronunciation;
      expect(stored, printed).toBe(reading);
      expect(readingKey({ term, language: "pl", pronunciation: stored }), printed).not.toBeNull();
    }
  });

  it("keeps ó and the other Polish letters in the term and its key", () => {
    expect(normalizeCardText("pl", { term: "żółw" }).fields.term).toBe("żółw");
    expect(termKey("pl", "Żółta róża")).toBe("żółta róża");
    expect(termKey("pl", "mùzyka")).toBe("muzyka");
  });
});

describe("the pl hook slot", () => {
  it("sends its advice with every Polish card the keyword method fits", () => {
    expect(fixtures.hook.length).toBeGreaterThanOrEqual(20);
    for (const card of fixtures.hook) {
      const hookCard = { ...card, language: card.language ?? "pl" };
      const meaningLanguage = /\p{Script=Cyrillic}/u.test(card.meaning) ? "ru" : "en";
      expect(hookable(hookCard, meaningLanguage), card.term).toBe(true);
      expect(JSON.parse(hookInput(hookCard)).guide, card.term).toBe(polish.hook);
    }
  });
});

describe("the pl checks", () => {
  it("score each invented reply as a careful reader would", () => {
    expect(fixtures.checks.length).toBeGreaterThanOrEqual(20);
    for (const { rule, field, term = "", text, example, pass } of fixtures.checks) {
      const check = polish.checks.find((one) => one.rule === rule && one.field === field);
      expect(check, `${field}: ${rule}`).toBeDefined();
      expect(check?.pass(text, { term, example }), `${rule}: ${text}`).toBe(pass);
    }
  });
});
