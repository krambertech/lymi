import { describe, expect, it } from "vitest";
import { orderProblems } from "../../../lib/learn/checks/order";
import { CLIPS, clipId, INFINITIVE_LEADS, INFINITIVE_MESSAGE } from "../../../lib/learn/clips";
import { gapLine } from "../../../lib/learn/passage";
import { BUILT, MESSAGE_GAPS, SORTED } from "./Tegevusnimed";

describe("“Sort the verbs”", () => {
  it("sorts five verbs of each kind", () => {
    const takes = SORTED.map((lead) => INFINITIVE_LEADS.find((each) => each.lead === lead)?.takes);
    expect(takes.filter((each) => each === "da")).toHaveLength(5);
    expect(takes.filter((each) => each === "ma")).toHaveLength(5);
  });

  it("has a recording of every verb it sorts and every sentence a key plays", () => {
    const recorded = CLIPS.tegevusnimed ?? {};
    for (const { lead, said } of INFINITIVE_LEADS) {
      expect(recorded[clipId(lead)]).toBe(lead);
      expect(recorded[clipId(said)]).toBe(said);
    }
  });
});

describe("“Build the sentence”", () => {
  it("accepts orders made of the same words, and keeps the wrong form out", () => {
    for (const { answers, spare } of BUILT) {
      expect(orderProblems(answers)).toEqual([]);
      for (const tile of spare) expect(answers[0]?.split(/[\s.]+/)).not.toContain(tile);
    }
  });

  it("plays a recording of each sentence", () => {
    const recorded = CLIPS.tegevusnimed ?? {};
    for (const { answers } of BUILT) expect(recorded[clipId(answers[0])]).toBe(answers[0]);
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
