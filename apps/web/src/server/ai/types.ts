export type SpeechRequest = {
  previousText?: string | undefined;
  text: string;
  language: string;
  /** Receives what the vendor bills by, when the provider can tell. */
  usage?: ((usage: SpeechUsage) => void) | undefined;
};

export type SpeechUsage = {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  audioSeconds?: number | undefined;
};

/** One speech call's size and time, for cost; it never carries the text. */
export type SpeechCall = SpeechUsage & {
  provider: SpeechProvider["provider"];
  model: string;
  characters: number;
  latencyMs: number;
  error: boolean;
  status?: number | undefined;
};

export interface SpeechProvider {
  provider: "google-gemini" | "gemini-api" | "google-chirp" | "openai" | "elevenlabs";
  model: string;
  voice: string;
  /** The exact locale sent upstream. It is part of the cache identity. */
  locale: string;
  contentType: "audio/mpeg" | "audio/wav";
  extension: "mp3" | "wav";
  speech(request: SpeechRequest): Promise<Response>;
}

export type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** One text completion: what the model is for, what to work on, and the shape of the reply. */
export type TextRequest = {
  instructions: string;
  input: string;
  /** JSON Schema the reply must satisfy, named for the vendor's structured-output call. */
  schema: { name: string; schema: Record<string, unknown> };
  /** How hard the model reasons; left out, the provider's own default. */
  effort?: "none" | "low" | "medium" | "high" | undefined;
};

/** One model call's size and time, for cost; it never carries the prompt or the reply. */
export type TextCall = {
  provider: "openai" | "anthropic" | "google";
  model: string;
  inputTokens: number;
  outputTokens: number;
  reasoningTokens?: number | undefined;
  cachedTokens?: number | undefined;
  latencyMs: number;
  error: boolean;
  status?: number | undefined;
};
export type TextObserver = (call: TextCall) => void;

export interface TextProvider {
  provider: "openai";
  model: string;
  /** The parsed reply. Callers validate it; a provider only promises valid JSON. */
  complete(request: TextRequest): Promise<unknown>;
}
