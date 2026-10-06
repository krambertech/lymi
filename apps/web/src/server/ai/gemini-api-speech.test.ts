import { describe, expect, it, vi } from "vitest";
import { createGeminiApiSpeechProvider, GeminiApiSpeechError } from "./gemini-api-speech";

const payload = (data = "AQIDBA==", mimeType = "audio/l16; rate=24000; channels=1") => ({
  candidates: [{ content: { parts: [{ inlineData: { mimeType, data } }] } }],
});

describe("Gemini API speech", () => {
  it.each(["uk-UA", "ru-RU", "cs-CZ", "pl-PL", "et-EE"])(
    "pins %s and wraps PCM as playable WAV",
    async (locale) => {
      const request = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
        Response.json(payload()),
      );
      const provider = createGeminiApiSpeechProvider(
        { GEMINI_API_KEY: "test-key" },
        locale,
        request,
      );
      const response = await provider.speech({ text: "test", language: locale });
      const bytes = await response.bytes();
      expect(new TextDecoder().decode(bytes.slice(0, 4))).toBe("RIFF");
      expect(new TextDecoder().decode(bytes.slice(8, 16))).toBe("WAVEfmt ");
      expect(new DataView(bytes.buffer).getUint32(24, true)).toBe(24000);
      expect(new DataView(bytes.buffer).getUint32(40, true)).toBe(4);
      expect([...bytes.slice(44)]).toEqual([1, 2, 3, 4]);
      expect(response.headers.get("content-type")).toBe("audio/wav");
      const init = request.mock.calls[0]?.[1] as RequestInit | undefined;
      const body = JSON.parse(String(init?.body));
      expect(body.generationConfig.speechConfig).toEqual({
        languageCode: locale,
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
      });
      expect(body.contents[0].parts[0].text).toContain("Text: test");
      expect(request).toHaveBeenCalledTimes(1);
    },
  );

  it.each([
    payload(""),
    payload("AQ=="),
    payload("bad=="),
    payload("AQIDBA==", "audio/mpeg"),
    {},
    { candidates: [{ content: { parts: "invalid" } }] },
  ])("rejects malformed audio", async (body) => {
    const provider = createGeminiApiSpeechProvider(
      { GEMINI_API_KEY: "test-key" },
      "et-EE",
      async () => Response.json(body),
    );
    await expect(provider.speech({ text: "kooli", language: "et" })).rejects.toBeInstanceOf(
      GeminiApiSpeechError,
    );
  });

  it("bounds streamed JSON before parsing even without a length header", async () => {
    const cancel = vi.fn();
    const body = new ReadableStream({
      start(controller) {
        controller.enqueue(new Uint8Array(11_000_001));
      },
      cancel,
    });
    const provider = createGeminiApiSpeechProvider(
      { GEMINI_API_KEY: "test-key" },
      "et-EE",
      async () => new Response(body),
    );
    await expect(provider.speech({ text: "kooli", language: "et" })).rejects.toThrow(
      "oversized response",
    );
    expect(cancel).toHaveBeenCalled();
  });

  it("does not retry billed requests or expose upstream response text", async () => {
    const request = vi.fn(async () => new Response("private upstream details", { status: 429 }));
    const provider = createGeminiApiSpeechProvider(
      { GEMINI_API_KEY: "test-key" },
      "et-EE",
      request,
    );
    await expect(provider.speech({ text: "kooli", language: "et" })).rejects.toMatchObject({
      name: "GeminiApiSpeechError",
      status: 429,
      message: "Gemini API speech request failed",
    });
    expect(request).toHaveBeenCalledTimes(1);
  });

  it("does not request audio without a key", async () => {
    const request = vi.fn();
    await expect(
      createGeminiApiSpeechProvider({}, "et-EE", request).speech({ text: "kooli", language: "et" }),
    ).rejects.toThrow("not configured");
    expect(request).not.toHaveBeenCalled();
  });
});
