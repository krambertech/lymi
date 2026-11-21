import { describe, expect, it } from "vitest";
import {
  CLIPS,
  clipId,
  daForm,
  threeForms,
  VERB_FORMS,
  VORMID_CLASS,
} from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { ASKED, CLASS_GAPS, HEARD, heardRun, MADE, threeVerbs } from "./VerbiPohivormid";

const recorded = CLIPS["verbi-pohivormid"] ?? {};

describe("a verb's three forms", () => {
  it("records every form it shows and plays", () => {
    for (const verb of VERB_FORMS)
      for (const said of [verb.ma, daForm(verb), verb.n, threeForms(verb)])
        expect(recorded[clipId(said)]).toBe(said);
  });

  it("splits each -da form where its ending starts", () => {
    expect(VERB_FORMS.map(daForm)).toEqual([
      "elada",
      "lugeda",
      "rääkida",
      "õppida",
      "istuda",
      "töötada",
      "armastada",
      "oodata",
      "kuulata",
      "vaadata",
      "olla",
      "tulla",
      "minna",
      "teha",
      "näha",
      "süüa",
      "juua",
    ]);
    for (const verb of VERB_FORMS) expect(verb.da[1]).toBe(verb.pattern);
  });
});

describe("“Which form did you hear?”", () => {
  it("hears all three forms in the first three rounds of every run", () => {
    for (let run = 0; run < 200; run++) {
      const three = eachPairFirst(HEARD, HEARD[0]).slice(0, 3);
      expect(new Set(three.map((item) => item.kind))).toEqual(new Set(["ma", "da", "n"]));
    }
  });

  it("puts the answer in every place after the first round", () => {
    const items = HEARD.map((item) => ({
      pair: item.pair,
      answer: item.kind as string,
      options: ["ma", "da", "n"],
    }));
    const places = [new Set<number>(), new Set<number>(), new Set<number>()];
    for (let run = 0; run < 300; run++)
      heardRun(items, items[0])
        .slice(1, 4)
        .forEach((item, round) => {
          places[round]?.add(item.options.indexOf(item.answer));
        });
    for (const each of places) expect(each.size).toBe(3);
  });

  it("has a recording for every form it asks about", () => {
    for (const item of HEARD) expect(recorded[clipId(item.said)]).toBe(item.said);
  });
});

describe("“Which verb is it?”", () => {
  it("offers the answer and two others drawn at random, in no fixed place", () => {
    const places = new Set<number>();
    const others = new Set<string>();
    for (let run = 0; run < 300; run++) {
      const three = threeVerbs("sööma");
      expect(new Set(three).size).toBe(3);
      expect(three).toContain("sööma");
      places.add(three.indexOf("sööma"));
      for (const each of three) if (each !== "sööma") others.add(each);
    }
    expect(places.size).toBe(3);
    expect(others.size).toBe(ASKED.length - 1);
  });

  it("asks every verb once in a run", () => {
    const items = ASKED.map((ma) => ({ ma, pair: [ma, ma] as const }));
    for (let run = 0; run < 50; run++)
      expect(new Set(eachPairFirst(items, items[0]).map((item) => item.ma)).size).toBe(
        ASKED.length,
      );
  });
});

describe("“Make the -da form”", () => {
  it("meets every kind of -da form in a run's first five rounds", () => {
    for (let run = 0; run < 200; run++) {
      const five = eachPairFirst(MADE).slice(0, 5);
      expect(new Set(five.map((item) => item.verb.pattern))).toEqual(
        new Set(["da", "ta", "la", "na", "a"]),
      );
    }
  });
});

describe("the class passage", () => {
  it("reads, with its gaps filled, as the recording says it", () => {
    const filled = CLASS_GAPS.map(
      (gap) =>
        [gap.before, gap.answer].filter(Boolean).join(" ") + gap.after.replace(/^(?=[^,.!?])/, " "),
    )
      .join(" ")
      .replace(/ +/g, " ");
    expect(filled).toBe(VORMID_CLASS.join(" "));
  });

  it("puts each gap's answer among its words, not always in one place", () => {
    const places = new Set<number>();
    for (const gap of CLASS_GAPS) {
      const options: readonly string[] = gap.options;
      expect(options).toContain(gap.answer);
      places.add(options.indexOf(gap.answer));
    }
    expect(places.size).toBeGreaterThan(2);
  });
});
