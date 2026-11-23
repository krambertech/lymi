import { describe, expect, it } from "vitest";
import {
  formText,
  type MorphPart,
  morph,
  splitForm,
  type TurnPart,
  timelinePlaces,
  turn,
} from "./forms";

/** A morph written compactly: kept letters bare, [dropped], {added}. */
const show = (parts: MorphPart[]) =>
  parts
    .map(({ text, kind }) =>
      kind === "kept" ? text : kind === "dropped" ? `[${text}]` : `{${text}}`,
    )
    .join("");

describe("splitForm", () => {
  it("lights what comes after the bar", () => {
    expect(splitForm("maja|des")).toEqual({ stem: "maja", ending: "des" });
    expect(splitForm("loe|n")).toEqual({ stem: "loe", ending: "n" });
  });

  it("lights nothing without a bar", () => {
    expect(splitForm("maja")).toEqual({ stem: "maja", ending: "" });
  });

  it("says the form without its bar", () => {
    expect(formText("söö|nud")).toBe("söönud");
    expect(formText("maja")).toBe("maja");
  });
});

describe("morph", () => {
  it("drops before it adds where letters are swapped", () => {
    expect(show(morph("pood", "poe"))).toBe("po[od]{e}");
    expect(show(morph("tuba", "toa"))).toBe("t[ub]{o}a");
  });

  it("only adds an ending", () => {
    expect(show(morph("poe", "poes"))).toBe("poe{s}");
  });

  it("drops a letter and brings it back", () => {
    expect(show(morph("jalg", "jala"))).toBe("jal[g]{a}");
    expect(show(morph("jala", "jalga"))).toBe("jal{g}a");
  });

  it("keeps the letters a verb's stem shares", () => {
    expect(show(morph("lugema", "loen"))).toBe("l[ug]{o}e[ma]{n}");
    expect(show(morph("lugema", "lugeda"))).toBe("luge[m]{d}a");
  });

  it("keeps every letter of the same word", () => {
    expect(morph("maja", "maja")).toEqual([{ text: "maja", kind: "kept" }]);
  });

  it("spells both words back", () => {
    for (const [from, to] of [
      ["pood", "poe"],
      ["lugema", "loen"],
      ["süüa", "söön"],
      ["", "maja"],
    ] as const) {
      const parts = morph(from, to);
      const of = (kinds: string[]) =>
        parts
          .filter((part) => kinds.includes(part.kind))
          .map((part) => part.text)
          .join("");
      expect(of(["kept", "dropped"])).toBe(from);
      expect(of(["kept", "added"])).toBe(to);
    }
  });
});

describe("timelinePlaces", () => {
  it("puts the ends at the margins and the rest in proportion", () => {
    expect(timelinePlaces([-2, -1, 0, 2], 10)).toEqual([10, 30, 50, 90]);
  });

  it("centres a single point", () => {
    expect(timelinePlaces([0])).toEqual([50]);
  });
});

describe("turn", () => {
  const lit = (parts: TurnPart[]) =>
    parts
      .map((part) =>
        part.kind === "dropped" ? `[${part.text}]` : part.lit ? `<${part.text}>` : part.text,
      )
      .join("");

  it("lights the ending of the form it arrives at, whether kept or added", () => {
    expect(lit(turn("raamatu|s", "toa|s"))).toBe("[raama]t[u]oa<s>");
    expect(lit(turn("luge|sin", "sõi|n"))).toBe("[luge]sõi<n>");
  });

  it("leaves the new form when its dropped letters are gone", () => {
    for (const [from, to] of [
      ["lugema|s", "sööma|s"],
      ["ei luge|nud", "ei läi|nud"],
      ["tuba", "sõpra"],
    ] as const)
      expect(
        turn(from, to)
          .filter((part) => part.kind !== "dropped")
          .map((part) => part.text)
          .join(""),
      ).toBe(formText(to));
  });
});
