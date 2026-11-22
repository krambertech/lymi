import { setupI18n } from "@lingui/core";
import { describe, expect, it } from "vitest";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { endingItems, endingRun, threeEndings, whenItems } from "./Lihtminevik";

const i18n = setupI18n({ locale: "en", messages: { en: {} } });

describe("past-tense quizzes", () => {
  it("asks every person once in a six-round run of endings", () => {
    const items = endingItems();
    for (let run = 0; run < 200; run++) {
      const six = endingRun(items, run === 0 ? items[0] : undefined).slice(0, 6);
      expect(new Set(six.map((item) => item.pair[0])).size).toBe(6);
    }
  });

  it("opens on a round that isn't the lesson's first example", () => {
    const [first] = endingItems();
    expect(first?.said).toBe("Te ootasite");
    expect(first?.options.indexOf(first.answer)).toBe(1);
  });

  it("offers the answer and two other endings, in no fixed place", () => {
    const places = new Set<number>();
    for (let run = 0; run < 200; run++) {
      const three = threeEndings("sid");
      expect(new Set(three).size).toBe(3);
      expect(three).toContain("sid");
      places.add(three.indexOf("sid"));
    }
    expect(places.size).toBe(3);
  });

  it("hears every verb once in a seven-round run, now or in the past", () => {
    const items = whenItems(i18n);
    const answers = new Set<string>();
    for (let run = 0; run < 200; run++) {
      const seven = eachPairFirst(items, run === 0 ? items[0] : undefined).slice(0, 7);
      expect(new Set(seven.map((item) => item.pair[0])).size).toBe(7);
      for (const item of seven.slice(1)) answers.add(`${item.pair[0]}-${item.answer}`);
    }
    // Every verb is heard both ways across runs, so its tense can't be learned from its verb.
    expect(answers.size).toBe(14);
  });
});
