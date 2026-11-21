import { describe, expect, it } from "vitest";
import {
  CLIPS,
  clipId,
  INFINITIVE_LEADS,
  INFINITIVE_MESSAGE,
  INFINITIVE_PAIRS,
} from "../../../lib/learn/clips";
import { gapLine } from "../../../lib/learn/passage";
import {
  FORM_ITEMS,
  FORM_ROUNDS,
  formRun,
  MESSAGE_GAPS,
  SECONDS,
  sentenceOf,
} from "./Tegevusnimed";

describe("“Which form follows?”", () => {
  it("opens on oskan, not the headline tahan or pean, with its answer in the second place", () => {
    const first = FORM_ITEMS[0];
    expect(first?.lead.lead).toBe("oskan");
    expect(first?.options.map((option) => option.id)).toEqual(["ma", "da"]);
  });

  it("asks four -da verbs and four -ma verbs in every run, each verb once", () => {
    for (let run = 0; run < 300; run++) {
      const asked = formRun(FORM_ITEMS, run % 2 === 0 ? FORM_ITEMS[0] : undefined);
      expect(asked).toHaveLength(FORM_ROUNDS);
      expect(asked.filter((item) => item.answer === "da")).toHaveLength(FORM_ROUNDS / 2);
      expect(new Set(asked.map((item) => item.lead.lead)).size).toBe(FORM_ROUNDS);
    }
  });

  it("puts the answer in either place after the first round", () => {
    const places = new Set<number>();
    for (let run = 0; run < 300; run++)
      for (const item of formRun(FORM_ITEMS, FORM_ITEMS[0]).slice(1))
        places.add(item.options.findIndex((option) => option.id === item.answer));
    expect(places).toEqual(new Set([0, 1]));
  });

  it("gives every verb a second verb that the table has", () => {
    for (const lead of INFINITIVE_LEADS) {
      const seconds = SECONDS[lead.lead];
      expect(seconds.length).toBeGreaterThan(0);
      for (const ma of seconds) expect(INFINITIVE_PAIRS.some((pair) => pair.ma === ma)).toBe(true);
    }
  });

  it("builds its sentences with the form the verb takes", () => {
    const tahan = INFINITIVE_LEADS.find((lead) => lead.lead === "tahan");
    const tule = INFINITIVE_LEADS.find((lead) => lead.lead === "tule");
    const lugema = INFINITIVE_PAIRS[0];
    expect(tahan && sentenceOf(tahan, lugema)).toBe("Ma tahan lugeda.");
    expect(tule && sentenceOf(tule, lugema)).toBe("Tule lugema!");
  });

  it("has a recording of every verb it asks about and every sentence a key plays", () => {
    const recorded = CLIPS.tegevusnimed ?? {};
    for (const { lead, said } of INFINITIVE_LEADS) {
      expect(recorded[clipId(lead)]).toBe(lead);
      expect(recorded[clipId(said)]).toBe(said);
    }
  });
});

describe("Mari’s message", () => {
  it("says what the passage recording says, gap by gap", () => {
    expect(MESSAGE_GAPS.map((gap) => gapLine(gap.before, gap.answer, gap.after))).toEqual([
      ...INFINITIVE_MESSAGE,
    ]);
  });

  it("wants the -ma form twice, the -da form twice and the present twice", () => {
    const kinds = MESSAGE_GAPS.map(({ answer }) =>
      answer.endsWith("ma") ? "ma" : ["juua", "lugeda"].includes(answer) ? "da" : "present",
    );
    expect(kinds.filter((kind) => kind === "ma")).toHaveLength(2);
    expect(kinds.filter((kind) => kind === "da")).toHaveLength(2);
    expect(kinds.filter((kind) => kind === "present")).toHaveLength(2);
  });
});
