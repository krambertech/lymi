import { type GoogleCloudTtsBindings, synthesizeGoogleSpeech } from "./google-cloud-tts";
import type { Fetch, SpeechProvider } from "./types";

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });

export type GoogleGeminiBindings = GoogleCloudTtsBindings & {
  GEMINI_SPEECH_MODEL?: string | undefined;
  GEMINI_SPEECH_VOICE?: string | undefined;
};

export interface GoogleGeminiDependencies {
  locale: string;
  request?: Fetch | undefined;
  accessToken?: (() => Promise<string>) | undefined;
}

/**
 * Gemini-TTS through Cloud Text-to-Speech. The locale is pinned rather than detected, because a
 * lone word gives the model too little text to recognise its language.
 */
export function createGoogleGeminiProvider(
  env: GoogleGeminiBindings,
  dependencies: GoogleGeminiDependencies,
): SpeechProvider {
  const model = env.GEMINI_SPEECH_MODEL?.trim() || "gemini-3.1-flash-tts-preview";
  const voice = env.GEMINI_SPEECH_VOICE?.trim() || "Kore";
  const { locale } = dependencies;
  return {
    provider: "google-gemini",
    model,
    voice,
    locale,
    contentType: "audio/mpeg",
    extension: "mp3",
    speech: (input) =>
      synthesizeGoogleSpeech(env, {
        request: dependencies.request ?? fetch,
        accessToken: dependencies.accessToken,
        body: {
          input: { text: input.text, prompt: pronunciationPrompt(locale) },
          voice: { languageCode: locale, name: voice, modelName: model },
          audioConfig: { audioEncoding: "MP3" },
        },
      }),
  };
}

export function pronunciationPrompt(locale: string): string {
  const language = languageNames.of(locale) ?? locale;
  return (
    `You are a native ${language} speaker saying a word or phrase for a learner. ` +
    `Say the text once, clearly and at a natural pace, with ${language} sounds, stress and ` +
    "intonation, even where a word is spelled like an English word. Do not translate it, " +
    "spell it out, repeat it, or add any other words or sounds."
  );
}
