import { describe, expect, it } from "vitest";
import {
  drawsReadings,
  examplesCarryReadings,
  languageScript,
  languageSupport,
  speechInputs,
  speechLocale,
  supportedLanguage,
  writtenWithReading,
} from ".";

describe("languageSupport", () => {
  it("finds Japanese from any Japanese tag", () => {
    for (const tag of ["ja", "ja-JP", "JA", "ja-Jpan"])
      expect(languageSupport(tag)?.tag).toBe("ja");
  });
  it("finds Chinese from every zh tag but Cantonese's", () => {
    for (const tag of ["zh", "zh-CN", "zh-TW", "zh-HK", "zh-Hant", "zh_Hans_SG", "zh-cmn"])
      expect(languageSupport(tag)?.tag).toBe("zh");
    for (const tag of ["zh-yue", "zh-yue-HK", "yue", "yue-Hant", "zh-hak", "zh-nan", "zh-min-nan"])
      expect(languageSupport(tag)).toBeNull();
  });
  it("has no record for any other language", () => {
    for (const tag of ["ko", "en", "", null, undefined, "constructor"])
      expect(languageSupport(tag)).toBeNull();
  });
});

describe("supportedLanguage", () => {
  it("leaves out Chinese until it joins SupportedTag", () => {
    expect(supportedLanguage("ja-JP")?.tag).toBe("ja");
    expect(supportedLanguage("zh")).toBeNull();
  });
});

describe("drawsReadings", () => {
  it("draws Japanese and Chinese readings and no others", () => {
    expect(drawsReadings("ja-JP")).toBe(true);
    expect(drawsReadings("zh-TW")).toBe(true);
    expect(drawsReadings("zh-yue")).toBe(false);
    expect(drawsReadings(null)).toBe(false);
  });
});

describe("examplesCarryReadings", () => {
  it("lets Japanese examples carry readings, and Chinese ones not yet", () => {
    expect(examplesCarryReadings("ja")).toBe(true);
    expect(examplesCarryReadings("zh")).toBe(false);
    expect(examplesCarryReadings("ko")).toBe(false);
  });
});

describe("languageScript", () => {
  it("names the Japanese face and leaves the rest to Onest", () => {
    expect(languageScript("ja")).toBe("Jpan");
    expect(languageScript("ru")).toBeNull();
  });
  it("writes Chinese in its script subtag, else traditional for Taiwan, Hong Kong and Macau", () => {
    for (const tag of ["zh", "zh-CN", "zh-SG", "zh-Hans", "zh-Hans-TW", "zh-Hans-HK"])
      expect(languageScript(tag)).toBe("Hans");
    for (const tag of ["zh-TW", "zh-HK", "zh-MO", "zh-Hant", "zh-Hant-CN", "ZH_hant"])
      expect(languageScript(tag)).toBe("Hant");
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

describe("speechLocale", () => {
  it("speaks traditional Chinese with the Taiwan voice and leaves the rest to the default", () => {
    expect(speechLocale("zh-Hant")).toBe("cmn-TW");
    expect(speechLocale("zh")).toBeNull();
    expect(speechLocale("ja")).toBeNull();
  });
});

describe("writtenWithReading", () => {
  it("calls a Japanese or Chinese pronunciation a Reading", () => {
    for (const tag of ["ja", "ja-JP", "zh", "zh-TW"]) expect(writtenWithReading(tag)).toBe(true);
  });
  it("calls every other pronunciation a pronunciation", () => {
    for (const tag of ["ko", "ru", "en", "zh-yue", null])
      expect(writtenWithReading(tag)).toBe(false);
  });
});
