import { describe, expect, it } from "vitest";
import { CLIPS, clipId, PHONE_HEARD } from "../../../lib/learn/clips";
import { heardRun } from "./Telefonikone";

const items = PHONE_HEARD.map(({ said, when }) => ({
  said,
  src: said,
  answer: when,
  options: [
    { id: "past", label: "past" },
    { id: "future", label: "future" },
  ],
  pair: [when, said] as const,
}));

describe("past or future quiz", () => {
  it("hears a past and a future sentence before any repeats", () => {
    for (let run = 0; run < 200; run++) {
      const kinds = heardRun(items, items[0])
        .slice(0, 2)
        .map((item) => item.pair[0]);
      expect(new Set(kinds)).toEqual(new Set(["past", "future"]));
    }
  });

  it("puts the answer in either place after the first round", () => {
    const places = new Set<number>();
    for (let run = 0; run < 200; run++)
      for (const item of heardRun(items, items[0]).slice(1))
        places.add(item.options.findIndex((option) => option.id === item.answer));
    expect(places).toEqual(new Set([0, 1]));
  });

  it("keeps the first round as the page rendered it", () => {
    expect(heardRun(items, items[0])[0]).toBe(items[0]);
  });

  it("has a recording for every sentence it plays", () => {
    const recorded = CLIPS.telefonikone ?? {};
    for (const { said } of PHONE_HEARD) expect(recorded[clipId(said)]).toBe(said);
  });
});
