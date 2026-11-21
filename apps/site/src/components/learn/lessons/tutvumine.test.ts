import { describe, expect, it } from "vitest";
import { KOHAD_PLACES } from "../../../lib/learn/clips";
import { KATI_GAPS, KATI_SPARE } from "./Tutvumine";

describe("Kati's note", () => {
  it("banks one place, so a place can't make a second gap right as well", () => {
    const places = new Set<string>(KOHAD_PLACES.map((each) => each.where));
    const bank = [...KATI_GAPS.map((gap) => gap.answer), ...KATI_SPARE];
    expect(bank.filter((word) => places.has(word))).toEqual(["tööl"]);
  });
});
