import { describe, expect, it } from "vitest";
import { WEEK } from "./clips";
import { dayChoices, weekDay } from "./days";

describe("day choices", () => {
  it("offers four different days in the week's order, the answer and the required ones among them", () => {
    for (const [i, answer] of WEEK.entries()) {
      const today = weekDay(i - 1);
      for (let run = 0; run < 200; run++) {
        const choices = dayChoices(answer, [today]);
        expect(new Set(choices).size).toBe(4);
        expect(choices).toContain(answer);
        expect(choices).toContain(today);
        expect(choices).toEqual(WEEK.filter((each) => choices.includes(each)));
      }
    }
  });

  it("varies the other days, so the answer's place gives nothing away", () => {
    const places = new Set<number>();
    const sets = new Set<string>();
    for (let run = 0; run < 200; run++) {
      const choices = dayChoices("kolmapäev");
      places.add(choices.indexOf("kolmapäev"));
      sets.add(choices.join());
    }
    expect(places.size).toBeGreaterThan(2);
    expect(sets.size).toBeGreaterThan(5);
  });

  it("wraps round the week", () => {
    expect(weekDay(7)).toBe("esmaspäev");
    expect(weekDay(-1)).toBe("pühapäev");
  });
});
