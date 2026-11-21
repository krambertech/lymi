import { describe, expect, it } from "vitest";
import {
  formMatches,
  insertAt,
  letterChanges,
  lineReducer,
  matchDone,
  matchReducer,
  matchResults,
  normalizeForm,
  onlyMarksDiffer,
  orderMatches,
  orderProblems,
  orderTiles,
  sentenceEnd,
  sentenceWords,
  sortReducer,
  sortResults,
  startMatch,
  startSort,
} from "./practice";

describe("sortReducer", () => {
  const bins = { koolis: "s", laual: "l", turul: "l" };
  it("picks, places, moves and takes back a word, and puts a picked word down on a second tap", () => {
    let state = startSort(["koolis", "laual", "turul"]);
    state = sortReducer(state, { type: "picked", item: "koolis" });
    expect(state.picked).toBe("koolis");
    expect(sortReducer(state, { type: "picked", item: "koolis" }).picked).toBeNull();
    state = sortReducer(state, { type: "placed", item: "koolis", bin: "l" });
    expect(state).toMatchObject({ picked: null, places: { koolis: "l" } });
    state = sortReducer(state, { type: "placed", item: "koolis", bin: "s" });
    expect(state.places).toEqual({ koolis: "s" });
    state = sortReducer(state, { type: "placed", item: "koolis", bin: null });
    expect(state.places).toEqual({});
  });

  it("checks only once every word is placed, then marks each and takes no more moves", () => {
    let state = startSort(["koolis", "laual", "turul"]);
    state = sortReducer(state, { type: "placed", item: "koolis", bin: "s" });
    state = sortReducer(state, { type: "placed", item: "laual", bin: "s" });
    expect(sortReducer(state, { type: "checked" })).toBe(state);
    state = sortReducer(state, { type: "placed", item: "turul", bin: "l" });
    state = sortReducer(state, { type: "checked" });
    expect(state.checked).toBe(true);
    expect(sortResults(state, bins)).toEqual([true, false, true]);
    expect(sortReducer(state, { type: "placed", item: "laual", bin: "l" })).toBe(state);
    expect(sortReducer(state, { type: "restarted", items: ["turul", "laual", "koolis"] })).toEqual(
      startSort(["turul", "laual", "koolis"]),
    );
  });
});

describe("matchReducer", () => {
  it("locks a pair on a right try and counts a wrong one against the side tapped first", () => {
    let state = startMatch(2);
    state = matchReducer(state, { type: "chose", side: "left", id: "kus" });
    state = matchReducer(state, { type: "chose", side: "right", id: "kuhu" });
    expect(state).toMatchObject({
      mistakes: 1,
      missed: ["kus"],
      wrong: { left: "kus", right: "kuhu" },
      chosen: null,
    });
    state = matchReducer(state, { type: "cleared" });
    expect(state.wrong).toBeNull();
    state = matchReducer(state, { type: "chose", side: "right", id: "kus" });
    state = matchReducer(state, { type: "chose", side: "left", id: "kus" });
    expect(state.matched).toEqual(["kus"]);
    // A matched pair takes no more taps.
    expect(matchReducer(state, { type: "chose", side: "left", id: "kus" })).toBe(state);
    state = matchReducer(state, { type: "chose", side: "right", id: "kuhu" });
    state = matchReducer(state, { type: "chose", side: "left", id: "kuhu" });
    expect(matchDone(state)).toBe(true);
    expect(matchResults(state, ["kus", "kuhu"])).toEqual([false, true]);
  });

  it("swaps the chosen item on its own side and lets it go on a second tap", () => {
    let state = matchReducer(startMatch(2), { type: "chose", side: "left", id: "a" });
    state = matchReducer(state, { type: "chose", side: "left", id: "b" });
    expect(state.chosen).toEqual({ side: "left", id: "b" });
    state = matchReducer(state, { type: "chose", side: "left", id: "b" });
    expect(state.chosen).toBeNull();
    expect(state.mistakes).toBe(0);
  });

  it("counts a pair once in missed however many times it is wrong", () => {
    let state = startMatch(3);
    for (const right of ["b", "c"]) {
      state = matchReducer(state, { type: "chose", side: "left", id: "a" });
      state = matchReducer(state, { type: "chose", side: "right", id: right });
    }
    expect(state).toMatchObject({ mistakes: 2, missed: ["a"] });
    expect(matchResults(state, ["a", "b", "c"])).toEqual([undefined, undefined, undefined]);
  });
});

