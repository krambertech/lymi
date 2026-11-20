import { describe, expect, it } from "vitest";
import { KOHAD_PLACES, TUTVUMINE_PASSAGES } from "../../../lib/learn/clips";
import { gapLine } from "../../../lib/learn/passage";
import { KATI_GAPS, KATI_SPARE } from "./Tutvumine";

describe("Kati's note", () => {
  it("spells the recorded passage once every gap holds its answer", () => {
    const filled = KATI_GAPS.map((gap) => gapLine(gap.before, gap.answer, gap.after)).join(" ");
    expect(filled).toBe(TUTVUMINE_PASSAGES.kati.join(" "));
  });

  it("banks one place, so a place can't make a second gap right as well", () => {
    const places = new Set<string>(KOHAD_PLACES.map((each) => each.where));
    const bank = [...KATI_GAPS.map((gap) => gap.answer), ...KATI_SPARE];
    expect(bank.filter((word) => places.has(word))).toEqual(["tööl"]);
  });
});
