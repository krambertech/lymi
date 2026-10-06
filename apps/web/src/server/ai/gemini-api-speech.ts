import { z } from "zod";
import { pronunciationPrompt } from "./google-gemini";
import type { Fetch, SpeechProvider } from "./types";

const MAX_JSON_BYTES = 11_000_000;
const MAX_PCM_BYTES = 7_999_956;

export type GeminiApiSpeechBindings = {
  GEMINI_API_KEY?: string | undefined;
  GEMINI_SPEECH_MODEL?: string | undefined;
  GEMINI_SPEECH_VOICE?: string | undefined;
};

export class GeminiApiSpeechError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "GeminiApiSpeechError";
  }
}

const SpeechPayload = z.object({
  candidates: z
    .array(
      z.object({
        content: z.object({
          parts: z.array(
            z.object({
              inlineData: z.object({ mimeType: z.string(), data: z.string() }).optional(),
            }),
          ),
        }),
      }),
    )
    .min(1),
});

export function createGeminiApiSpeechProvider(
  env: GeminiApiSpeechBindings,
  locale: string,
  request: Fetch = fetch,
): SpeechProvider {
  const model = env.GEMINI_SPEECH_MODEL?.trim() || "gemini-3.1-flash-tts-preview";
  const voice = env.GEMINI_SPEECH_VOICE?.trim() || "Kore";
  return {
    provider: "gemini-api",
    model,
    voice,
    locale,
    contentType: "audio/wav",
    extension: "wav",
    async speech(input) {
      const key = env.GEMINI_API_KEY?.trim();
      if (!key) throw new GeminiApiSpeechError("Gemini API speech is not configured");
      let response: Response;
      try {
        response = await request(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
          {
            method: "POST",
            headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                { parts: [{ text: `${pronunciationPrompt(locale)}\n\nText: ${input.text}` }] },
              ],
              generationConfig: {
                responseModalities: ["AUDIO"],
                speechConfig: {
                  languageCode: locale,
                  voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
                },
              },
            }),
            signal: AbortSignal.timeout(30_000),
          },
        );
      } catch {
        throw new GeminiApiSpeechError("Gemini API speech could not be reached");
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new GeminiApiSpeechError("Gemini API speech request failed", response.status);
      }
      const parsed = SpeechPayload.safeParse(await boundedPayload(response));
      if (!parsed.success) throw new GeminiApiSpeechError("Gemini API returned no audio");
      const payload = parsed.data;
      const audio = payload.candidates?.[0]?.content?.parts?.find(
        (part) => part.inlineData,
      )?.inlineData;
      if (
        audio?.mimeType !== "audio/l16; rate=24000; channels=1" ||
        typeof audio.data !== "string"
      ) {
        throw new GeminiApiSpeechError("Gemini API returned an unexpected audio format");
      }
      let pcm: string;
      try {
        pcm = atob(audio.data);
      } catch {
        throw new GeminiApiSpeechError("Gemini API returned invalid audio");
      }
      if (!pcm.length || pcm.length > MAX_PCM_BYTES || pcm.length % 2) {
        throw new GeminiApiSpeechError("Gemini API returned an invalid audio size");
      }
      return new Response(wav(pcm), { headers: { "Content-Type": "audio/wav" } });
    },
  };
}

async function boundedPayload(response: Response): Promise<unknown> {
  if (!response.body) throw new GeminiApiSpeechError("Gemini API returned no audio");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.byteLength;
      if (length > MAX_JSON_BYTES) {
        await reader.cancel();
        throw new GeminiApiSpeechError("Gemini API returned an oversized response");
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.length;
  }
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!parsed || typeof parsed !== "object") throw new Error();
    return parsed;
  } catch {
    throw new GeminiApiSpeechError("Gemini API returned invalid JSON");
  }
}

function wav(pcm: string): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(44 + pcm.length);
  const view = new DataView(bytes.buffer);
  const text = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) bytes[offset + i] = value.charCodeAt(i);
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + pcm.length, true);
  text(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 24000, true);
  view.setUint32(28, 48000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, pcm.length, true);
  for (let i = 0; i < pcm.length; i += 1) bytes[44 + i] = pcm.charCodeAt(i);
  return bytes;
}
