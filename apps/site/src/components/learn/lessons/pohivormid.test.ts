import { describe, expect, it } from "vitest";
import { NOUN_FORMS, POHIVORMID_TYPED } from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { formsOf, MATCHED } from "./Pohivormid";

describe("three forms quizzes", () => {
  it("matches six words whose second and third forms differ, none the card’s example", () => {
    expect(MATCHED).toHaveLength(6);
    expect(MATCHED).not.toContain("pood");
    const rights = MATCHED.map((first) => formsOf(first).slice(1).join(", "));
    expect(new Set(rights).size).toBe(6);
  });

  it("asks every pattern in every run of “Type the third form”", () => {
    const items = POHIVORMID_TYPED.map((each) => ({
      ...each,
      pair: [each.pattern, each.forms[0]] as const,
    }));
    for (let run = 0; run < 200; run++) {
      const asked = eachPairFirst(items).slice(0, 6);
      expect(new Set(asked.map((item) => item.pattern))).toEqual(new Set(["ne", "us", "long"]));
    }
  });
});

describe("three forms data", () => {
  it("follows each pattern the typed quiz teaches", () => {
    for (const { forms, pattern } of POHIVORMID_TYPED) {
      const [one, two, three] = forms;
      if (pattern === "ne") {
        expect(one.endsWith("ne")).toBe(true);
        expect(two).toBe(`${one.slice(0, -2)}se`);
        expect(three).toBe(`${one.slice(0, -2)}st`);
      } else if (pattern === "us") {
        expect(two).toBe(`${one}e`);
        expect(three).toBe(`${one}t`);
      } else {
        expect(two).toBe(one);
        expect(three).toBe(`${one}d`);
      }
    }
  });

  it("lists each noun once", () => {
    const firsts = NOUN_FORMS.map((forms) => forms[0]);
    expect(new Set(firsts).size).toBe(firsts.length);
  });
});
