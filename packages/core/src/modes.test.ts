import { describe, expect, it } from "vitest";
import {
  askedModes,
  directionsFromModes,
  effectiveModes,
  modeKey,
  modeOf,
  modeOfStateDirection,
  modesFromDirections,
  stateDirection,
} from "./modes";
import { GradeInput, ReviewMode, ReviewModeKey, ReviewModes } from "./types";

describe("review modes", () => {
  it("round-trips every key through its cue-target object", () => {
    for (const key of ReviewModeKey.options) expect(modeKey(modeOf(key))).toBe(key);
  });

  it("refuses a pairing that is not a mode, and a mode listed twice", () => {
    expect(ReviewMode.safeParse({ cue: "term", target: "term" }).success).toBe(false);
    const t2m = { cue: "term", target: "meaning" };
    expect(ReviewModes.safeParse([t2m, t2m]).success).toBe(false);
  });

  it("maps the legacy directions both ways", () => {
    for (const d of ["recognition", "production", "both"] as const) {
      expect(directionsFromModes(modesFromDirections(d))).toBe(d);
    }
    for (const key of ReviewModeKey.options) {
      expect(modeOfStateDirection(stateDirection(key))).toBe(key);
    }
  });

  it("stands a picture-only list's legacy direction in by target, and heals a stale list", () => {
    expect(directionsFromModes(["image_to_meaning"])).toBe("recognition");
    expect(directionsFromModes(["image_to_term", "image_to_meaning"])).toBe("both");
    expect(directionsFromModes(["image_to_meaning", "meaning_to_term"])).toBe("production");
    expect(effectiveModes("recognition", ["image_to_meaning"])).toEqual(["image_to_meaning"]);
    // An older Worker switched the card to production after the list was stored.
    expect(effectiveModes("production", ["image_to_term", "term_to_meaning"])).toEqual([
      "image_to_term",
      "meaning_to_term",
    ]);
  });

  it("asks picture modes only while the card has a picture", () => {
    expect(askedModes("both", null, true)).toEqual(["term_to_meaning", "meaning_to_term"]);
    expect(askedModes("recognition", ["image_to_meaning"], true)).toEqual(["image_to_meaning"]);
    expect(askedModes("recognition", ["image_to_meaning"], false)).toEqual(["term_to_meaning"]);
    expect(askedModes("production", ["image_to_term", "meaning_to_term"], false)).toEqual([
      "meaning_to_term",
    ]);
    expect(askedModes("production", ["image_to_term", "meaning_to_term"], true)).toEqual([
      "image_to_term",
      "meaning_to_term",
    ]);
  });

  it("accepts a legacy grade and a mode grade, and needs one of them", () => {
    expect(GradeInput.safeParse({ cardId: "c", direction: "production", rating: 3 }).success).toBe(
      true,
    );
    const mode = { cue: "meaning", target: "term" };
    expect(GradeInput.safeParse({ cardId: "c", mode, rating: 3 }).success).toBe(true);
    expect(GradeInput.safeParse({ cardId: "c", rating: 3 }).success).toBe(false);
  });
});
