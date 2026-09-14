import { describe, expect, it, vi } from "vitest";
import { GoogleSpeechError } from "./google-cloud-tts";
import { createGoogleGeminiProvider, pronunciationPrompt } from "./google-gemini";

const credentials = JSON.stringify({
  type: "service_account",
  project_id: "lymi-text-to-speech",
  client_email: "lymi-worker-tts@lymi-text-to-speech.iam.gserviceaccount.com",
  private_key: "not-used-when-token-is-injected",
});

describe("Google Gemini provider", () => {
  it("pins the Estonian locale and keeps direction out of the spoken text", async () => {
    const request = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
        Response.json({ audioContent: btoa("\u0001\u0002\u0003") }),
    );
    const provider = createGoogleGeminiProvider(
      { GOOGLE_CLOUD_TTS_CREDENTIALS: credentials },
      { locale: "et-EE", request, accessToken: async () => "token" },
    );

    const response = await provider.speech({ text: "jäääär", language: "et" });

    expect(await response.bytes()).toEqual(new Uint8Array([1, 2, 3]));
    expect(provider).toMatchObject({
      provider: "google-gemini",
      model: "gemini-3.1-flash-tts-preview",
      voice: "Kore",
      locale: "et-EE",
    });
    const call = request.mock.calls[0];
    if (!call) throw new Error("Gemini request was not made");
    expect(call[0]).toBe("https://texttospeech.googleapis.com/v1/text:synthesize");
    expect(JSON.parse(String(call[1]?.body))).toEqual({
      input: { text: "jäääär", prompt: pronunciationPrompt("et-EE") },
      voice: { languageCode: "et-EE", name: "Kore", modelName: "gemini-3.1-flash-tts-preview" },
      audioConfig: { audioEncoding: "MP3" },
    });
  });

  it("names the language in words rather than as a code", () => {
    expect(pronunciationPrompt("et-EE")).toContain("native Estonian (Estonia) speaker");
    expect(pronunciationPrompt("pt-BR")).toContain("Brazilian Portuguese sounds");
  });

  it("accepts a model and voice override", () => {
    const provider = createGoogleGeminiProvider(
      { GEMINI_SPEECH_MODEL: "gemini-2.5-pro-tts", GEMINI_SPEECH_VOICE: "Charon" },
      { locale: "uk-UA" },
    );
    expect(provider).toMatchObject({ model: "gemini-2.5-pro-tts", voice: "Charon" });
  });

  it("does not make a request when credentials are missing", async () => {
    const request = vi.fn();
    const provider = createGoogleGeminiProvider({}, { locale: "et-EE", request });

    await expect(provider.speech({ text: "tere", language: "et" })).rejects.toBeInstanceOf(
      GoogleSpeechError,
    );
    expect(request).not.toHaveBeenCalled();
  });
});
