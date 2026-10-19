import { describe, expect, it } from "vitest";
import {
  cueKeepsReading,
  drawsReadings,
  LANGUAGE_FORMATS,
  languageFormat,
  languageScript,
  languageSupport,
  pronunciationGuide,
  speechInputs,
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

describe("speechInputs", () => {
  it("makes a Japanese clip from its reading and, for the lead-in, its meaning", () => {
    expect(speechInputs("ja-JP")).toEqual(["pronunciation", "meaning"]);
  });
  it("makes every other clip from the term alone", () => {
    for (const tag of ["zh", "ko", null]) expect(speechInputs(tag)).toEqual([]);
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

describe("languageFormat", () => {
  it("finds a format from any tag of its language", () => {
    expect(languageFormat("ja-JP")?.tag).toBe("ja");
    expect(languageFormat("ko-KR")?.name).toBe("Korean");
    expect(languageFormat("zh-TW")?.pronunciation.label).toBe("reading");
  });
  it("has none for a language Lymi writes the general way", () => {
    for (const tag of ["it", "en", "", null, "constructor"]) expect(languageFormat(tag)).toBeNull();
  });
  it("calls Korean's pronounced Hangul a pronunciation, not a Reading", () => {
    expect(languageFormat("ko")?.pronunciation).toMatchObject({
      label: "pronunciation",
      sample: { term: "학교", pronunciation: "학꾜" },
    });
    expect(writtenWithReading("ko")).toBe(false);
  });
  it("tells a client to leave an empty pronunciation out, which the API accepts, and the model to write null", () => {
    expect(languageFormat("ko")?.pronunciation.format).toBe(
      "How the term is said, in Hangul, only where that differs from its spelling. Leave it out when the term is said as written. Not romanization or IPA.",
    );
    expect(pronunciationGuide("ko")).toContain("Null when the term is said as written.");
    for (const format of LANGUAGE_FORMATS)
      expect(format.pronunciation.format).not.toMatch(/\bnull\b/i);
  });
  it("gives a bracket pattern only to a reading style with an inline notation", () => {
    for (const format of LANGUAGE_FORMATS) {
      if (!format.example) continue;
      const pattern = new RegExp(format.example.pattern, "gu");
      expect(format.example.sample).toMatch(pattern);
    }
    expect(languageFormat("ja")?.example).not.toBeNull();
    expect(languageFormat("zh")?.example).toBeNull();
  });
});
