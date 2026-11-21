import { describe, expect, it } from "vitest";
import { STEM_WORDS } from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import {
  ASKED,
  changed,
  endingOf,
  firstWords,
  formsInOrder,
  HEARD,
  threeForms,
  threeWords,
  wrongForms,
} from "./PoodPoe";

describe("stems data", () => {
  it("builds each form from the stem and -s or -l", () => {
    for (const noun of STEM_WORDS) {
      expect(noun.where.startsWith(noun.stem)).toBe(true);
      expect(["s", "l"]).toContain(endingOf(noun));
    }
  });

  it("lights a change for every stem that differs, and none for one that doesn't", () => {
    for (const noun of STEM_WORDS) {
      const parts = changed(noun.word, noun.stem);
      expect(parts.join("")).toBe(noun.stem);
      expect(parts[1] === "").toBe(noun.kind === "same");
    }
    expect(changed("pood", "poe")).toEqual(["po", "e", ""]);
    expect(changed("tuba", "toa")).toEqual(["t", "o", "a"]);
    expect(changed("kool", "kooli")).toEqual(["kool", "i", ""]);
  });

  it("has six nouns of each kind, with three wrong forms unlike the answer", () => {
    for (const kind of ["inside", "vowel", "same"] as const)
      expect(STEM_WORDS.filter((noun) => noun.kind === kind)).toHaveLength(6);
    for (const noun of STEM_WORDS) expect(new Set([noun.where, ...noun.slips]).size).toBe(4);
  });

  it("doesn't let the shortest or longest form give the answer away", () => {
    const shortest = STEM_WORDS.filter((noun) =>
      noun.slips.every((slip) => noun.where.length < slip.length),
    );
    const longest = STEM_WORDS.filter((noun) =>
      noun.slips.every((slip) => noun.where.length > slip.length),
    );
    expect(shortest.length).toBeLessThan(STEM_WORDS.length / 3);
    expect(longest.length).toBeLessThan(STEM_WORDS.length / 3);
  });
});

describe("stems quizzes", () => {
  it("asks every word in a run of “Which word?”", () => {
    const items = HEARD.map((noun) => ({ noun, pair: [noun.word, noun.word] as const }));
    for (let run = 0; run < 200; run++) {
      const asked = eachPairFirst(items, items[0]).slice(0, HEARD.length);
      expect(new Set(asked.map((item) => item.noun.word)).size).toBe(HEARD.length);
    }
  });

  it("offers the word, its stem and one other word, the answer in no fixed place", () => {
    const tuba = HEARD.find((noun) => noun.word === "tuba");
    if (!tuba) throw new Error("tuba is missing");
    const places = new Set<number>();
    for (let run = 0; run < 200; run++) {
      const three = threeWords(tuba);
      expect(new Set(three).size).toBe(3);
      expect(three).toContain("tuba");
      expect(three).toContain("toa");
      places.add(three.indexOf("tuba"));
    }
    expect(places.size).toBe(3);
  });

  it("opens both quizzes on a noun other than pood, its answer not first", () => {
    expect(HEARD[0]?.word).not.toBe("pood");
    expect(ASKED[0]?.noun.word).not.toBe("pood");
    expect(firstWords(0).indexOf(HEARD[0]?.word ?? "")).not.toBe(0);
    const first = ASKED[0]?.noun;
    if (!first) throw new Error("no first noun");
    expect(formsInOrder(first, 1).indexOf(first.where)).not.toBe(0);
  });

  it("offers each first-round word with its stem", () => {
    HEARD.forEach((noun, i) => {
      expect(firstWords(i)).toContain(noun.word);
      expect(firstWords(i)).toContain(noun.stem);
      expect(new Set(firstWords(i)).size).toBe(3);
    });
  });

  it("meets all three kinds in every run of “Which form?”", () => {
    for (let run = 0; run < 200; run++) {
      const kinds = eachPairFirst(ASKED, ASKED[0])
        .slice(0, 6)
        .map((item) => item.pair[0]);
      expect(new Set(kinds)).toEqual(new Set(["inside", "vowel", "same"]));
    }
  });

  it("puts the first round's answer in every place across the nouns", () => {
    const places = new Set(
      STEM_WORDS.map((noun, i) => formsInOrder(noun, i + 1).indexOf(noun.where)),
    );
    expect(places).toEqual(new Set([0, 1, 2]));
  });

  it("draws different wrong forms for one noun across runs, never the answer", () => {
    for (const noun of STEM_WORDS) {
      expect(wrongForms(noun)).not.toContain(noun.where);
      expect(wrongForms(noun).length).toBeGreaterThanOrEqual(3);
      const sets = new Set<string>();
      for (let run = 0; run < 200; run++) {
        const three = threeForms(noun);
        expect(new Set(three).size).toBe(3);
        expect(three).toContain(noun.where);
        sets.add([...three].sort().join(" "));
      }
      expect(sets.size).toBeGreaterThan(1);
    }
  });
});
