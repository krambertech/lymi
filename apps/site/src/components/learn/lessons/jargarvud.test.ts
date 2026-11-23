import { describe, expect, it } from "vitest";
import { JARGARVUD_HEARD } from "../../../lib/learn/clips";
import { dateMatches, writtenDate } from "../../../lib/learn/estonian-ordinals";
import { dayItems, dayOptions, dayRun } from "./Jargarvud";

describe("ordinals quizzes", () => {
  const items = dayItems(() => null);

  it("hears every family once in a six-round run", () => {
    for (let run = 0; run < 200; run++) {
      const six = dayRun(items, run === 0 ? items[0] : undefined).slice(0, 6);
      expect(new Set(six.map((item) => item.pair[0])).size).toBe(6);
    }
  });

  it("opens on 14, not the lesson's first example, with the answer second", () => {
    const [first] = items;
    expect(first?.answer).toBe("14");
    expect(first?.options.findIndex((option) => option.id === first.answer)).toBe(1);
  });

  it("offers the answer, a number that sounds like it and another day, in no fixed place", () => {
    const places = new Set<number>();
    const sets = new Set<string>();
    for (let run = 0; run < 300; run++) {
      const three = dayOptions(13, [3, 13, 23, 30]);
      expect(new Set(three).size).toBe(3);
      expect(three.filter((n) => [3, 23, 30].includes(n)).length).toBeGreaterThan(0);
      places.add(three.indexOf(13));
      sets.add([...three].sort().join());
    }
    expect(places.size).toBe(3);
    expect(sets.size).toBeGreaterThan(3);
  });

  it("counts each heard date as Estonian writes it", () => {
    for (const { day, month } of JARGARVUD_HEARD)
      expect(dateMatches(writtenDate(day, month), day, month)).toBe(true);
  });
});
