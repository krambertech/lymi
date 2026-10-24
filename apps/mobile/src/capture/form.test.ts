import { describe, expect, it } from "vitest";
import {
  choicesPatch,
  EMPTY_FORM,
  editPatch,
  keptTranslationStale,
  pictureWrite,
  translationAfterExample,
} from "./form";

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

describe("an example's translation in Edit card", () => {
  const translated = {
    ...opened,
    example: "Ich esse Brot.",
    exampleTranslation: "I eat bread.",
  };
  const card = {
    example: "Ich esse Brot.",
    exampleTranslation: "I eat bread.",
    exampleTranslationSource: "ai" as const,
  };

  it("makes a rewritten translation the learner's", () => {
    expect(editPatch(translated, { exampleTranslation: "I'm eating bread." }, true)).toEqual({
      exampleTranslation: "I'm eating bread.",
      exampleTranslationSource: "manual",
    });
  });

  it("leaves the AI to translate a new example rather than clearing its translation", () => {
    expect(
      editPatch(translated, { example: "Ich trinke Tee.", exampleTranslation: "" }, true),
    ).toEqual({ example: "Ich trinke Tee.", exampleSource: "manual" });
  });

  it("clears a person's translation emptied beside a new example", () => {
    expect(editPatch(translated, { example: "Ich trinke Tee.", exampleTranslation: "" })).toEqual({
      example: "Ich trinke Tee.",
      exampleSource: "manual",
      exampleTranslation: "",
    });
  });

  it("keeps no translation without an example", () => {
    expect(editPatch(opened, { exampleTranslation: "I eat bread." })).toEqual({});
  });

  it("clears the AI's translation from the form for a new example and restores it for the old one", () => {
    expect(translationAfterExample(card, "Ich trinke Tee.", "I eat bread.")).toBe("");
    expect(translationAfterExample(card, "Ich esse Brot. ", "")).toBe("I eat bread.");
    // Readings added to the same sentence leave its translation current.
    expect(translationAfterExample(card, "Ich esse Brot[bro:t].", "I eat bread.")).toBeUndefined();
    expect(translationAfterExample(card, "Ich trinke Tee.", "I drink tea.")).toBeUndefined();
    expect(
      translationAfterExample(
        { ...card, exampleTranslationSource: "manual" },
        "Ich trinke Tee.",
        "I eat bread.",
      ),
    ).toBeUndefined();
  });

  it("says as the example changes that the learner's translation would be kept for the old one", () => {
    const theirs = {
      ...card,
      exampleTranslationSource: "manual" as const,
      exampleTranslationStale: false,
    };
    expect(keptTranslationStale(theirs, "Ich trinke Tee.", "I eat bread.")).toBe(true);
    // Typed back, or with only a reading added, the translation fits again.
    expect(keptTranslationStale(theirs, "Ich esse Brot.", "I eat bread.")).toBe(false);
    expect(keptTranslationStale(theirs, "Ich esse Brot[bro:t].", "I eat bread.")).toBe(false);
    // A new translation, or none, is not the old one.
    expect(keptTranslationStale(theirs, "Ich trinke Tee.", "I drink tea.")).toBe(false);
    expect(keptTranslationStale(theirs, "Ich trinke Tee.", "")).toBe(false);
    // The AI writes its own again, so nothing is kept.
    expect(
      keptTranslationStale(
        { ...theirs, exampleTranslationSource: "ai" },
        "Ich trinke Tee.",
        "I eat bread.",
      ),
    ).toBe(false);
    // Already stale, it stays marked under its unchanged example.
    expect(
      keptTranslationStale(
        { ...theirs, exampleTranslationStale: true },
        "Ich esse Brot.",
        "I eat bread.",
      ),
    ).toBe(true);
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
