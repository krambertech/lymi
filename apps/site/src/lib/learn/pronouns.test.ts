import { describe, expect, it } from "vitest";
import { withPronouns } from "./pronouns";

describe("withPronouns", () => {
  it("adds the long pronoun and the sentence without it", () => {
    expect(withPronouns(["Täna lähen ma Tartusse."])).toEqual([
      "Täna lähen ma Tartusse.",
      "Täna lähen mina Tartusse.",
      "Täna lähen Tartusse.",
    ]);
  });

  it("capitalises the new first word and swaps a capital pronoun", () => {
    expect(withPronouns(["Ma töötan hommikul."])).toEqual([
      "Ma töötan hommikul.",
      "Mina töötan hommikul.",
      "Töötan hommikul.",
    ]);
  });

  it("keeps the pronoun beside ei, where the verb does not show the person", () => {
    expect(withPronouns(["Täna me ei tööta."])).toEqual([
      "Täna me ei tööta.",
      "Täna meie ei tööta.",
    ]);
  });

  it("swaps but never drops ta or nad, whose verb could be anybody's", () => {
    expect(withPronouns(["Ta töötab hommikul.", "Nad elavad Tartus."])).toEqual([
      "Ta töötab hommikul.",
      "Nad elavad Tartus.",
      "Tema töötab hommikul.",
      "Nemad elavad Tartus.",
    ]);
  });

  it("leaves a pronoun on its own alone and keeps a joined one", () => {
    expect(withPronouns(["Ma ja Mari läheme.", "Kes tuli? Mina."])).toEqual([
      "Ma ja Mari läheme.",
      "Kes tuli? Mina.",
      "Mina ja Mari läheme.",
    ]);
  });

  it("does not repeat a sentence already listed", () => {
    expect(withPronouns(["Kus sa elad?", "Kus elad?"])).toEqual([
      "Kus sa elad?",
      "Kus elad?",
      "Kus sina elad?",
    ]);
  });
});
