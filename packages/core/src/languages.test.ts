import { describe, expect, it } from "vitest";
import { languageOfScript } from "./languages";

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
