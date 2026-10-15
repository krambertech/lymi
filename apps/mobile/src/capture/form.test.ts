import { describe, expect, it } from "vitest";
import { choicesPatch, EMPTY_FORM, editPatch, pictureWrite } from "./form";

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

describe("Edit card's choices", () => {
  const card = { reviewModes: null, tags: ["noun"], image: null };

  it("sends modes and tags only once chosen and changed", () => {
    expect(choicesPatch(card, undefined, undefined)).toEqual({});
    expect(choicesPatch(card, null, ["noun"])).toEqual({});
    expect(choicesPatch(card, ["image_to_term"], ["noun", "city"])).toEqual({
      tags: ["noun", "city"],
      reviewModes: [{ cue: "image", target: "term" }],
    });
  });

  it("archives, uploads or redescribes the picture as the form left it", () => {
    const kept = { uri: "/img", name: "", type: "", description: "a sign", kept: true };
    const pictured = { image: { description: "a sign" } } as Parameters<typeof pictureWrite>[0];
    expect(pictureWrite(card, undefined)).toBeNull();
    expect(pictureWrite(card, null)).toBeNull();
    expect(pictureWrite(pictured, null)).toEqual({ kind: "archive" });
    expect(pictureWrite(pictured, kept)).toBeNull();
    expect(pictureWrite(pictured, { ...kept, description: " " })).toEqual({
      kind: "describe",
      description: null,
    });
    const fresh = { uri: "file:///a.jpg", name: "a.jpg", type: "image/jpeg", description: "" };
    expect(pictureWrite(pictured, fresh)).toEqual({ kind: "upload", picture: fresh });
  });
});
