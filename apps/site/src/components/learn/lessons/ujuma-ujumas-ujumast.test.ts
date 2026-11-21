import { describe, expect, it } from "vitest";
import {
  CLIPS,
  clipId,
  GOING_SORT,
  GOING_VERBS,
  GOING_VOICE,
  goingForm,
  goingSentence,
  WAYS,
} from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { HEARD } from "./UjumaUjumasUjumast";

const recorded = CLIPS["ujuma-ujumas-ujumast"] ?? {};

describe("“Going, out or back?”", () => {
  it("hears every activity in every way, and opens on neither the headline verb nor -ma", () => {
    expect(HEARD).toHaveLength(GOING_VERBS.length * WAYS.length);
    expect(HEARD[0]?.verb).not.toBe("ujuma");
    expect(HEARD[0]?.way).not.toBe("ma");
  });

  it("asks every ending in its first three rounds", () => {
    for (let run = 0; run < 100; run++) {
      const first = eachPairFirst(HEARD, run === 0 ? HEARD[0] : undefined).slice(0, 3);
      expect(new Set(first.map((item) => item.way))).toEqual(new Set(WAYS));
    }
  });

  it("plays each form alone, never in a sentence", () => {
    for (const { said } of HEARD) {
      expect(recorded[clipId(said)]).toBe(said);
      expect(said).not.toMatch(/\b(läheb|on|tuleb|lähen|olen|tulen|käin)\b/);
    }
  });
});

describe("the table of activities", () => {
  it("has a recording of Mari’s sentence for every form", () => {
    for (const verb of GOING_VERBS)
      for (const way of WAYS) {
        const said = goingSentence(verb, way);
        expect(said).toContain(goingForm(verb, way));
        expect(recorded[clipId(said)]).toBe(said);
      }
  });
});

describe("“Which question does it answer?”", () => {
  it("sorts three words into each question, one activity and two places", () => {
    for (const bin of ["kuhu", "kus", "kust"]) {
      const words = GOING_SORT.filter((item) => item.bin === bin).map((item) => item.w);
      expect(words).toHaveLength(3);
      const activities = words.filter((w) =>
        GOING_VERBS.some((verb) => WAYS.some((way) => goingForm(verb, way) === w)),
      );
      expect(activities).toHaveLength(1);
    }
  });
});

describe("Kati’s message", () => {
  it("is recorded as one passage in the second voice", () => {
    expect(recorded["p-voice"]).toEqual({ sentences: GOING_VOICE, voice: "second" });
  });
});
