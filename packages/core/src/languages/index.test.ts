import { describe, expect, it } from "vitest";
import { normaliseTerm } from "../terms";
import {
  configuredLanguage,
  drawsReadings,
  examplesCarryReadings,
  LANGUAGE_FORMATS,
  languageFormat,
  languageScript,
  languageSupport,
  pronunciationGuide,
  pronunciationName,
  speechInputs,
  speechLocale,
  stressRules,
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
  });
  it("finds Cantonese from yue and zh-yue tags alone, so zh-HK stays Chinese", () => {
    for (const tag of ["yue", "yue-HK", "yue-Hant", "zh-yue", "zh-yue-HK", "ZH_YUE"])
      expect(languageSupport(tag)?.tag).toBe("yue");
  });
  it("finds no record for another Chinese language", () => {
    for (const tag of ["zh-hak", "zh-nan", "zh-min-nan", "zh-wuu"])
      expect(languageSupport(tag)).toBeNull();
  });
  it("finds Russian from any Russian tag", () => {
    for (const tag of ["ru", "ru-RU", "RU", "ru_Cyrl"])
      expect(languageSupport(tag)?.tag).toBe("ru");
  });
  it("has no record for any other language", () => {
    for (const tag of ["ko", "en", "", null, undefined, "constructor"])
      expect(languageSupport(tag)).toBeNull();
  });
});

describe("supportedLanguage", () => {
  it("finds Japanese and Chinese, and leaves out Russian until it joins SupportedTag", () => {
    expect(supportedLanguage("ja-JP")?.tag).toBe("ja");
    expect(supportedLanguage("zh-Hant-TW")?.tag).toBe("zh");
    expect(supportedLanguage("zh-yue")).toBeNull();
    expect(supportedLanguage("ru")).toBeNull();
  });
});

describe("drawsReadings", () => {
  it("draws Japanese, Chinese and Cantonese readings and no others", () => {
    expect(drawsReadings("ja-JP")).toBe(true);
    expect(drawsReadings("zh-TW")).toBe(true);
    expect(drawsReadings("zh-yue")).toBe(true);
    expect(drawsReadings("zh-hak")).toBe(false);
    expect(drawsReadings(null)).toBe(false);
  });
  it("leaves Russian out, since its stress marks are drawn in place", () => {
    expect(drawsReadings("ru")).toBe(false);
  });
});

describe("stressRules", () => {
  it("lets Russian stress any vowel and restore ё, and no other language mark one", () => {
    expect(stressRules("ru-RU")).toEqual({ vowels: "аеёиоуыэюя", restores: { ё: "е" } });
    for (const tag of ["uk", "bg", "ja", null]) expect(stressRules(tag)).toBeNull();
  });
});

