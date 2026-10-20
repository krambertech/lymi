import { describe, expect, it } from "vitest";
import { cyrillicStress, hasStress, markedForm, stripStress } from ".";

const RU = { vowels: "аеёиоуыэюя", restores: { ё: "е" } } as const;

describe("stripStress", () => {
  it("removes U+0301 and keeps every other mark", () => {
    expect(stripStress("за́мок")).toBe("замок");
    expect(stripStress("мо́йка")).toBe("мойка");
    expect(stripStress("ёжик")).toBe("ёжик");
    expect(stripStress("ą́")).toBe("ą");
  });
});

describe("hasStress", () => {
  it("finds a mark in either normal form", () => {
    expect(hasStress("за́мок")).toBe(true);
    expect(hasStress("замок")).toBe(false);
    expect(hasStress("ёжик")).toBe(false);
  });
});

describe("markedForm", () => {
  it("keeps й and ё, which carry marks of their own", () => {
    expect(markedForm("мойка", "мо́йка", RU)).toBe("мо́йка");
    expect(markedForm("мойка", "мо́ика", RU)).toBeNull();
    expect(markedForm("ёлка", "ёлка", RU)).toBeNull();
  });
  it("draws ё in the term's case where the pronunciation restores it", () => {
    expect(markedForm("ЕЖ", "ёж", RU)).toBe("ЁЖ");
  });
  it("counts a hyphenated word's syllables across the hyphen", () => {
    expect(markedForm("что-то", "что́-то", RU)).toBe("что́-то");
    expect(markedForm("из-за", "и́з-за", RU)).toBe("и́з-за");
    expect(markedForm("пол-литра", "по́л-ли́тра", RU)).toBe("по́л-ли́тра");
    expect(markedForm("кто‑то", "кто́‑то", RU)).toBe("кто́‑то");
    // A hyphen between spaces is no part of a word.
    expect(markedForm("дом - сад", "до́м - са́д", RU)).toBeNull();
  });
  it("lets a word take two acutes, as тво́ро́г does", () => {
    expect(markedForm("творог", "тво́ро́г", RU)).toBe("тво́ро́г");
  });
  it("restores nothing where the rules restore nothing", () => {
    expect(markedForm("ежик", "ёжик", { vowels: "аеєиіїоуюя" })).toBeNull();
  });
});

describe("cyrillicStress", () => {
  it("writes an accented Latin look-alike in a Cyrillic word as the vowel and U+0301", () => {
    expect(cyrillicStress("замóк", RU)).toBe("замо́к");
    expect(cyrillicStress("Áист", RU)).toBe("А́ист");
    expect(cyrillicStress("café и замóк", RU)).toBe("café и замо́к");
  });
  it("leaves a letter the language does not write", () => {
    expect(cyrillicStress("кíно", RU)).toBe("кíно");
  });
});
