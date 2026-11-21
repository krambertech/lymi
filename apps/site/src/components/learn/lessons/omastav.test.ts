import { describe, expect, it } from "vitest";
import {
  OMASTAV_FORMS,
  OMASTAV_PASSAGE,
  OMASTAV_PHRASES,
  OMASTAV_PRONOUNS,
  OMASTAV_WHOSE,
} from "../../../lib/learn/clips";
import { gapLine } from "../../../lib/learn/passage";
import { eachPairFirst, shuffle } from "../../../lib/learn/quiz";
import { firstOrder, formsOf, KATI_GAPS, sharedLength } from "./Omastav";

describe("genitive quizzes", () => {
  it("hears each of the six pronouns once in every run of “Whose?”", () => {
    const items = OMASTAV_WHOSE.map((each) => ({ ...each, pair: [each.who, each.said] as const }));
    const everyone = new Set(OMASTAV_PRONOUNS.map(({ who }) => who));
    for (let run = 0; run < 200; run++) {
      const heard = eachPairFirst(items, items[0])
        .slice(0, 6)
        .map((item) => item.who);
      expect(new Set(heard)).toEqual(everyone);
    }
  });

  it("meets all three kinds of word in every run of “Which form goes first?”", () => {
    const items = OMASTAV_PHRASES.map((each) => ({
      ...each,
      pair: [each.kind, each.noun] as const,
    }));
    for (let run = 0; run < 200; run++) {
      const kinds = eachPairFirst(items, items[0])
        .slice(0, 6)
        .map((item) => item.kind);
      expect(new Set(kinds)).toEqual(new Set(["vowel", "inside", "same"]));
    }
  });

  it("offers each form once, with the genitive among them", () => {
    for (const phrase of OMASTAV_PHRASES) {
      const forms = formsOf(phrase);
      expect(forms).toContain(phrase.whose);
      expect(new Set(forms).size).toBe(forms.length);
      expect(forms.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("puts the first round's answer in every place across the items", () => {
    const places = new Set(
      OMASTAV_PHRASES.map((each, i) => firstOrder(each, i).indexOf(each.whose)),
    );
    expect(places).toEqual(new Set([0, 1, 2]));
  });

  it("puts a later round's answer in every place", () => {
    const phrase = OMASTAV_PHRASES[0] as (typeof OMASTAV_PHRASES)[number];
    const places = new Set<number>();
    for (let run = 0; run < 200; run++) places.add(shuffle(formsOf(phrase)).indexOf(phrase.whose));
    expect(places).toEqual(new Set([0, 1, 2]));
  });
});

describe("genitive data", () => {
  it("builds each -s or -l form on the genitive", () => {
    for (const each of [...OMASTAV_FORMS, ...OMASTAV_PHRASES])
      expect(each.where.slice(0, -1)).toBe(each.whose);
  });

  it("lights only the letters a genitive doesn't share with its word", () => {
    expect(sharedLength("kool", "kooli")).toBe(4);
    expect(sharedLength("pood", "poe")).toBe(2);
    expect(sharedLength("tuba", "toa")).toBe(1);
    expect(sharedLength("nemad", "nende")).toBe(2);
    expect(sharedLength("tema", "tema")).toBe(4);
  });
});

describe("Kati's note", () => {
  it("spells the recorded passage once every gap holds its answer", () => {
    const filled = KATI_GAPS.map((gap) => gapLine(gap.before, gap.answer, gap.after)).join(" ");
    expect(filled).toBe(OMASTAV_PASSAGE.join(" "));
  });

  it("offers the answer in each gap, first in some and second in others", () => {
    for (const gap of KATI_GAPS) expect(gap.options).toContain(gap.answer);
    const places = new Set(KATI_GAPS.map((gap) => gap.options?.indexOf(gap.answer)));
    expect(places).toEqual(new Set([0, 1]));
  });
});
