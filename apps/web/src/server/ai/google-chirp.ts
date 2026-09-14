import { type GoogleCloudTtsBindings, synthesizeGoogleSpeech } from "./google-cloud-tts";
import type { Fetch, SpeechProvider } from "./types";

export interface GoogleChirpDependencies {
  locale: string;
  voice?: string | undefined;
  request?: Fetch | undefined;
  accessToken?: (() => Promise<string>) | undefined;
}

/** Cloud Text-to-Speech Chirp 3 HD: one fixed native voice per locale. */
export function createGoogleChirpProvider(
  env: GoogleCloudTtsBindings,
  dependencies: GoogleChirpDependencies,
): SpeechProvider {
  const voice = dependencies.voice ?? "Kore";
  return {
    provider: "google-chirp",
    model: "chirp-3-hd",
    voice,
    locale: dependencies.locale,
    contentType: "audio/mpeg",
    extension: "mp3",
    speech: (input) =>
      synthesizeGoogleSpeech(env, {
        request: dependencies.request ?? fetch,
        accessToken: dependencies.accessToken,
        body: {
          input: { text: input.text },
          voice: {
            languageCode: dependencies.locale,
            name: `${dependencies.locale}-Chirp3-HD-${voice}`,
          },
          audioConfig: { audioEncoding: "MP3" },
        },
      }),
  };
}
