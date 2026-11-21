import { describe, expect, it } from "vitest";
import { MEELDIMA_MORE, MEELDIMA_NO, MEELDIMA_PERSONS } from "../../../lib/learn/clips";
import { firstPersons, litMore, litNo, threePersons } from "./Meeldima";

describe("meeldima quizzes", () => {
  it("offers the person heard and two others, in no fixed place", () => {
    const places = new Set<number>();
    for (let run = 0; run < 200; run++) {
      const three = threePersons("me");
      expect(new Set(three).size).toBe(3);
      expect(three).toContain("me");
      places.add(three.indexOf("me"));
    }
    expect(places.size).toBe(3);
  });

  it("puts each first-run answer among its options, in every place across the run", () => {
    const places = new Set<number>();
    MEELDIMA_PERSONS.forEach(({ id }, i) => {
      const options = firstPersons(i);
      expect(new Set(options).size).toBe(3);
      expect(options).toContain(id);
      places.add(options.indexOf(id));
    });
    expect(places.size).toBe(3);
  });
});

describe("meeldima switches", () => {
  it("lights -vad and the plural -d, and keeps the sentence whole", () => {
    expect(litMore("Mulle meeldivad kassid.")).toEqual([
      ["Mulle meeldi", false],
      ["vad", true],
      [" kassi", false],
      ["d", true],
      [".", false],
    ]);
    for (const { more } of MEELDIMA_MORE)
      expect(
        litMore(more)
          .map(([text]) => text)
          .join(""),
      ).toBe(more);
  });

  it("lights ei meeldi", () => {
    for (const { no } of MEELDIMA_NO) {
      const pieces = litNo(no);
      expect(pieces.map(([text]) => text).join("")).toBe(no);
      expect(pieces.filter(([, lit]) => lit).map(([text]) => text)).toEqual(["ei meeldi"]);
    }
  });
});
