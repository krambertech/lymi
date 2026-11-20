import { describe, expect, it } from "vitest";
import { numberParts, numberWords } from "./estonian-numbers";

describe("numberWords", () => {
  it.each([
    [0, "null"],
    [7, "seitse"],
    [10, "kümme"],
    [11, "üksteist"],
    [19, "üheksateist"],
    [20, "kakskümmend"],
    [21, "kakskümmend üks"],
    [99, "üheksakümmend üheksa"],
    [100, "sada"],
    [150, "sada viiskümmend"],
    [200, "kakssada"],
    [365, "kolmsada kuuskümmend viis"],
    [1000, "tuhat"],
    [1918, "tuhat üheksasada kaheksateist"],
    [2026, "kaks tuhat kakskümmend kuus"],
    [4500, "neli tuhat viissada"],
    [12000, "kaksteist tuhat"],
  ])("says %i as %s", (n, words) => {
    expect(numberWords(n)).toBe(words);
  });

  it("marks the endings a lesson lights", () => {
    expect(
      numberParts(47)
        .filter((part) => part.ending)
        .map((part) => part.text),
    ).toEqual(["kümmend"]);
  });

  it("refuses what it can't say", () => {
    expect(() => numberWords(-1)).toThrow(RangeError);
    expect(() => numberWords(1.5)).toThrow(RangeError);
  });
});
