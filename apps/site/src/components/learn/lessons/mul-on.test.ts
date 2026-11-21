import { describe, expect, it } from "vitest";
import { MUL_ON_NAMES, MUL_ON_OWNERS, MUL_ON_PASSAGE } from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { AM_HAVE, threeOwners, WHO_HAS } from "./MulOn";

const OWNERS = MUL_ON_OWNERS.map(({ owner }) => owner);

describe("“to have” quizzes", () => {
  it("asks every owner once in each run of “Who has it?”", () => {
    const items = WHO_HAS.map((each) => ({ ...each, pair: [each.owner, each.said] as const }));
    for (let run = 0; run < 200; run++) {
      const asked = eachPairFirst(items, run === 0 ? items[0] : undefined)
        .slice(0, 6)
        .map((item) => item.owner);
      expect(new Set(asked)).toEqual(new Set(OWNERS));
    }
  });

  it("offers the answer, its nearest-sounding form and one more, in no fixed place", () => {
    for (const owner of OWNERS) {
      const places = new Set<number>();
      const others = new Set<string>();
      for (let run = 0; run < 200; run++) {
        const three = threeOwners(owner);
        expect(new Set(three).size).toBe(3);
        expect(three).toContain(owner);
        places.add(three.indexOf(owner));
        for (const each of three) others.add(each);
      }
      expect(places.size).toBe(3);
      // The third option is drawn from every other form, so no set names the answer.
      expect(others.size).toBeGreaterThan(3);
    }
  });

  it("puts each first-round answer among three different options", () => {
    for (const each of WHO_HAS) {
      expect(each.options).toContain(each.owner);
      expect(new Set(each.options).size).toBe(3);
    }
    expect(new Set(WHO_HAS.map((each) => each.options.indexOf(each.owner))).size).toBe(3);
  });

  it("asks both am and have in every run of “Am or have?”", () => {
    const items = AM_HAVE.map((each) => ({ ...each, pair: [each.kind, each.said] as const }));
    for (let run = 0; run < 200; run++) {
      const kinds = eachPairFirst(items).slice(0, 6);
      expect(new Set(kinds.map((item) => item.kind))).toEqual(new Set(["am", "have"]));
    }
  });
});

describe("“to have” data", () => {
  it("builds each name's -l form on its genitive", () => {
    for (const each of MUL_ON_NAMES) expect(each.owner).toBe(`${each.genitive}l`);
  });

  it("starts each owner's sentence with its -l form", () => {
    for (const { owner, said } of MUL_ON_OWNERS)
      expect(said.toLowerCase().split(" ")).toContain(owner);
  });

  it("ends every sentence of Mari's note with a full stop or a question mark", () => {
    for (const sentence of MUL_ON_PASSAGE) expect(sentence).toMatch(/[.?]$/);
  });
});