describe("order", () => {
  it("splits a sentence into words without commas or its end mark", () => {
    expect(sentenceWords("Ma tean, et sa elad Tartus.")).toEqual([
      "Ma",
      "tean",
      "et",
      "sa",
      "elad",
      "Tartus",
    ]);
    expect(sentenceEnd("Kus sa elad?")).toBe("?");
    expect(sentenceEnd("Ma elan Tallinnas")).toBe(".");
  });

  it("lowercases the first tile unless another answer shows it is a name", () => {
    expect(orderTiles(["Ma elan Tallinnas.", "Tallinnas ma elan."])).toEqual([
      "ma",
      "elan",
      "Tallinnas",
    ]);
    expect(orderTiles(["Tallinnas ma elan.", "Ma elan Tallinnas."], ["elab"])).toEqual([
      "Tallinnas",
      "ma",
      "elan",
      "elab",
    ]);
  });

  it("accepts every listed order and nothing else, whatever the case", () => {
    const answers = ["Ma elan Tallinnas.", "Tallinnas ma elan."];
    expect(orderMatches(["ma", "elan", "Tallinnas"], answers)).toBe(true);
    expect(orderMatches(["Tallinnas", "ma", "elan"], answers)).toBe(true);
    expect(orderMatches(["elan", "ma", "Tallinnas"], answers)).toBe(false);
    expect(orderMatches([], answers)).toBe(false);
  });

  it("finds answers that use other words and tiles that miss one", () => {
    expect(orderProblems(["Ma elan Tallinnas.", "Tallinnas ma elan."])).toEqual([]);
    expect(orderProblems(["Ma elan Tallinnas.", "Tallinnas elab ma."])).toHaveLength(1);
    expect(orderProblems(["Ma elan Tallinnas."], ["ma", "elan"])).toEqual([
      'no tile for "Tallinnas"',
    ]);
  });

  it("adds, removes and moves tiles in the line", () => {
    let line = lineReducer([], { type: "added", tile: 2 });
    line = lineReducer(line, { type: "added", tile: 0 });
    line = lineReducer(line, { type: "added", tile: 1, at: 1 });
    expect(line).toEqual([2, 1, 0]);
    expect(lineReducer(line, { type: "added", tile: 1 })).toBe(line);
    line = lineReducer(line, { type: "moved", tile: 2, to: 2 });
    expect(line).toEqual([1, 0, 2]);
    line = lineReducer(line, { type: "moved", tile: 2, to: 0 });
    expect(line).toEqual([2, 1, 0]);
    line = lineReducer(line, { type: "removed", tile: 1 });
    expect(line).toEqual([2, 0]);
    expect(lineReducer(line, { type: "cleared" })).toEqual([]);
  });
});

describe("form", () => {
  it("reads case, spaces, quotes and a full stop the way a learner means them", () => {
    expect(normalizeForm("  Poes. ")).toBe("poes");
    expect(formMatches("POES", ["poes"])).toBe(true);
    expect(formMatches("poodi", ["poodi", "poesse"])).toBe(true);
    expect(formMatches("poesse", ["poodi", "poesse"])).toBe(true);
    expect(formMatches("pood", ["poes"])).toBe(false);
    expect(formMatches(" ", [""])).toBe(false);
    // A decomposed õ, as some keyboards type it, is the same letter.
    expect(formMatches("õhtul", ["õhtul"])).toBe(true);
  });

  it("notices an answer wrong only in its marks", () => {
    expect(onlyMarksDiffer("kae", ["käe"])).toBe(true);
    expect(onlyMarksDiffer("ohtul", ["õhtul"])).toBe(true);
    expect(onlyMarksDiffer("käe", ["käe"])).toBe(false);
    expect(onlyMarksDiffer("kää", ["käe"])).toBe(false);
  });

  it("lights the letters that changed", () => {
    expect(letterChanges("pood", "poes")).toEqual({
      base: [
        { text: "po", changed: false },
        { text: "od", changed: true },
      ],
      form: [
        { text: "po", changed: false },
        { text: "es", changed: true },
      ],
    });
    expect(letterChanges("tuba", "toas").form).toEqual([
      { text: "t", changed: false },
      { text: "o", changed: true },
      { text: "a", changed: false },
      { text: "s", changed: true },
    ]);
    expect(letterChanges("Tallinn", "Tallinnas").form).toEqual([
      { text: "Tallinn", changed: false },
      { text: "as", changed: true },
    ]);
    expect(letterChanges("jalg", "jala").base).toEqual([
      { text: "jal", changed: false },
      { text: "g", changed: true },
    ]);
  });

  it("puts a letter at the caret, over any selection", () => {
    expect(insertAt("kae", "ä", 1, 2)).toEqual({ value: "käe", caret: 2 });
    expect(insertAt("k", "ä", null, null)).toEqual({ value: "kä", caret: 2 });
  });
});
