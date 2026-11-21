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

  it("offers the word and its genitive, never a form that gives the answer by its shape", () => {
    for (const phrase of OMASTAV_PHRASES) {
      const options = formsOf(phrase);
      expect(options).toEqual([phrase.word, phrase.whose]);
      expect(phrase.word).not.toBe(phrase.whose);
      // The -s or -l form is the cue, never an option: offered, it would extend the answer by one letter.
      expect(options).not.toContain(phrase.where);
      for (const each of options) {
        expect(options).not.toContain(`${each}s`);
        expect(options).not.toContain(`${each}l`);
      }
    }
  });

  it("puts the answer first and second, in the first round and in later ones", () => {
    const firstPlaces = new Set(
      OMASTAV_PHRASES.map((each, i) => firstOrder(each, i).indexOf(each.whose)),
    );
    expect(firstPlaces).toEqual(new Set([0, 1]));
    // The pinned first round is items[0] as the server renders it; later rounds are shuffled.
    const pinned = OMASTAV_PHRASES[0] as (typeof OMASTAV_PHRASES)[number];
    expect(firstOrder(pinned, 0)).toContain(pinned.whose);
    const later = new Set<number>();
    for (let run = 0; run < 200; run++) later.add(shuffle(formsOf(pinned)).indexOf(pinned.whose));
    expect(later).toEqual(new Set([0, 1]));
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
