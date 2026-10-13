import { describe, expect, it } from "vitest";
import { EMPTY_FORM, editPatch } from "./form";

const opened = { ...EMPTY_FORM, term: "sbrigarsi", meaning: "", notes: "" };

describe("saving Edit card", () => {
  it("sends only the field typed in when enrichment fills others meanwhile", () => {
    const enriched = { ...opened, meaning: "to hurry up", example: "Sbrigati!" };
    expect(editPatch(enriched, { notes: "Reflexive" })).toEqual({
      notes: "Reflexive",
      notesSource: "manual",
    });
  });

  it("keeps another device's change to a field the learner left alone", () => {
    const remote = { ...opened, meaning: "to rush" };
    expect(editPatch(remote, {})).toEqual({});
  });

  it("clears a field the learner emptied, but never the term", () => {
    const card = { ...opened, example: "Sbrigati!", hook: "sbrigo" };
    expect(editPatch(card, { example: " ", hook: "", term: "" })).toEqual({
      example: "",
      exampleSource: "manual",
      hook: "",
    });
  });

  it("sends nothing for text typed back to what the card holds", () => {
    expect(editPatch({ ...opened, meaning: "to hurry up" }, { meaning: "to hurry up " })).toEqual(
      {},
    );
  });
});
