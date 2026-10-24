import { type GoogleCloudTtsBindings, synthesizeGoogleSpeech } from "./google-cloud-tts";
import type { Fetch, SpeechProvider } from "./types";

const languageNames = new Intl.DisplayNames(["en"], { type: "language" });
// https://cloud.google.com/text-to-speech/docs/reference/rest/v1/AudioConfig#audioencoding
const MP3_BITS_PER_SECOND = 32_000;

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
    async speech(input) {
      const response = await synthesizeGoogleSpeech(env, {
        request: dependencies.request ?? fetch,
        accessToken: dependencies.accessToken,
        body: {
          input: { text: input.text, prompt: pronunciationPrompt(locale, input.kind) },
          voice: { languageCode: locale, name: voice, modelName: model },
          audioConfig: { audioEncoding: "MP3" },
        },
      });
      if (!input.usage) return response;
      // Cloud returns no token counts; its MP3 is 32 kbps, so the clip's length comes from its size.
      const audio = await response.arrayBuffer();
      input.usage({ audioSeconds: (audio.byteLength * 8) / MP3_BITS_PER_SECOND });
      return new Response(audio, { headers: response.headers });
    },
  };
}

export function pronunciationPrompt(locale: string, kind?: "example"): string {
  const language = languageNames.of(locale) ?? locale;
  if (kind === "example") {
    return (
      `You are a native ${language} speaker reading an example sentence aloud for a learner. ` +
      `Read the text once, clearly and at a natural, slightly unhurried pace, with ${language} ` +
      "sounds, stress and sentence intonation. Do not translate it, spell it out, repeat it, or " +
      "add any other words or sounds."
    );
  }
  return (
    `You are a native ${language} speaker saying a word or phrase for a learner. ` +
    `Say the text once, clearly and at a natural pace, with ${language} sounds, stress and ` +
    "intonation, even where a word is spelled like an English word. Do not translate it, " +
    "spell it out, repeat it, or add any other words or sounds."
  );
}
