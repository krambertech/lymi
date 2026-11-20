import { describe, expect, it } from "vitest";
import { CLIPS, clipId } from "../../../lib/learn/clips";
import { eachPairFirst } from "../../../lib/learn/quiz";
import { ASKED, HEARD, heardAs, litEndings, threeCommands } from "./Kaskiv";

describe("commands quizzes", () => {
  it("offers the answer and two other commands, in no fixed place", () => {
    const places = new Set<number>();
    for (let run = 0; run < 200; run++) {
      const three = threeCommands("Kuula!");
      expect(new Set(three).size).toBe(3);
      expect(three).toContain("Kuula!");
      places.add(three.indexOf("Kuula!"));
    }
    expect(places.size).toBe(3);
  });

  it("hears a do, a don't and a not early in every run of “Do, don't or not?”", () => {
    for (let run = 0; run < 200; run++) {
      const kinds = eachPairFirst(HEARD, HEARD[0])
        .slice(0, 3)
        .map((item) => item.pair[0]);
      expect(new Set(kinds)).toEqual(new Set(["do", "dont", "not"]));
    }
  });

  it("says each stem three ways", () => {
    expect(["do", "dont", "not"].map((kind) => heardAs("istu", kind as never))).toEqual([
      "Istu!",
      "Ära istu!",
      "Ma ei istu.",
    ]);
  });

  it("has a recording for every command it plays", () => {
    const recorded = CLIPS.kaskiv ?? {};
    for (const said of [...ASKED, ...HEARD.map((item) => item.said)])
      expect(recorded[clipId(said)]).toBe(said);
  });
});

describe("commands to more than one", () => {
  it("lights each -ge and -ke, ärge included", () => {
    expect(litEndings("Ärge lugege!")).toEqual([
      ["Är", false],
      ["ge", true],
      [" luge", false],
      ["ge", true],
      ["!", false],
    ]);
    expect(litEndings("Tulge siia!").map(([text]) => text)).toEqual(["Tul", "ge", " siia!"]);
    expect(litEndings("Oodake!")).toEqual([
      ["Ooda", false],
      ["ke", true],
      ["!", false],
    ]);
  });
});
