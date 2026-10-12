import type { PublicDeckSummary } from "@lymi/core/catalog";
import { describe, expect, it } from "vitest";
import { EXAMS, examOfDeck, examPath, GERMAN_STATES, isExamShelf, listedExams } from "./exams";

const summary = (slug: string): PublicDeckSummary => ({
  slug,
  name: slug,
  summary: "",
  category: "citizenship",
  tags: [],
  language: "de",
  meaningLanguage: "en",
  cardCount: 10,
  sectionCount: 0,
  card: null,
});

describe("exams", () => {
  it("names every German state once", () => {
    expect(GERMAN_STATES).toHaveLength(16);
    expect(new Set(GERMAN_STATES.map((state) => state.slug)).size).toBe(16);
  });

  it("names each deck under one exam only", () => {
    const slugs = EXAMS.flatMap((exam) => exam.decks);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("keeps the catalogue's decks in the exam's order and leaves out an exam with none", () => {
    const listed = listedExams([
      summary("einbuergerungstest-bayern"),
      summary("leben-in-deutschland-test"),
      summary("everyday-estonian"),
    ]);
    expect(listed.map((each) => each.exam.id)).toEqual(["germany"]);
    expect(listed[0]?.decks.map((deck) => deck.slug)).toEqual([
      "leben-in-deutschland-test",
      "einbuergerungstest-bayern",
    ]);
  });

  it("leads a deck page to its own exam's page", () => {
    expect(examOfDeck("einbuergerungstest-berlin")?.slug).toBe("einbuergerungstest");
    expect(examOfDeck("leben-in-deutschland-test")?.slug).toBe("einbuergerungstest");
    expect(examOfDeck("us-citizenship-reading-writing-vocabulary")?.slug).toBe(
      "us-citizenship-test",
    );
    expect(examOfDeck("everyday-estonian")).toBeUndefined();
  });

  it("gives every exam its own page in every locale", () => {
    expect(new Set(EXAMS.map((exam) => exam.slug)).size).toBe(EXAMS.length);
    const germany = EXAMS.find((exam) => exam.id === "germany");
    expect(germany && examPath(germany, "ru")).toBe("/ru/exams/einbuergerungstest");
  });

  it("treats only the citizenship and driving shelves as exam shelves", () => {
    expect(isExamShelf({ kind: "subjects", name: "citizenship" })).toBe(true);
    expect(isExamShelf({ kind: "subjects", name: "driving" })).toBe(true);
    expect(isExamShelf({ kind: "subjects", name: "geography" })).toBe(false);
    expect(isExamShelf({ kind: "languages", name: "german" })).toBe(false);
  });
});
