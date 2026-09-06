export type SpeechRequest = {
  text: string;
  language: string;
};

export interface SpeechProvider {
  provider: "google-chirp" | "openai";
  model: string;
  voice: string;
  /** The exact locale sent upstream. It is part of the cache identity. */
  locale: string;
  contentType: "audio/mpeg";
  extension: "mp3";
  speech(request: SpeechRequest): Promise<Response>;
}

export type Fetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
