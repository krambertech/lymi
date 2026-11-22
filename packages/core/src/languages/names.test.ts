import { describe, expect, it } from "vitest";
import { guessLanguage, LANGUAGE_TAGS, languageOfScript } from "./names";

describe("guessLanguage", () => {
  const nameIn = (locale: string, tag: string) =>
    new Intl.DisplayNames([locale], { type: "language" }).of(tag) ?? "";

  it.each(LANGUAGE_TAGS)("finds %s by its English name and its own", (tag) => {
    for (const name of [nameIn("en", tag), nameIn(tag, tag)]) {
      expect(guessLanguage(name)).toBe(tag);
      expect(guessLanguage(`${name.toUpperCase()} – 1`)).toBe(tag);
    }
  });

  it("takes Norwegian to be Bokmål unless the name says Nynorsk", () => {
    for (const name of ["Norwegian A1", "Norsk", "Norwegian Bokmål", "norsk bokmål"])
      expect(guessLanguage(name)).toBe("no");
    expect(guessLanguage("Norsk nynorsk 1")).toBe("nn");
  });

  it("reads a first word that only begins a language's name as no language", () => {
    expect(guessLanguage("Tiếng Anh")).toBeNull();
  });
});

describe("languageOfScript", () => {
  it("reads Japanese from kana, even among kanji-only terms", () => {
    expect(languageOfScript(["食べる", "窓", "ありがとう"])).toBe("ja");
  });

  it("reads Korean and Greek from their own scripts", () => {
    expect(languageOfScript(["사랑", "학교"])).toBe("ko");
    expect(languageOfScript(["θάλασσα", "ήλιος"])).toBe("el");
  });

  it("leaves shared scripts to the model", () => {
    expect(languageOfScript(["la ventana", "tener"])).toBeNull();
    expect(languageOfScript(["кіт", "собака"])).toBeNull();
    expect(languageOfScript(["窓", "猫"])).toBeNull();
  });

  it("needs most terms to agree", () => {
    expect(languageOfScript(["karaoke", "カラオケ", "la playa", "el sol"])).toBeNull();
  });

  it("says nothing about no terms", () => {
    expect(languageOfScript([])).toBeNull();
  });
});
