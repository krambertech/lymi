import { describe, expect, it } from "vitest";
import {
  OMASTAV_FORMS,
  OMASTAV_PASSAGE,
  OMASTAV_PHRASES,
  OMASTAV_PRONOUNS,
  OMASTAV_WHOSE,
} from "../../../lib/learn/clips";
import { gapLine } from "../../../lib/learn/passage";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { firstOrder, formOptions, KATI_GAPS, sharedLength } from "./Omastav";

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

  it("meets every word once in every run of “Which form goes first?”", () => {
    const items = OMASTAV_PHRASES.map((each) => ({
      ...each,
      pair: [each.word, each.noun] as const,
    }));
    const words = new Set(OMASTAV_PHRASES.map((each) => each.word));
    for (let run = 0; run < 200; run++) {
      const asked = eachPairFirst(items, items[0])
        .slice(0, OMASTAV_PHRASES.length)
        .map((item) => item.word);
      expect(new Set(asked)).toEqual(words);
    }
  });

  it("offers the genitive, its word and another owner's genitive, never the -s or -l form", () => {
    for (const [i, phrase] of OMASTAV_PHRASES.entries()) {
      const others = OMASTAV_PHRASES.filter((each) => each.word !== phrase.word).map(
        (e) => e.whose,
      );
      const sets = new Set<string>();
      const places = new Set<number>();
      for (const options of [
        firstOrder(phrase, i),
        ...Array.from({ length: 300 }, () => formOptions(phrase)),
      ]) {
        expect(new Set(options).size).toBe(3);
        expect(options).toContain(phrase.whose);
        expect(options).toContain(phrase.word);
        expect(options).not.toContain(phrase.where);
        expect(options.filter((each) => others.includes(each))).toHaveLength(1);
        // No option is another with an ending added, which would give the answer by its shape.
        for (const each of options) {
          expect(options).not.toContain(`${each}s`);
          expect(options).not.toContain(`${each}l`);
        }
        sets.add([...options].sort().join(" "));
        places.add(options.indexOf(phrase.whose));
      }
      expect(sets.size).toBeGreaterThan(1);
      expect(places).toEqual(new Set([0, 1, 2]));
    }
  });

  it("puts the first round's answer in every place across the items", () => {
    const places = new Set(
      OMASTAV_PHRASES.map((each, i) => firstOrder(each, i).indexOf(each.whose)),
    );
    expect(places).toEqual(new Set([0, 1, 2]));
    // The pinned first round is items[0] as the server renders it: its answer leads.
    const pinned = OMASTAV_PHRASES[0] as (typeof OMASTAV_PHRASES)[number];
    expect(firstOrder(pinned, 0).indexOf(pinned.whose)).toBe(0);
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
