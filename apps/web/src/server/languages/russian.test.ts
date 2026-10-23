import { readFileSync } from "node:fs";
import { type EnrichedField, normalizeCardText, type ReviewModeKey, readingKey } from "@lymi/core";
import { describe, expect, it } from "vitest";
import { decksBrief } from "../lessons/prompt";
import { hookable, hookInput } from "../services/hook-draft";
import { russian } from "./russian";

const fixtures = JSON.parse(
  readFileSync(new URL("./fixtures/ru.json", import.meta.url), "utf8"),
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

describe("the ru lesson slot", () => {
  it("tells the model how a lesson prints stress", () => {
    const brief = decksBrief(
      [{ id: "d", name: "Русский A1", description: null, language: "ru", examples: [] }],
      { fixed: true, hint: undefined, meaningLanguage: "en", limit: 0 },
    );
    expect(brief).toContain(`  Readings: ${russian.lesson}.`);
  });

  it("stores each printed stress as U+0301 on a Cyrillic vowel, fitting its term", () => {
    expect(fixtures.lesson.length).toBeGreaterThanOrEqual(20);
    for (const { term, printed, reading } of fixtures.lesson) {
      const stored = normalizeCardText("ru", { pronunciation: printed }).fields.pronunciation;
      expect(stored, printed).toBe(reading);
      expect(readingKey({ term, language: "ru", pronunciation: stored }), printed).not.toBeNull();
    }
  });

  it("keeps a homograph's two stresses apart", () => {
    const key = (term: string, printed: string) =>
      readingKey({
        term,
        language: "ru",
        pronunciation: normalizeCardText("ru", { pronunciation: printed }).fields.pronunciation,
      });
    expect(key("замок", "за́мок")).not.toBe(key("замок", "замо́к"));
    expect(key("мука", "мука́")).not.toBe(key("мука", "му́ка"));
    expect(key("замок", "замóк")).toBe(key("замок", "замо́к"));
  });
});

describe("the ru hook slot", () => {
  it("sends its advice with every Russian card the keyword method fits", () => {
    expect(fixtures.hook.length).toBeGreaterThanOrEqual(20);
    for (const card of fixtures.hook) {
      const hookCard = { ...card, language: card.language ?? "ru" };
      const meaningLanguage = /\p{Script=Cyrillic}/u.test(card.meaning) ? "uk" : "en";
      expect(hookable(hookCard, meaningLanguage), card.term).toBe(true);
      expect(JSON.parse(hookInput(hookCard)).guide, card.term).toBe(russian.hook);
    }
  });
});

describe("the ru checks", () => {
  it("score each invented reply as a careful reader would", () => {
    expect(fixtures.checks.length).toBeGreaterThanOrEqual(20);
    for (const { rule, field, term = "", text, example, pass } of fixtures.checks) {
      const check = russian.checks.find((one) => one.rule === rule && one.field === field);
      expect(check, `${field}: ${rule}`).toBeDefined();
      expect(check?.pass(text, { term, example }), `${rule}: ${text}`).toBe(pass);
    }
  });
});
