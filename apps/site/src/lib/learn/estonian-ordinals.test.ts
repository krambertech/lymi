import { describe, expect, it } from "vitest";
import {
  dateMatches,
  ordinalOn,
  ordinalParts,
  ordinalWords,
  writtenDate,
} from "./estonian-ordinals";

const CHECKED: readonly (readonly [number, string, string])[] = [
  [1, "esimene", "esimesel"],
  [2, "teine", "teisel"],
  [3, "kolmas", "kolmandal"],
  [4, "neljas", "neljandal"],
  [5, "viies", "viiendal"],
  [6, "kuues", "kuuendal"],
  [7, "seitsmes", "seitsmendal"],
  [8, "kaheksas", "kaheksandal"],
  [9, "üheksas", "üheksandal"],
  [10, "kümnes", "kümnendal"],
  [11, "üheteistkümnes", "üheteistkümnendal"],
  [12, "kaheteistkümnes", "kaheteistkümnendal"],
  [13, "kolmeteistkümnes", "kolmeteistkümnendal"],
  [14, "neljateistkümnes", "neljateistkümnendal"],
  [15, "viieteistkümnes", "viieteistkümnendal"],
  [16, "kuueteistkümnes", "kuueteistkümnendal"],
  [17, "seitsmeteistkümnes", "seitsmeteistkümnendal"],
  [18, "kaheksateistkümnes", "kaheksateistkümnendal"],
  [19, "üheksateistkümnes", "üheksateistkümnendal"],
  [20, "kahekümnes", "kahekümnendal"],
  [21, "kahekümne esimene", "kahekümne esimesel"],
  [22, "kahekümne teine", "kahekümne teisel"],
  [23, "kahekümne kolmas", "kahekümne kolmandal"],
  [24, "kahekümne neljas", "kahekümne neljandal"],
  [25, "kahekümne viies", "kahekümne viiendal"],
  [26, "kahekümne kuues", "kahekümne kuuendal"],
  [27, "kahekümne seitsmes", "kahekümne seitsmendal"],
  [28, "kahekümne kaheksas", "kahekümne kaheksandal"],
  [29, "kahekümne üheksas", "kahekümne üheksandal"],
  [30, "kolmekümnes", "kolmekümnendal"],
  [31, "kolmekümne esimene", "kolmekümne esimesel"],
  [40, "neljakümnes", "neljakümnendal"],
  [99, "üheksakümne üheksas", "üheksakümne üheksandal"],
];

describe("Estonian ordinals", () => {
  it.each(CHECKED)("says %i as %s, and on the %i as %s", (n, word, on) => {
    expect(ordinalWords(n)).toBe(word);
    expect(ordinalOn(n)).toBe(on);
  });

  it("lights the part that makes the number an ordinal", () => {
    expect(ordinalParts(4)).toEqual([{ text: "nelja" }, { text: "s", ending: true }]);
    expect(ordinalParts(3)).toEqual([{ text: "kolm" }, { text: "as", ending: true }]);
    expect(ordinalParts(1)).toEqual([{ text: "esimene", ending: true }]);
    expect(ordinalParts(21)).toEqual([{ text: "kahekümne " }, { text: "esimene", ending: true }]);
  });

  it("has no ordinal below one or past ninety-nine", () => {
    expect(() => ordinalWords(0)).toThrow(RangeError);
    expect(() => ordinalWords(100)).toThrow(RangeError);
    expect(() => ordinalWords(2.5)).toThrow(RangeError);
  });

  it("writes a date with the day's full stop and a small month", () => {
    expect(writtenDate(21, 11)).toBe("21. november");
    expect(writtenDate(1, 5)).toBe("1. mai");
  });
});

describe("a typed date", () => {
  it.each([
    "1. mai",
    "1. mail",
    "1 mai",
    "1.5",
    "1,5",
    "01.05",
    "1.5.",
    "1.05.2026",
    "1 May",
    "May 1",
    "may 1st",
    "1st of May",
    "the 1st of May",
    "5/1",
    "1/5",
    "1 травня",
    "1 мая",
    "1-го мая",
    "1 Mai",
    "  1.   mai ",
  ])("counts %j for 1 May", (typed) => {
    expect(dateMatches(typed, 1, 5)).toBe(true);
  });

  it.each(["24. veebruar", "24.02", "24 February", "Feb 24", "24 лютого", "24 февраля", "2/24"])(
    "counts %j for 24 February",
    (typed) => {
      expect(dateMatches(typed, 24, 2)).toBe(true);
    },
  );

  it("tells juuni from juuli", () => {
    expect(dateMatches("6. juuni", 6, 6)).toBe(true);
    expect(dateMatches("6. juuli", 6, 6)).toBe(false);
    expect(dateMatches("6. juulil", 6, 7)).toBe(true);
  });

  it.each(["5.1", "1. juuni", "11. mai", "1", "mai", "1 2 mai", "", "1. mai ja 2. juuni"])(
    "doesn't count %j for 1 May",
    (typed) => {
      expect(dateMatches(typed, 1, 5)).toBe(false);
    },
  );

  it("reads digits day first, as Estonian writes them", () => {
    expect(dateMatches("4.12", 12, 4)).toBe(false);
    expect(dateMatches("12.4", 12, 4)).toBe(true);
  });
});
