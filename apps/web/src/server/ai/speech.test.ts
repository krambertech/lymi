import { describe, expect, it } from "vitest";
import { chirpLocale, createSpeechProviders } from "./speech";

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

  it("prefers Chirp and keeps OpenAI as fallback", () => {
    expect(createSpeechProviders(env, "et").map((provider) => provider.provider)).toEqual([
      "google-chirp",
      "openai",
    ]);
  });

  it("uses only OpenAI for an unsupported Chirp locale", () => {
    expect(createSpeechProviders(env, "cy").map((provider) => provider.provider)).toEqual([
      "openai",
    ]);
  });
});
