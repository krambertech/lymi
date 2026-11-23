import { describe, expect, it } from "vitest";
import { fixing, fixReducer, foundFirst, markFix, startFix } from "./fix";

const item = {
  kind: "fix",
  id: "tartus",
  wrong: "Ma elan Tartul.",
  answers: ["Ma elan Tartus."],
} as const;

describe("fixReducer", () => {
  it("opens the fix on the wrong word", () => {
    const state = fixReducer(startFix(2), { type: "tapped", word: 2 });
    expect(state).toEqual({ status: "fixing", at: 2, tried: [] });
    expect(foundFirst(state)).toBe(true);
  });

  it("keeps looking after a word that was right, and remembers it", () => {
    let state = fixReducer(startFix(2), { type: "tapped", word: 0 });
    expect(state).toEqual({ status: "finding", at: 2, tried: [0] });
    expect(fixReducer(state, { type: "tapped", word: 0 })).toBe(state);
    state = fixReducer(state, { type: "tapped", word: 1 });
    state = fixReducer(state, { type: "tapped", word: 2 });
    expect(state).toEqual({ status: "fixing", at: 2, tried: [0, 1] });
    expect(foundFirst(state)).toBe(false);
  });

  it("takes no more words once found", () => {
    const state = fixReducer(startFix(2), { type: "tapped", word: 2 });
    expect(fixReducer(state, { type: "tapped", word: 0 })).toBe(state);
  });
});

describe("marking a fix", () => {
  it("reads the word, its place and its right forms from the sentences", () => {
    expect(fixing(item)).toEqual({ at: 2, words: ["Ma", "elan", "Tartul."], forms: ["tartus"] });
    expect(
      fixing({
        ...item,
        wrong: "Ma ei olen siin.",
        answers: ["Ma ei ole siin.", "Ma ei ela siin."],
      }),
    ).toMatchObject({ at: 2, forms: ["ole", "ela"] });
  });

  it("marks the form alone", () => {
    expect(markFix(item, "tartus").verdict).toBe("right");
    expect(markFix(item, "Tartuss").verdict).toBe("almost");
    expect(markFix(item, "Tartu").verdict).toBe("wrong");
  });

  it("never takes the wrong word back as a slip", () => {
    const maja = {
      kind: "fix",
      id: "majja",
      wrong: "Kass läheb sõna.",
      answers: ["Kass läheb sõnna."],
    } as const;
    expect(markFix(maja, "sõna").verdict).toBe("wrong");
  });
});
