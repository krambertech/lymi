import { describe, expect, it } from "vitest";
import { chirpLocale, createSpeechProviders, geminiLocale, openAiSupportsLanguage } from "./speech";

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

  it("recognizes OpenAI's published languages and common tag aliases", () => {
    expect(openAiSupportsLanguage("et-EE")).toBe(true);
    expect(openAiSupportsLanguage("cy")).toBe(true);
    expect(openAiSupportsLanguage("fil-PH")).toBe(true);
    expect(openAiSupportsLanguage("gu-IN")).toBe(false);
  });

  it("prefers Gemini, then Chirp, then OpenAI", () => {
    expect(names(createSpeechProviders(env, "et"))).toEqual([
      "google-gemini",
      "google-chirp",
      "openai",
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
});
