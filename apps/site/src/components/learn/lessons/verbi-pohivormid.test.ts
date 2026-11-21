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
import { ASKED, CLASS_GAPS, HEARD, threeVerbs } from "./VerbiPohivormid";

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
    for (const verb of VERB_FORMS) expect(verb.da[1]).toMatch(/^(da|ta|la|na|a)$/);
  });
});

describe("“Which form did you hear?”", () => {
  it("hears all three forms in the first three rounds of every run", () => {
    for (let run = 0; run < 200; run++) {
      const three = eachPairFirst(HEARD, HEARD[0]).slice(0, 3);
      expect(new Set(three.map((item) => item.kind))).toEqual(new Set(["ma", "da", "n"]));
    }
  });

  it("has a recording for every form it asks about", () => {
    for (const item of HEARD) expect(recorded[clipId(item.said)]).toBe(item.said);
  });
});

describe("“Which verb is it?”", () => {
  it("offers the answer, the verb it's likeliest taken for, and one more, in no fixed place", () => {
    const places = new Set<number>();
    for (let run = 0; run < 300; run++) {
      const three = threeVerbs("sööma");
      expect(new Set(three).size).toBe(3);
      expect(three).toContain("sööma");
      expect(three).toContain("jooma");
      places.add(three.indexOf("sööma"));
    }
    expect(places.size).toBe(3);
  });

  it("asks six different verbs in a run", () => {
    const items = ASKED.map((ma) => ({ ma, pair: [ma, ma] as const }));
    for (let run = 0; run < 50; run++) {
      const six = eachPairFirst(items, items[0]).slice(0, 6);
      expect(new Set(six.map((item) => item.ma)).size).toBe(6);
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
