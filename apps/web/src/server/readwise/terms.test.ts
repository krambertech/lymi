import { describe, expect, it } from "vitest";
import { noteText, termOf } from "./terms";

describe("a highlight's term", () => {
  it("takes a few highlighted words as written, without the punctuation around them", () => {
    expect(termOf({ text: "  «di sfuggita», " })).toEqual({
      kind: "term",
      term: "di sfuggita",
      example: null,
      notes: null,
    });
  });

  it("leaves a passage for the reader", () => {
    expect(termOf({ text: "Mi guardò e tornò al suo caffè, come se niente fosse." })).toEqual({
      kind: "passage",
    });
  });

  it("lets a note name the term and keeps the passage's sentence that holds it", () => {
    expect(
      termOf({
        text: "Era tardi. La pioggia batteva sui vetri della cucina. Nessuno parlava.",
        note: ".lymi vetri",
      }),
    ).toEqual({
      kind: "term",
      term: "vetri",
      example: "La pioggia batteva sui vetri della cucina.",
      notes: null,
    });
  });

  it("keeps a longer note on a word as the card's notes", () => {
    expect(termOf({ text: "aknaklaas", note: "seen on page twelve, in the storm" })).toEqual({
      kind: "term",
      term: "aknaklaas",
      example: null,
      notes: "seen on page twelve, in the storm",
    });
  });

  it("measures writing without spaces in characters", () => {
    expect(termOf({ text: "食べ物" })).toMatchObject({ kind: "term", term: "食べ物" });
    expect(termOf({ text: "毎朝パンを食べてから駅まで歩いて行きます。" })).toEqual({
      kind: "passage",
    });
  });

  it("reads a note of tags alone as no note", () => {
    expect(noteText(".lymi .h1")).toBe("");
    expect(termOf({ text: "sbadigliare", note: ".lymi" })).toMatchObject({ notes: null });
  });
});