describe("examplesCarryReadings", () => {
  it("lets Japanese and Chinese examples carry readings", () => {
    expect(examplesCarryReadings("ja")).toBe(true);
    expect(examplesCarryReadings("zh-TW")).toBe(true);
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
  it("makes a Russian clip from its marked stress", () => {
    expect(speechInputs("ru")).toEqual(["pronunciation"]);
  });
  it("makes every other clip from the term alone", () => {
    for (const tag of ["zh", "ko", null]) expect(speechInputs(tag)).toEqual([]);
  });
});

describe("speechLocale", () => {
  it("speaks traditional Chinese with the Taiwan voice and leaves the rest to the default", () => {
    expect(speechLocale("zh-Hant")).toBe("cmn-TW");
    expect(speechLocale("zh-yue")).toBe("yue-HK");
    expect(speechLocale("yue-Hans")).toBe("yue-HK");
    expect(speechLocale("zh")).toBeNull();
    expect(speechLocale("ja")).toBeNull();
  });
});

describe("writtenWithReading", () => {
  it("calls a Japanese or Chinese pronunciation a Reading", () => {
    for (const tag of ["ja", "ja-JP", "zh", "zh-TW"]) expect(writtenWithReading(tag)).toBe(true);
  });
  it("calls every other pronunciation a pronunciation", () => {
    for (const tag of ["ko", "ru", "en", "zh-hak", null])
      expect(writtenWithReading(tag)).toBe(false);
  });
});

describe("languageFormat", () => {
  it("finds a format from any tag of its language", () => {
    expect(languageFormat("ja-JP")?.tag).toBe("ja");
    expect(languageFormat("ko-KR")?.name).toBe("Korean");
    expect(languageFormat("zh-TW")?.pronunciation.label).toBe("reading");
  });
  it("follows the record lookup, so zh-yue gets Cantonese's format", () => {
    expect(languageFormat("zh-yue")?.name).toBe("Cantonese");
    expect(languageFormat("zh-hak")).toBeNull();
    expect(languageFormat("zh-cmn-Hant-TW")?.duplicates).toBe("term-and-reading");
  });
  it("finds a configured row from an alias, under the row's own tag", () => {
    for (const tag of ["tl", "fil-PH"])
      expect(languageFormat(tag)).toMatchObject({ tag: "fil", name: "Filipino" });
    expect(LANGUAGE_FORMATS.filter((format) => format.name === "Filipino")).toHaveLength(1);
    expect(configuredLanguage("tl")).toBe(configuredLanguage("fil"));
  });
  it("finds no configured row for a supported language or another language's extended subtag", () => {
    for (const tag of ["ja", "zh", "zh-yue", "en", null])
      expect(configuredLanguage(tag)).toBeNull();
    expect(configuredLanguage("ka-GE")?.scripts).toEqual(["Geor"]);
  });
  it("configures a language with no format of its own and publishes none for it", () => {
    for (const tag of ["et", "fi", "lv", "nb", "no", "nn", "sv", "is", "pl", "nl"]) {
      expect(configuredLanguage(tag)).not.toBeNull();
      expect(languageFormat(tag)).toBeNull();
    }
    expect(configuredLanguage("no")).toBe(configuredLanguage("nb"));
  });
  it("lets a region's row win over its language's, so Portugal and Brazil differ", () => {
    for (const tag of ["pt-BR", "pt_br", "PT-br", "pt-Latn-BR"])
      expect(languageFormat(tag)?.tag).toBe("pt-BR");
    for (const tag of ["pt", "pt-PT", "pt-Latn-PT"]) expect(languageFormat(tag)?.tag).toBe("pt");
    expect(languageFormat("pt")?.pronunciation.sample.pronunciation).toBe("ɔbɾiˈɣaðu");
  });

  it("keeps Lithuanian accent marks, including a tilde with no precomposed letter", () => {
    const format = languageFormat("lt");
    expect(format?.pronunciation.sample).toEqual({ term: "namas", pronunciation: "nãmas" });
    const tilde = "tė̃vas".normalize("NFC");
    expect(normaliseTerm(tilde)).toBe(tilde);
    expect(normaliseTerm(tilde)).toContain("\u0303");
    expect(normaliseTerm("Výras")).toBe("výras");
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
    expect(languageFormat("zh")?.example?.sample).toBe("我[wǒ]去[qù]银行[yínháng]取钱[qǔqián]。");
    expect(languageFormat("ko")?.example).toBeNull();
  });
});

describe("languageFormat for Russian", () => {
  it("publishes Cyrillic, though Onest draws it with no face of its own", () => {
    expect(languageFormat("ru")).toMatchObject({
      scripts: ["Cyrl"],
      pronunciation: { label: "stress", sample: { term: "замок", pronunciation: "за́мок" } },
      duplicates: "term-and-reading",
    });
    expect(languageScript("ru")).toBeNull();
  });
  it("names a script for every language it publishes", () => {
    for (const format of LANGUAGE_FORMATS) expect(format.scripts.length).toBeGreaterThan(0);
  });
});

describe("pronunciationName", () => {
  it("calls a Russian pronunciation its Stress", () => {
    expect(pronunciationName("ru")).toBe("stress");
    expect(pronunciationName("ja")).toBe("reading");
    expect(pronunciationName("uk")).toBe("pronunciation");
    expect(pronunciationName(null)).toBe("pronunciation");
  });
});
