import { describe, expect, it } from "vitest";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { ENDINGS, HEARD, heardPair, threePlaces } from "./Kohad";

describe("saying-where quizzes", () => {
  it("hears a town and a building in every run of “Which place?”", () => {
    const items = HEARD.map((each) => ({ ...each, pair: heardPair(each.where) }));
    for (let run = 0; run < 200; run++) {
      const kinds = eachPairFirst(items, items[0])
        .slice(0, 6)
        .map((item) => item.pair[0]);
      expect(new Set(kinds)).toEqual(new Set(["town", "building"]));
    }
  });

  it("offers the answer and two places of its kind, in no fixed place", () => {
    const places = new Set<number>();
    for (let run = 0; run < 200; run++) {
      const three = threePlaces("koolis");
      expect(new Set(three).size).toBe(3);
      expect(three).toContain("koolis");
      expect(three.every((each) => each === each.toLowerCase())).toBe(true);
      places.add(three.indexOf("koolis"));
    }
    expect(places.size).toBe(3);
  });

  it("asks both endings in every run of “-s or -l?”", () => {
    const items = ENDINGS.map((each) => ({ ...each, pair: [each.ending, each.id] as const }));
    for (let run = 0; run < 200; run++) {
      const endings = eachPairFirst(items).slice(0, 8);
      expect(new Set(endings.map((item) => item.ending))).toEqual(new Set(["s", "l"]));
    }
  });
});

describe("saying-where data", () => {
  it("builds each place from the shown stem and its ending", () => {
    for (const each of ENDINGS) expect(each.before + each.ending).toBe(each.where);
  });

  it("offers each first-round answer among its options", () => {
    for (const each of HEARD) {
      expect(each.options).toContain(each.where);
      expect(new Set(each.options).size).toBe(3);
    }
  });
});
