import { describe, expect, it } from "vitest";
import { numberWords } from "./estonian-numbers";
import { canonicalWords, compareWords, reportText, transcriptReport } from "./transcript";

const same = (text: string, heard: string) =>
  expect(canonicalWords(heard)).toEqual(canonicalWords(text));

describe("canonicalWords", () => {
  it("drops case and punctuation and keeps marked letters", () => {
    expect(canonicalWords("«Tere!» Mina olen Jaan…")).toEqual(["tere", "mina", "olen", "jaan"]);
    same("Õpetaja, jah?", "õpetaja jah");
  });

  it("reads a number the same in words and digits, up to the largest the course says", () => {
    for (const n of [0, 1, 10, 11, 19, 20, 22, 34, 99, 100, 101, 150, 365, 999, 1000, 1918, 2026])
      expect(canonicalWords(numberWords(n)), numberWords(n)).toEqual([String(n)]);
    same("kaksteist tuhat", "12 000");
    same("Aastas on kolmsada kuuskümmend viis päeva.", "Aastas on 365 päeva.");
  });

  it("reads declined numbers and ordinals", () => {
    same("Mul on aega kella kolmeni.", "Mul on aega kella 3-ni.");
    same("kella kolmeni", "kella 3ni");
    expect(canonicalWords("kahekümne viiel")).toEqual(["25"]);
    expect(canonicalWords("kahekümne kolmas")).toEqual(["23"]);
    expect(canonicalWords("kahteteist, viieteistkümnendal")).toEqual(["kahteteist", "15"]);
  });

  it("joins a number said digit by digit, as a phone number is", () => {
    same("Minu number on viis, kaks, null, üheksa, neli.", "Minu number on 5 20 94.");
    same("kell kümme kolmkümmend", "kell 10.30");
  });

  it("reads signs that are said as words", () => {
    same("Kohv maksab kolm eurot.", "Kohv maksab 3 €.");
    same("viiskümmend protsenti", "50%");
  });

  it("gives nothing for silence", () => {
    expect(canonicalWords(" … ")).toEqual([]);
  });
});

describe("compareWords", () => {
  it("counts changed, missing and added words", () => {
    const compared = compareWords(["ma", "elan", "tartus"], ["ma", "elan", "tartu", "linnas"]);
    expect(compared.wrong).toBe(2);
    expect(compared.rate).toBeCloseTo(2 / 3);
    expect(compared.steps.filter((step) => step.kind === "same").map((step) => step.word)).toEqual([
      "ma",
      "elan",
    ]);
  });

  it("keeps the words after a missing one matched", () => {
    expect(compareWords(["a", "b", "c", "d"], ["a", "c", "d"]).steps).toEqual([
      { kind: "same", word: "a" },
      { kind: "missing", word: "b" },
      { kind: "same", word: "c" },
      { kind: "same", word: "d" },
    ]);
  });

  it("handles a clip nothing was heard in", () => {
    expect(compareWords(["tere"], [])).toMatchObject({ wrong: 1, rate: 1 });
    expect(compareWords([], [])).toMatchObject({ wrong: 0, rate: 0 });
  });
});

describe("transcriptReport", () => {
  const report = transcriptReport([
    { name: "a/ok", text: "Ma elan Tartus.", heard: "ma elan tartus" },
    { name: "a/slip", text: "Ma elan Tartus ja töötan.", heard: "Ma elan Tartus ja tootan." },
    { name: "a/bad", text: "Ma elan Tartus.", heard: "Maelan tarkus" },
    { name: "a/word", text: "kõrv", heard: "korv" },
  ]);

  it("lists mismatches worst first and single words apart", () => {
    expect(report.checked).toBe(4);
    expect(report.mismatches.map((each) => each.name)).toEqual(["a/bad", "a/slip"]);
    expect(report.singleWords.map((each) => each.name)).toEqual(["a/word"]);
  });

  it("shows what the text says, what was heard and where they part", () => {
    const text = reportText(report);
    expect(text).toContain("a/slip** 20% (1 of 5)");
    expect(text).toContain("[-töötan-] {+tootan+}");
    expect(text.indexOf("a/bad")).toBeLessThan(text.indexOf("a/slip"));
    expect(text.indexOf("a/word")).toBeGreaterThan(text.indexOf("Single words"));
  });
});
