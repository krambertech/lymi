import { describe, expect, it, vi } from "vitest";
import { createGoogleChirpProvider, GoogleChirpError } from "./google-chirp";

const credentials = JSON.stringify({
  type: "service_account",
  project_id: "lymi-text-to-speech",
  client_email: "lymi-worker-tts@lymi-text-to-speech.iam.gserviceaccount.com",
  private_key: "not-used-when-token-is-injected",
});

describe("Google Chirp provider", () => {
  it("requests Estonian Chirp 3 HD and decodes its MP3", async () => {
    const request = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
        Response.json({ audioContent: btoa("\u0001\u0002\u0003") }),
    );
    const provider = createGoogleChirpProvider(
      { GOOGLE_CLOUD_TTS_CREDENTIALS: credentials },
      { locale: "et-EE", request, accessToken: async () => "token" },
    );

    const response = await provider.speech({ text: "jäääär", language: "et" });

    expect(await response.bytes()).toEqual(new Uint8Array([1, 2, 3]));
    const call = request.mock.calls[0];
    if (!call) throw new Error("Chirp request was not made");
    expect(call[0]).toBe("https://texttospeech.googleapis.com/v1/text:synthesize");
    expect(call[1]?.headers).toMatchObject({
      Authorization: "Bearer token",
      "x-goog-user-project": "lymi-text-to-speech",
    });
    expect(JSON.parse(String(call[1]?.body))).toEqual({
      input: { text: "jäääär" },
      voice: { languageCode: "et-EE", name: "et-EE-Chirp3-HD-Kore" },
      audioConfig: { audioEncoding: "MP3" },
    });
  });

  it("does not make a request when credentials are missing", async () => {
    const request = vi.fn();
    const provider = createGoogleChirpProvider({}, { locale: "et-EE", request });

    await expect(provider.speech({ text: "tere", language: "et" })).rejects.toBeInstanceOf(
      GoogleChirpError,
    );
    expect(request).not.toHaveBeenCalled();
  });
});
