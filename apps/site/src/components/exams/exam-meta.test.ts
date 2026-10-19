import { describe, expect, it } from "vitest";
import { EXAMS } from "../../lib/exams";
import { locales } from "../../lib/routes";
import { examDescription, examTitle } from "./exam-meta";

const topik = EXAMS.find((exam) => exam.id === "topik");
if (!topik) throw new Error("TOPIK is listed");
const decks = [{ cardCount: 600 }, { cardCount: 900 }];

describe("examTitle", () => {
  it("keeps the heading where it fits and drops Lymi's name first", () => {
    expect(examTitle(topik, "en", decks)).toBe(
      "TOPIK: the words for TOPIK I and the start of TOPIK II",
    );
  });

  it("keeps every exam's title within 60 characters in every locale", () => {
    for (const exam of EXAMS) {
      for (const locale of locales) {
        expect([...examTitle(exam, locale, decks)].length).toBeLessThanOrEqual(60);
      }
    }
  });
});

describe("examDescription", () => {
  it("adds the free cards and decks after the lede", () => {
    expect(examDescription(topik, "en", decks)).toBe(
      "Vocabulary for levels 1 and 2 of TOPIK I and for level 3 of TOPIK II, with a translation beside each word. 1,500 free flashcards in 2 decks.",
    );
    expect(examDescription(topik, "ru", decks)).toContain("1 500 бесплатных карточек в 2 колодах.");
  });

  it("keeps every exam's description within 155 characters in every locale", () => {
    for (const exam of EXAMS) {
      for (const locale of locales) {
        expect([...examDescription(exam, locale, decks)].length).toBeLessThanOrEqual(155);
      }
    }
  });
});
