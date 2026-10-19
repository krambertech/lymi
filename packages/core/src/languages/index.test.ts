import { describe, expect, it } from "vitest";
import {
  cueKeepsReading,
  drawsReadings,
  languageScript,
  languageSupport,
  writtenWithReading,
} from ".";

describe("languageSupport", () => {
  it("finds Japanese from any Japanese tag", () => {
    for (const tag of ["ja", "ja-JP", "JA", "ja-Jpan"])
      expect(languageSupport(tag)?.tag).toBe("ja");
  });
  it("has no record for any other language", () => {
    for (const tag of ["zh", "ko", "en", "", null, undefined, "constructor"])
      expect(languageSupport(tag)).toBeNull();
  });
});

describe("drawsReadings", () => {
  it("draws Japanese readings and no others", () => {
    expect(drawsReadings("ja-JP")).toBe(true);
    expect(drawsReadings("zh")).toBe(false);
    expect(drawsReadings(null)).toBe(false);
  });
});

describe("languageScript", () => {
  it("names the Japanese face and leaves the rest to Onest", () => {
    expect(languageScript("ja")).toBe("Jpan");
    expect(languageScript("zh")).toBeNull();
    expect(languageScript("ru")).toBeNull();
  });
});

describe("writtenWithReading", () => {
  it("calls a Japanese or Chinese pronunciation a Reading", () => {
    for (const tag of ["ja", "ja-JP", "zh", "zh-TW", "zh-yue"])
      expect(writtenWithReading(tag)).toBe(true);
  });
  it("calls every other pronunciation a pronunciation", () => {
    for (const tag of ["ko", "ru", "en", null]) expect(writtenWithReading(tag)).toBe(false);
  });
});

describe("cueKeepsReading", () => {
  it("keeps Chinese pinyin on the cue until the card is Known", () => {
    expect(cueKeepsReading("zh", false)).toBe(true);
    expect(cueKeepsReading("zh-Hans", false)).toBe(true);
    expect(cueKeepsReading("zh", true)).toBe(false);
  });
  it("leaves every other reading for the reveal", () => {
    expect(cueKeepsReading("ja", false)).toBe(false);
    expect(cueKeepsReading("ko", false)).toBe(false);
    expect(cueKeepsReading(null, false)).toBe(false);
  });
});
