export type SpeechRequest = {
  text: string;
  language: string;
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
  effort?: "low" | "medium" | "high" | undefined;
};

export interface TextProvider {
  provider: "openai";
  model: string;
  /** The parsed reply. Callers validate it; a provider only promises valid JSON. */
  complete(request: TextRequest): Promise<unknown>;
}
