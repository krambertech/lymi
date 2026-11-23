import { describe, expect, it } from "vitest";
import { endingPieces } from "./endings";

const endings = (text: string) =>
  endingPieces(text)
    .filter((piece) => piece.ending)
    .map((piece) => piece.text);

describe("endingPieces", () => {
  it("finds an ending written alone", () => {
    expect(endings("the -ma infinitive")).toEqual(["-ma"]);
    expect(endings("інфінітив на -da.")).toEqual(["-da"]);
  });

  it("keeps endings joined by a slash in one piece", () => {
    expect(endings("the -ma/-mas/-mast forms and -da/-ma")).toEqual(["-ma/-mas/-mast", "-da/-ma"]);
  });

  it("leaves hyphenated words and dashes alone", () => {
    expect(endings("e-post – Jah - ei")).toEqual([]);
  });

  it("gives the text back whole", () => {
    const text = "Both take the -da infinitive.";
    expect(
      endingPieces(text)
        .map((piece) => piece.text)
        .join(""),
    ).toBe(text);
  });
});
