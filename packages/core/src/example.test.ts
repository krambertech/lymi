import { describe, expect, it } from "vitest";
import {
  EXAMPLE_LENGTH,
  exampleFingerprint,
  fitsExample,
  shownLength,
  shownTranslation,
  translationStale,
} from "./example";
import { fitFields } from "./import";
import { CardInput } from "./types";

describe("an example's length", () => {
  it("counts what a reader sees, not readings or stress marks", () => {
    expect(shownLength("毎朝[まいあさ]パンを食[た]べます。")).toBe(10);
    expect(shownLength("Я люблю́ за́мок.")).toBe(14);
  });

  it("lets a Japanese sentence with readings use the same room as a German one", () => {
    const japanese = "食[た]".repeat(EXAMPLE_LENGTH);
    expect(japanese.length).toBeGreaterThan(EXAMPLE_LENGTH);
    expect(fitsExample(japanese)).toBe(true);
    expect(fitsExample("a".repeat(EXAMPLE_LENGTH + 1))).toBe(false);
  });

  it("is what an add refuses past", () => {
    const card = { deckId: "d1", term: "x" };
    expect(CardInput.safeParse({ ...card, example: "a".repeat(EXAMPLE_LENGTH) }).success).toBe(
      true,
    );
    expect(CardInput.safeParse({ ...card, example: "a".repeat(EXAMPLE_LENGTH + 1) }).success).toBe(
      false,
    );
    expect(
      CardInput.safeParse({ ...card, example: "x", exampleTranslation: "a".repeat(251) }).success,
    ).toBe(false);
  });
});

describe("a translation's example", () => {
  it("stays current when readings or stress marks are added to the same sentence", () => {
    const plain = exampleFingerprint("毎朝パンを食べます。");
    expect(exampleFingerprint("毎朝[まいあさ]パンを食[た]べます。")).toBe(plain);
    expect(exampleFingerprint("Это  мой за́мок.")).toBe(exampleFingerprint("Это мой замок."));
    expect(exampleFingerprint("Ich esse Brot.")).not.toBe(exampleFingerprint("Ich aß Brot."));
  });

  it("is stale once the example says something else", () => {
    const of = exampleFingerprint("Ich esse Brot.");
    const card = {
      example: "Ich aß Brot.",
      exampleTranslation: "I ate bread.",
      exampleTranslationOf: of,
    };
    expect(translationStale(card)).toBe(true);
    expect(translationStale({ ...card, example: "Ich esse Brot." })).toBe(false);
    expect(translationStale({ ...card, exampleTranslationOf: null })).toBe(false);
  });

  it("is shown only beside the example it was written for", () => {
    const card = {
      example: "Ich esse Brot.",
      exampleTranslation: " I eat bread. ",
      exampleTranslationStale: false,
    };
    expect(shownTranslation(card)).toBe("I eat bread.");
    expect(shownTranslation({ ...card, exampleTranslationStale: true })).toBeNull();
    expect(shownTranslation({ ...card, example: null })).toBeNull();
    expect(shownTranslation({ ...card, exampleTranslation: "" })).toBeNull();
  });
});

describe("an imported example", () => {
  it("keeps its translation beside it", () => {
    const { fields, shortened } = fitFields({
      term: "Brot",
      example: "Ich esse Brot.",
      exampleTranslation: "I eat bread.",
    });
    expect(fields).toMatchObject({ example: "Ich esse Brot.", exampleTranslation: "I eat bread." });
    expect(shortened).toBe(false);
  });

  it("moves to the notes with its translation when it is longer than one shown", () => {
    const passage = "Ein langer Satz. ".repeat(20).trim();
    const { fields, shortened } = fitFields({
      term: "Satz",
      example: passage,
      exampleTranslation: "A long passage.",
      notes: "der Satz, die Sätze",
    });
    expect(fields.example).toBeUndefined();
    expect(fields.exampleTranslation).toBeUndefined();
    expect(fields.notes).toBe(`der Satz, die Sätze\n\n${passage}\nA long passage.`);
    expect(shortened).toBe(true);
  });

  it("turns a translation with no example into a line of notes", () => {
    const { fields } = fitFields({ term: "Brot", exampleTranslation: "I eat bread." });
    expect(fields.exampleTranslation).toBeUndefined();
    expect(fields.notes).toBe("I eat bread.");
  });
});
