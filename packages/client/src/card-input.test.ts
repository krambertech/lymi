import { describe, expect, it } from "vitest";
import { addInput, clearSent } from "./card-input";

describe("addInput", () => {
  it("marks typed text as the learner's and leaves empty fields out", () => {
    expect(
      addInput({
        deckId: "d1",
        term: "affrettarsi",
        meaning: "to hurry up",
        example: "",
        tags: [],
      }),
    ).toEqual({
      deckId: "d1",
      term: "affrettarsi",
      meaning: "to hurry up",
      meaningSource: "manual",
    });
  });

  it("sends chosen modes, the section and the language, and a deck's modes as nothing", () => {
    expect(
      addInput({
        deckId: "d1",
        term: "la sedia",
        reviewModes: ["meaning_to_term"],
        sectionId: "s1",
        language: "it",
        hint: "a seat",
      }),
    ).toEqual({
      deckId: "d1",
      term: "la sedia",
      language: "it",
      reviewModes: [{ cue: "meaning", target: "term" }],
      sectionId: "s1",
      hint: "a seat",
      hintSource: "manual",
    });
    expect(addInput({ deckId: "d1", term: "x", reviewModes: null })).not.toHaveProperty(
      "reviewModes",
    );
  });
});

describe("clearSent", () => {
  it("clears what was sent and keeps what was typed since", () => {
    const draft = { term: "la sedia", meaning: "the chair, seat", notes: "", source: "Lesson 12" };
    expect(
      clearSent(draft, { term: "la sedia", meaning: "the chair", source: "Lesson 12" }, ["source"]),
    ).toEqual({ term: "", meaning: "the chair, seat", notes: "", source: "Lesson 12" });
  });

  it("treats surrounding spaces as the same text", () => {
    expect(clearSent({ term: " kohv " }, { term: "kohv" })).toEqual({ term: "" });
  });
});
