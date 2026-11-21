import { describe, expect, it } from "vitest";
import { MODAL_HEARD_KINDS } from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { firstKinds, HEARD, threeKinds } from "./Modaalverbid";

const keyed = HEARD.map((item) => ({
  ...item,
  pair: [item.kind, `${item.kind}-${item.verb.da}`] as const,
}));

describe("What does it say?", () => {
  it("asks each way once in a run of four", () => {
    for (let run = 0; run < 50; run++) {
      const asked = eachPairFirst(keyed, keyed[0])
        .slice(0, MODAL_HEARD_KINDS.length)
        .map((item) => item.kind);
      expect(new Set(asked)).toEqual(new Set(MODAL_HEARD_KINDS));
    }
  });

  it("offers the answer and two other ways", () => {
    for (const kind of MODAL_HEARD_KINDS)
      for (let run = 0; run < 20; run++) {
        const three = threeKinds(kind);
        expect(three).toContain(kind);
        expect(new Set(three).size).toBe(3);
      }
  });

  it("puts the first round's answer in every place across the items", () => {
    const places = HEARD.map(({ kind }, i) => firstKinds(kind, i).indexOf(kind));
    expect(new Set(places)).toEqual(new Set([0, 1, 2]));
    HEARD.forEach(({ kind }, i) => {
      expect(new Set(firstKinds(kind, i)).size).toBe(3);
    });
  });
});
