import type { Fetch, SpeechProvider } from "./types";

export type ElevenLabsSpeechBindings = {
  ELEVENLABS_API_KEY?: string | undefined;
  ELEVENLABS_SPEECH_MODEL?: string | undefined;
  ELEVENLABS_SPEECH_VOICES?: string | undefined;
};

export class ElevenLabsSpeechError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ElevenLabsSpeechError";
  }
}

export function createElevenLabsSpeechProvider(
  env: ElevenLabsSpeechBindings,
  locale: string,
  voice: string,
  request: Fetch = fetch,
): SpeechProvider {
  const model = env.ELEVENLABS_SPEECH_MODEL?.trim() || "eleven_v4";
  return {
    provider: "elevenlabs",
    model,
    voice,
    locale,
    contentType: "audio/mpeg",
    extension: "mp3",
    async speech(input) {
      const key = env.ELEVENLABS_API_KEY?.trim();
      if (!key) throw new ElevenLabsSpeechError("ElevenLabs speech is not configured");
      let response: Response;
      try {
        // An ambiguous timeout may already be billed, so generation has no automatic retry.
        response = await request(
          `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voice)}?output_format=mp3_44100_128`,
          {
            method: "POST",
            headers: { "xi-api-key": key, "Content-Type": "application/json" },
            body: JSON.stringify({
              text: input.text,
              model_id: model,
              language_code: elevenLabsLanguage(locale),
              voice_settings: { stability: 1 },
            }),
            signal: AbortSignal.timeout(30_000),
          },
        );
      } catch {
        throw new ElevenLabsSpeechError("ElevenLabs speech could not be reached");
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new ElevenLabsSpeechError("ElevenLabs speech request failed", response.status);
      }
      const contentType = response.headers.get("content-type")?.split(";")[0]?.toLowerCase();
      if (
        !response.body ||
        !["audio/mpeg", "application/octet-stream"].includes(contentType ?? "")
      ) {
        await response.body?.cancel();
        throw new ElevenLabsSpeechError("ElevenLabs returned an unexpected audio response");
      }
      return response;
    },
  };
}

function elevenLabsLanguage(locale: string): string {
  const root = locale.split("-")[0] ?? locale;
  return ({ cmn: "zh", nb: "no" } as Record<string, string>)[root] ?? root;
}
