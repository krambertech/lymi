import { describe, expect, it } from "vitest";
import { createSpeechProviders, openAiSupportsLanguage, voiceLocale } from "./speech";
import { NATIVE_SPEECH_VOICES, nativeSpeechVoice } from "./speech-voices";

const env = { OPENAI_API_KEY: "openai-key", ELEVENLABS_API_KEY: "eleven-key" };

function names(providers: ReturnType<typeof createSpeechProviders>) {
  return providers.map((provider) => provider.provider);
}

describe("speech provider routing", () => {
  it("keeps a published region and fills a default for a bare language", () => {
    expect(voiceLocale("et")).toBe("et-EE");
    expect(voiceLocale("pt-pt")).toBe("pt-PT");
    expect(voiceLocale("pt")).toBe("pt-BR");
    expect(voiceLocale("es-419")).toBe("es-419");
    expect(voiceLocale("en-NZ")).toBe("en-US");
    expect(voiceLocale("tl")).toBe("fil-PH");
    expect(voiceLocale("cy")).toBeNull();
  });

  it("speaks traditional Chinese with the Taiwan voice and simplified with the mainland one", () => {
    for (const tag of ["zh-TW", "zh-Hant", "zh-HK", "zh-Hant-HK", "zh_MO"])
      expect(voiceLocale(tag)).toBe("cmn-TW");
    for (const tag of ["zh", "zh-CN", "zh-Hans", "zh-Hans-TW", "zh-SG"])
      expect(voiceLocale(tag)).toBe("cmn-CN");
    expect(nativeSpeechVoice("cmn-CN")?.name).toMatch(/Amy/);
    expect(nativeSpeechVoice("cmn-TW")?.name).toMatch(/Ling/);
  });

  it("speaks every Cantonese tag, zh-yue too, in Hong Kong Cantonese with Aki", () => {
    for (const tag of ["yue", "yue-HK", "yue-Hans", "zh-yue", "zh-yue-HK", "zh_yue"]) {
      expect(voiceLocale(tag)).toBe("yue-HK");
    }
    expect(nativeSpeechVoice("yue-HK")?.voice).toBe("xDISamJf8LV5rG5A2te1");
  });

  it("speaks Russian with Nikolay, who reads U+0301 as stress", () => {
    expect(nativeSpeechVoice("ru-RU")?.voice).toBe("3EuKHIEZbSzrHGNmdYsx");
  });

  it("speaks Ukrainian with the voice the listening test chose, which reads U+0301 as stress", () => {
    expect(nativeSpeechVoice("uk-UA")?.voice).toBe("2OXYbN1uGomXXJtv9Dq6");
  });

  it("recognizes OpenAI's published languages and common tag aliases", () => {
    expect(openAiSupportsLanguage("et-EE")).toBe(true);
    expect(openAiSupportsLanguage("cy")).toBe(true);
    expect(openAiSupportsLanguage("fil-PH")).toBe(true);
    expect(openAiSupportsLanguage("gu-IN")).toBe(false);
  });

  it("puts a native voice first and backs it up with OpenAI", () => {
    for (const language of [
      "et-EE",
      "uk",
      "ru",
      "zh",
      "pt-BR",
      "ja",
      "ko",
      "vi",
      "nb",
      "no",
      "sv",
    ]) {
      expect(names(createSpeechProviders(env, language))).toEqual(["elevenlabs", "openai"]);
    }
    expect(createSpeechProviders(env, "et")[0]?.voice).toBe("jGja51dd7gcoK0zkxeyg");
    expect(createSpeechProviders(env, "nb-NO")[0]?.voice).toBe("uNsWM1StCcpydKYOjKyu");
  });

  it("gives the languages Gemini spoke alone a native voice", () => {
    for (const language of ["bn", "ceb", "gu", "ka", "ml", "mn", "my", "or", "pa", "ps", "te"]) {
      expect(names(createSpeechProviders(env, language))).toEqual(["elevenlabs"]);
    }
  });

  it("gives languages without a tagged voice a neighbouring language's", () => {
    expect(createSpeechProviders(env, "lb")[0]?.voice).toBe(NATIVE_SPEECH_VOICES.de?.voice);
    expect(createSpeechProviders(env, "sd")[0]?.voice).toBe(NATIVE_SPEECH_VOICES.ur?.voice);
  });

  it("speaks English and languages without a native voice with OpenAI", () => {
    for (const language of ["en", "en-GB", "pt-PT", "sl", "lt", "lv", "is", "hy", "cy"]) {
      expect(names(createSpeechProviders(env, language))).toEqual(["openai"]);
    }
  });

  it("tries OpenAI for the languages neither vendor lists", () => {
    for (const language of ["am", "eu", "ht", "kok", "la", "mai", "mg", "si", "sq"]) {
      expect(names(createSpeechProviders(env, language))).toEqual(["openai"]);
    }
  });

  it("leaves out a vendor without its key", () => {
    expect(names(createSpeechProviders({ ...env, ELEVENLABS_API_KEY: "" }, "et"))).toEqual([
      "openai",
    ]);
    expect(names(createSpeechProviders({ ...env, OPENAI_API_KEY: "" }, "et"))).toEqual([
      "elevenlabs",
    ]);
  });

  it("returns no provider when no vendor covers the language", () => {
    expect(createSpeechProviders(env, "eo")).toEqual([]);
  });

  it("gives every native voice a language the chain can reach", () => {
    for (const tag of Object.keys(NATIVE_SPEECH_VOICES)) {
      expect(voiceLocale(tag), tag).not.toBeNull();
    }
  });

  it("allows a voice override and turning a native voice off", () => {
    const override = {
      ...env,
      ELEVENLABS_SPEECH_VOICES: '{"cs": "jGja51dd7gcoK0zkxeyg", "pl": null}',
    };
    expect(createSpeechProviders(override, "cs")[0]?.voice).toBe("jGja51dd7gcoK0zkxeyg");
    expect(createSpeechProviders(override, "pl")[0]?.provider).toBe("openai");
    expect(
      createSpeechProviders({ ...env, ELEVENLABS_SPEECH_VOICES: "invalid" }, "et")[0]?.voice,
    ).toBe("jGja51dd7gcoK0zkxeyg");
  });
});
