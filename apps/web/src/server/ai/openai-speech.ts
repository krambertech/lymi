// Type imports only: the site's hand:audio script runs this file under plain Node.
import type { Fetch, SpeechProvider } from "./types";

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

export type OpenAiSpeechBindings = {
  OPENAI_API_KEY?: string | undefined;
  OPENAI_BASE_URL?: string | undefined;
  OPENAI_SPEECH_MODEL?: string | undefined;
  OPENAI_SPEECH_VOICE?: string | undefined;
  AI_GATEWAY_TOKEN?: string | undefined;
};

export class OpenAiSpeechError extends Error {
  readonly status: number | undefined;

  constructor(message: string, options?: ErrorOptions & { status?: number | undefined }) {
    super(message, options);
    this.name = "OpenAiSpeechError";
    this.status = options?.status;
  }
}

/** Default speech provider for languages on OpenAI's published TTS support list. */
export function createOpenAiSpeechProvider(
  env: OpenAiSpeechBindings,
  language: string,
  request: Fetch = fetch,
): SpeechProvider {
  const model = env.OPENAI_SPEECH_MODEL || "gpt-4o-mini-tts";
  const voice = env.OPENAI_SPEECH_VOICE || "marin";
  return {
    provider: "openai",
    model,
    voice,
    locale: language,
    contentType: "audio/mpeg",
    extension: "mp3",
    async speech(input) {
      const apiKey = env.OPENAI_API_KEY?.trim();
      if (!apiKey) throw new OpenAiSpeechError("OpenAI speech is not configured");
      const baseUrl = (env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(/\/$/, "");
      const headers: Record<string, string> = {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      };
      if (env.AI_GATEWAY_TOKEN) headers["cf-aig-authorization"] = `Bearer ${env.AI_GATEWAY_TOKEN}`;
      const response = await fetchWithRetry(request, `${baseUrl}/audio/speech`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          voice,
          input: input.text,
          instructions:
            `Pronounce exactly the provided text once, naturally and clearly, as a native ${languageNames.of(input.language) ?? input.language} speaker. ` +
            "Do not translate it, spell it out, add commentary, or make non-speech sounds.",
          response_format: "mp3",
        }),
      });
      if (!response.body) throw new OpenAiSpeechError("OpenAI returned empty audio");
      const contentType = response.headers.get("content-type")?.toLowerCase();
      if (
        contentType &&
        !contentType.startsWith("audio/") &&
        contentType !== "application/octet-stream"
      ) {
        await response.body.cancel();
        throw new OpenAiSpeechError("OpenAI returned an unexpected audio response");
      }
      return response;
    },
  };
}

async function fetchWithRetry(request: Fetch, url: string, init: RequestInit): Promise<Response> {
  let lastStatus = 0;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response;
    try {
      response = await request(url, { ...init, signal: AbortSignal.timeout(30_000) });
    } catch (cause) {
      if (attempt === 1) throw new OpenAiSpeechError("OpenAI could not be reached", { cause });
      await pause(200);
      continue;
    }
    if (response.ok) return response;
    lastStatus = response.status;
    const retryable = response.status === 408 || response.status === 429 || response.status >= 500;
    await response.body?.cancel();
    if (!retryable || attempt === 1) {
      throw new OpenAiSpeechError(`OpenAI speech request failed (${response.status})`, {
        status: response.status,
      });
    }
    await pause(200 * (attempt + 1));
  }
  throw new OpenAiSpeechError(`OpenAI speech request failed (${lastStatus})`, {
    status: lastStatus,
  });
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
