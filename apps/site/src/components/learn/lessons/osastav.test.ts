import { describe, expect, it } from "vitest";
import { OSASTAV_POLE_QUIZ, PARTITIVE_NOUNS } from "../../../lib/learn/clips";
import { COUNT_ITEMS, countRun, litForm, poleRun } from "./Osastav";

describe("partitive lesson", () => {
  const items = COUNT_ITEMS.map((item) => ({
    ...item,
    options: [item.noun, PARTITIVE_NOUNS[item.noun]] as readonly string[],
  }));
  const nouns = new Set(items.map((item) => item.noun));

  it("asks every noun once, three with üks and three from two up, with or without a pinned round", () => {
    for (let run = 0; run < 300; run++) {
      const pinned = run % 2 ? items[run % items.length] : undefined;
      const asked = countRun(items, pinned);
      expect(asked).toHaveLength(6);
      expect(new Set(asked.map((item) => item.noun))).toEqual(nouns);
      expect(asked.filter((item) => item.one)).toHaveLength(3);
      if (pinned) expect(asked[0]).toBe(pinned);
    }
  });

  it("puts the answer in either place after the first round", () => {
    const places = new Set<number>();
    for (let run = 0; run < 100; run++)
      for (const item of countRun(items).slice(0, 6))
        places.add(item.options.indexOf(item.one ? item.noun : PARTITIVE_NOUNS[item.noun]));
    expect(places).toEqual(new Set([0, 1]));
  });

  it("lights only what the third form adds", () => {
    expect(litForm("kaks kassi", "kass", "kassi")).toBe("kaks kass|i");
    expect(litForm("Tal pole last.", "laps", "last")).toBe("Tal pole la|st");
    expect(litForm("kaks maja", "maja", "maja")).toBe("kaks maja");
    expect(litForm("Kass pole laual.", "kass", "kass")).toBe("Kass pole laual");
  });

  it("asks four nouns after pole, two of them said first", () => {
    const pole = OSASTAV_POLE_QUIZ.map((row) => ({
      noun: row.noun,
      first: "first" in row,
      options: [row.noun, PARTITIVE_NOUNS[row.noun]] as readonly string[],
    }));
    for (let run = 0; run < 300; run++) {
      const pinned = run % 2 ? pole[run % pole.length] : undefined;
      const asked = poleRun(pole, pinned);
      expect(asked).toHaveLength(4);
      expect(new Set(asked.map((item) => item.noun)).size).toBe(4);
      expect(asked.filter((item) => item.first)).toHaveLength(2);
    }
  });
});
