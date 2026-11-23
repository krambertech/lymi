import { describe, expect, it } from "vitest";
import { PAGES } from "../components/docs/nav";
import { ASSISTANTS_QUESTIONS } from "../components/landing/faq";
import { LANDING_BLURB } from "../components/landing/landing-copy";
import { EXAMS, examPath } from "./exams";
import { pageI18n } from "./i18n";
import { llmsTxt } from "./llms";
import { isPrelaunch, type LocalizedPage, localizedPages, localizedPath } from "./routes";

describe("llmsTxt", () => {
  const text = llmsTxt();

  it("defines Lymi the way the homepage does, word for word", () => {
    expect(text).toContain(`> ${pageI18n("en")._(LANDING_BLURB)}`);
  });

  it("points at the pages an assistant should read", () => {
    expect(text).toContain("(https://lymi.app/explore)");
  });

  it("lists every launched page that is translated", () => {
    for (const page of Object.keys(localizedPages) as LocalizedPage[]) {
      if (isPrelaunch(page)) continue;
      expect(text).toContain(`(https://lymi.app${localizedPath(page, "en")})`);
    }
  });

  it("lists every exam page and every documentation page", () => {
    for (const exam of EXAMS) expect(text).toContain(`https://lymi.app${examPath(exam, "en")})`);
    for (const page of PAGES) expect(text).toContain(`https://lymi.app${page.to})`);
  });

  it("names every import source and every assistant guide", () => {
    for (const name of [
      "Anki",
      "Mochi",
      "Noji",
      "Pleco",
      "Quizlet",
      "Yomitan",
      "Readwise",
      "Claude",
      "ChatGPT",
      "Gemini",
      "Cursor",
      "Grok",
    ]) {
      expect(text).toContain(name);
    }
  });

  it("says Lymi is free", () => {
    expect(text).toContain("free");
  });

  it("carries no count that a deploy can make wrong", () => {
    expect(text).not.toMatch(/\b\d[\d,.]*\+?\s*(cards|decks|learners|users|words)\b/i);
  });
});

describe("the AI assistants page", () => {
  it("names every assistant the docs have a guide for", () => {
    const which = ASSISTANTS_QUESTIONS.find((question) => question.id === "which");
    const answer = which ? pageI18n("en")._(which.answer) : "";
    for (const page of PAGES.filter((page) => page.to.startsWith("/docs/mcp/"))) {
      for (const name of page.nav.split(" and ")) expect(answer).toContain(name);
    }
  });
});
