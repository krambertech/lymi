import { setupI18n } from "@lingui/core";
import { describe, expect, it } from "vitest";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { endingItems, endingRun, threeEndings, whenItems } from "./Lihtminevik";

const i18n = setupI18n({ locale: "en", messages: { en: {} } });

describe("past-tense quizzes", () => {
  it("asks every person once in a six-round run of endings", () => {
    const items = endingItems(i18n);
    for (let run = 0; run < 200; run++) {
      const six = endingRun(items, run === 0 ? items[0] : undefined).slice(0, 6);
      expect(new Set(six.map((item) => item.pair[0])).size).toBe(6);
    }
  });

  it("opens on a round that isn't the lesson's first example", () => {
    const [first] = endingItems(i18n);
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

  it("hears both now and the past in every run", () => {
    const items = whenItems(i18n);
    for (let run = 0; run < 200; run++) {
      const six = eachPairFirst(items).slice(0, 6);
      expect(new Set(six.map((item) => item.answer))).toEqual(new Set(["now", "past"]));
    }
  });
});
