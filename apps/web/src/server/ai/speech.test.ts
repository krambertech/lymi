import { describe, expect, it } from "vitest";
import { chirpLocale, createSpeechProviders, openAiSupportsLanguage } from "./speech";

const env = {
  GOOGLE_CLOUD_TTS_CREDENTIALS: "configured",
  OPENAI_API_KEY: "openai-key",
};

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

  it("recognizes OpenAI's published languages and common tag aliases", () => {
    expect(openAiSupportsLanguage("et-EE")).toBe(true);
    expect(openAiSupportsLanguage("cy")).toBe(true);
    expect(openAiSupportsLanguage("fil-PH")).toBe(true);
    expect(openAiSupportsLanguage("gu-IN")).toBe(false);
  });

  it("prefers OpenAI for a language supported by both providers", () => {
    expect(createSpeechProviders(env, "et").map((provider) => provider.provider)).toEqual([
      "openai",
    ]);
  });

  it("uses Chirp for a language outside OpenAI's published list", () => {
    expect(createSpeechProviders(env, "gu").map((provider) => provider.provider)).toEqual([
      "google-chirp",
    ]);
  });

  it("uses Chirp when OpenAI is not configured", () => {
    expect(
      createSpeechProviders({ ...env, OPENAI_API_KEY: "" }, "et").map(
        (provider) => provider.provider,
      ),
    ).toEqual(["google-chirp"]);
  });

  it("returns no provider when neither vendor covers the language", () => {
    expect(createSpeechProviders(env, "eo")).toEqual([]);
  });
});
