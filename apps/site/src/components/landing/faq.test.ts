import { describe, expect, it } from "vitest";
import { LANGUAGES_QUESTIONS, MEDICINE_QUESTIONS, questionLinkHref } from "./faq";

describe("questionLinkHref", () => {
  it("sends each edition to the comparison page in its own language", () => {
    const anki = LANGUAGES_QUESTIONS.find((question) => question.id === "anki");
    if (!anki?.link) throw new Error("The languages FAQ lost its Anki link");
    expect(questionLinkHref(anki.link, "en")).toBe("/compare/anki");
    expect(questionLinkHref(anki.link, "uk")).toBe("/uk/compare/anki");
    expect(questionLinkHref(anki.link, "ru")).toBe("/ru/compare/anki");
  });

  it("keeps an English-only guide as written", () => {
    const anki = MEDICINE_QUESTIONS.find((question) => question.id === "anki");
    if (!anki?.link) throw new Error("The medicine FAQ lost its Anki link");
    expect(questionLinkHref(anki.link, "uk")).toBe("/docs/import-from-anki");
  });
});
