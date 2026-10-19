import { describe, expect, it } from "vitest";
import { chirpLocale, createSpeechProviders, geminiLocale, openAiSupportsLanguage } from "./speech";
import { nativeSpeechVoice } from "./speech-voices";

const env = {
  GOOGLE_CLOUD_TTS_CREDENTIALS: "configured",
  OPENAI_API_KEY: "openai-key",
};

function names(providers: ReturnType<typeof createSpeechProviders>) {
  return providers.map((provider) => provider.provider);
}

describe("speech provider routing", () => {
  it("normalizes Estonian, Ukrainian, and regional Chirp locales", () => {
    expect(chirpLocale("et")).toBe("et-EE");
    expect(chirpLocale("uk-UA")).toBe("uk-UA");
    expect(chirpLocale("en_GB")).toBe("en-GB");
    expect(chirpLocale("zh")).toBe("cmn-CN");
  });

  it("returns null outside Chirp's published language list", () => {
    expect(chirpLocale("cy")).toBeNull();
    expect(chirpLocale("not-a-language")).toBeNull();
  });

  it("keeps a published Gemini region and fills a default for a bare language", () => {
    expect(geminiLocale("et")).toBe("et-EE");
    expect(geminiLocale("pt-pt")).toBe("pt-PT");
    expect(geminiLocale("pt")).toBe("pt-BR");
    expect(geminiLocale("es-419")).toBe("es-419");
    expect(geminiLocale("en-NZ")).toBe("en-US");
    expect(geminiLocale("tl")).toBe("fil-PH");
    expect(geminiLocale("cy")).toBeNull();
  });

  it("speaks traditional Chinese with the Taiwan voice and simplified with the mainland one", () => {
    for (const tag of ["zh-TW", "zh-Hant", "zh-HK", "zh-Hant-HK", "zh_MO"])
      expect(geminiLocale(tag)).toBe("cmn-TW");
    for (const tag of ["zh", "zh-CN", "zh-Hans", "zh-Hans-TW", "zh-SG"])
      expect(geminiLocale(tag)).toBe("cmn-CN");
    expect(nativeSpeechVoice("cmn-CN")?.name).toMatch(/Amy/);
    expect(nativeSpeechVoice("cmn-TW")?.name).toMatch(/Ling/);
  });

  it("recognizes OpenAI's published languages and common tag aliases", () => {
    expect(openAiSupportsLanguage("et-EE")).toBe(true);
    expect(openAiSupportsLanguage("cy")).toBe(true);
    expect(openAiSupportsLanguage("fil-PH")).toBe(true);
    expect(openAiSupportsLanguage("gu-IN")).toBe(false);
  });

  it("prefers Gemini, then OpenAI, then Chirp", () => {
    expect(names(createSpeechProviders(env, "et"))).toEqual([
      "google-gemini",
      "openai",
      "google-chirp",
    ]);
  });

  it("uses only OpenAI when Google is not configured", () => {
    expect(
      names(createSpeechProviders({ ...env, GOOGLE_CLOUD_TTS_CREDENTIALS: "" }, "et")),
    ).toEqual(["openai"]);
  });

  it("uses Gemini for a language neither Chirp nor OpenAI covers", () => {
    expect(names(createSpeechProviders(env, "am"))).toEqual(["google-gemini"]);
  });

  it("uses OpenAI for a language outside both Google lists", () => {
    expect(names(createSpeechProviders(env, "cy"))).toEqual(["openai"]);
  });

  it("returns no provider when no vendor covers the language", () => {
    expect(createSpeechProviders(env, "eo")).toEqual([]);
  });
  it("uses the AI Studio API instead of Cloud Gemini when its key is configured", () => {
    const configured = { ...env, GEMINI_API_KEY: "gemini-key" };
    for (const language of ["et", "uk", "ru", "cs", "pl", "he", "ka", "sr", "en"]) {
      const providers = createSpeechProviders(configured, language);
      expect(providers[0]).toMatchObject({
        provider: "gemini-api",
        voice: "Kore",
        extension: "wav",
      });
      expect(names(providers)).not.toContain("google-gemini");
    }
  });

  it("routes native voices first and leaves Gemini as their fallback", () => {
    const configured = { ...env, GEMINI_API_KEY: "gemini-key", ELEVENLABS_API_KEY: "eleven-key" };
    for (const language of ["et-EE", "uk", "ru", "zh", "pt-BR", "ja", "ko"]) {
      expect(names(createSpeechProviders(configured, language))).toEqual([
        "elevenlabs",
        "gemini-api",
        "openai",
        "google-chirp",
      ]);
    }
    expect(createSpeechProviders(configured, "et")[0]?.voice).toBe("jGja51dd7gcoK0zkxeyg");
    expect(createSpeechProviders(configured, "ko-KR")[0]?.voice).toBe("s07IwTCOrCDCaETjUVjx");
    expect(createSpeechProviders(configured, "pt-PT")[0]?.provider).toBe("gemini-api");
    for (const language of [
      "cs",
      "pl",
      "no",
      "nb-NO",
      "he",
      "hi",
      "ro",
      "sr",
      "es",
      "sv",
      "tr",
      "vi",
      "en",
      "ka",
    ]) {
      expect(createSpeechProviders(configured, language)[0]?.provider).toBe("gemini-api");
    }
  });

  it("allows a voice override or Gemini default without adding a credential", () => {
    const configured = { GEMINI_API_KEY: "gemini-key", ELEVENLABS_API_KEY: "eleven-key" };
    const override = {
      ...configured,
      ELEVENLABS_SPEECH_VOICES: '{"cs": "jGja51dd7gcoK0zkxeyg", "pl": null}',
    };
    expect(createSpeechProviders(override, "cs")[0]?.voice).toBe("jGja51dd7gcoK0zkxeyg");
    expect(createSpeechProviders(override, "pl")[0]?.provider).toBe("gemini-api");
    expect(
      createSpeechProviders({ ...configured, ELEVENLABS_SPEECH_VOICES: "invalid" }, "et")[0]?.voice,
    ).toBe("jGja51dd7gcoK0zkxeyg");
  });
});
