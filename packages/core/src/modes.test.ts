import { describe, expect, it } from "vitest";
import {
  directionsFromModes,
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

  it("accepts a legacy grade and a mode grade, and needs one of them", () => {
    expect(GradeInput.safeParse({ cardId: "c", direction: "production", rating: 3 }).success).toBe(
      true,
    );
    const mode = { cue: "meaning", target: "term" };
    expect(GradeInput.safeParse({ cardId: "c", mode, rating: 3 }).success).toBe(true);
    expect(GradeInput.safeParse({ cardId: "c", rating: 3 }).success).toBe(false);
  });
});
