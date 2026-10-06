import { describe, expect, it, vi } from "vitest";
import { createElevenLabsSpeechProvider, ElevenLabsSpeechError } from "./elevenlabs-speech";

describe("ElevenLabs speech", () => {
  it.each([
    ["et-EE", "et"],
    ["cs-CZ", "cs"],
    ["pl-PL", "pl"],
    ["cmn-CN", "zh"],
    ["nb-NO", "no"],
  ])("pins %s and sends only the exact term", async (locale, language) => {
    const request = vi.fn(
      async (_url: RequestInfo | URL, _init?: RequestInit) =>
        new Response("audio", { headers: { "Content-Type": "audio/mpeg" } }),
    );
    const provider = createElevenLabsSpeechProvider(
      { ELEVENLABS_API_KEY: "test-key" },
      locale,
      "jGja51dd7gcoK0zkxeyg",
      request,
    );
    await provider.speech({ text: "kooli", language });
    expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body))).toEqual({
      text: "kooli",
      model_id: "eleven_v4",
      language_code: language,
      voice_settings: { stability: 1 },
    });
    expect(provider).toMatchObject({ voice: "jGja51dd7gcoK0zkxeyg", locale, extension: "mp3" });
  });

  it("falls back after one failure without retrying or including upstream details", async () => {
    const request = vi.fn(async () => new Response("private details", { status: 403 }));
    const provider = createElevenLabsSpeechProvider(
      { ELEVENLABS_API_KEY: "test-key" },
      "et-EE",
      "voice",
      request,
    );
    await expect(provider.speech({ text: "kooli", language: "et" })).rejects.toMatchObject({
      name: "ElevenLabsSpeechError",
      status: 403,
      message: "ElevenLabs speech request failed",
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("rejects a successful response containing JSON instead of MP3", async () => {
    const provider = createElevenLabsSpeechProvider(
      { ELEVENLABS_API_KEY: "test-key" },
      "et-EE",
      "voice",
      async () => Response.json({ error: "bad" }),
    );
    await expect(provider.speech({ text: "kooli", language: "et" })).rejects.toBeInstanceOf(
      ElevenLabsSpeechError,
    );
  });
});
