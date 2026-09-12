import { describe, expect, it, vi } from "vitest";
import { createOpenAiSpeechProvider, OpenAiSpeechError } from "./openai-speech";

describe("OpenAI speech provider", () => {
  it("asks OpenAI for one exact multilingual pronunciation", async () => {
    const request = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
        new Response(new Uint8Array([1, 2]), { headers: { "Content-Type": "audio/mpeg" } }),
    );
    const provider = createOpenAiSpeechProvider(
      { OPENAI_API_KEY: "key", OPENAI_SPEECH_VOICE: "marin" },
      "cy",
      request,
    );

    expect(await (await provider.speech({ text: "bore da", language: "cy" })).bytes()).toEqual(
      new Uint8Array([1, 2]),
    );
    const call = request.mock.calls[0];
    if (!call) throw new Error("OpenAI request was not made");
    expect(call[0]).toBe("https://api.openai.com/v1/audio/speech");
    expect(JSON.parse(String(call[1]?.body))).toMatchObject({
      model: "gpt-4o-mini-tts",
      voice: "marin",
      input: "bore da",
      response_format: "mp3",
    });
  });

  it("does not make a request when the key is missing", async () => {
    const request = vi.fn();
    const provider = createOpenAiSpeechProvider({}, "cy", request);
    await expect(provider.speech({ text: "bore da", language: "cy" })).rejects.toBeInstanceOf(
      OpenAiSpeechError,
    );
    expect(request).not.toHaveBeenCalled();
  });

  it("exposes only the upstream status needed for safe diagnostics", async () => {
    const request = vi.fn(async () => new Response("private upstream details", { status: 401 }));
    const provider = createOpenAiSpeechProvider({ OPENAI_API_KEY: "key" }, "et", request);

    await expect(provider.speech({ text: "tere", language: "et" })).rejects.toMatchObject({
      name: "OpenAiSpeechError",
      status: 401,
    });
  });
});
