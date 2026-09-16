export type SpeechRequest = {
  text: string;
  language: string;
};

export interface SpeechProvider {
  provider: "google-gemini" | "google-chirp" | "openai";
  model: string;
  voice: string;
  /** The exact locale sent upstream. It is part of the cache identity. */
  locale: string;
  contentType: "audio/mpeg";
  extension: "mp3";
  speech(request: SpeechRequest): Promise<Response>;
}

export type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

/** One text completion: what the model is for, what to work on, and the shape of the reply. */
export type TextRequest = {
  instructions: string;
  input: string;
  /** JSON Schema the reply must satisfy, named for the vendor's structured-output call. */
  schema: { name: string; schema: Record<string, unknown> };
};

export interface TextProvider {
  provider: "openai";
  model: string;
  /** The parsed reply. Callers validate it; a provider only promises valid JSON. */
  complete(request: TextRequest): Promise<unknown>;
}
