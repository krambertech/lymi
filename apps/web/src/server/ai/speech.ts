import { speechLocale } from "@lymi/core";
import { type DependencySource, type HealthEnv, meteredFetch } from "../dependency-health";
import { createElevenLabsSpeechProvider, type ElevenLabsSpeechBindings } from "./elevenlabs-speech";
import { createOpenAiSpeechProvider, type OpenAiSpeechBindings } from "./openai-speech";
import { nativeSpeechVoice } from "./speech-voices";
import type { SpeechProvider } from "./types";

type SpeechBindings = OpenAiSpeechBindings & ElevenLabsSpeechBindings & HealthEnv;

// One default locale per root; Arabic uses the Modern Standard "World" locale.
const SPEECH_LOCALES = new Map<string, string>([
  ["af", "af-ZA"],
  ["sq", "sq-AL"],
  ["am", "am-ET"],
  ["ar", "ar-001"],
  ["hy", "hy-AM"],
  ["az", "az-AZ"],
  ["eu", "eu-ES"],
  ["be", "be-BY"],
  ["bn", "bn-BD"],
  ["bg", "bg-BG"],
  ["my", "my-MM"],
  ["ca", "ca-ES"],
  ["ceb", "ceb-PH"],
  ["cmn", "cmn-CN"],
  ["zh", "cmn-CN"],
  ["hr", "hr-HR"],
  ["cs", "cs-CZ"],
  ["da", "da-DK"],
  ["nl", "nl-NL"],
  ["en", "en-US"],
  ["et", "et-EE"],
  ["fil", "fil-PH"],
  ["tl", "fil-PH"],
  ["fi", "fi-FI"],
  ["fr", "fr-FR"],
  ["gl", "gl-ES"],
  ["ka", "ka-GE"],
  ["de", "de-DE"],
  ["el", "el-GR"],
  ["gu", "gu-IN"],
  ["ht", "ht-HT"],
  ["he", "he-IL"],
  ["hi", "hi-IN"],
  ["hu", "hu-HU"],
  ["is", "is-IS"],
  ["id", "id-ID"],
  ["it", "it-IT"],
  ["ja", "ja-JP"],
  ["jv", "jv-JV"],
  ["kn", "kn-IN"],
  ["kok", "kok-IN"],
  ["ko", "ko-KR"],
  ["lo", "lo-LA"],
  ["la", "la-VA"],
  ["lv", "lv-LV"],
  ["lt", "lt-LT"],
  ["lb", "lb-LU"],
  ["mk", "mk-MK"],
  ["mai", "mai-IN"],
  ["mg", "mg-MG"],
  ["ms", "ms-MY"],
  ["ml", "ml-IN"],
  ["mr", "mr-IN"],
  ["mn", "mn-MN"],
  ["ne", "ne-NP"],
  ["nb", "nb-NO"],
  ["no", "nb-NO"],
  ["nn", "nn-NO"],
  ["or", "or-IN"],
  ["ps", "ps-AF"],
  ["fa", "fa-IR"],
  ["pl", "pl-PL"],
  ["pt", "pt-BR"],
  ["pa", "pa-IN"],
  ["ro", "ro-RO"],
  ["ru", "ru-RU"],
  ["sr", "sr-RS"],
  ["sd", "sd-IN"],
  ["si", "si-LK"],
  ["sk", "sk-SK"],
  ["sl", "sl-SI"],
  ["es", "es-ES"],
  ["sw", "sw-KE"],
  ["sv", "sv-SE"],
  ["ta", "ta-IN"],
  ["te", "te-IN"],
  ["th", "th-TH"],
  ["tr", "tr-TR"],
  ["uk", "uk-UA"],
  ["ur", "ur-PK"],
  ["vi", "vi-VN"],
  ["yue", "yue-HK"],
]);

const EXACT_SPEECH_LOCALES = new Set([
  ...SPEECH_LOCALES.values(),
  "ar-EG",
  "cmn-TW",
  "en-AU",
  "en-GB",
  "en-IN",
  "es-419",
  "es-MX",
  "fr-CA",
  "pt-PT",
]);

// https://developers.openai.com/api/docs/guides/text-to-speech#supported-languages
// OpenAI's TTS languages, represented as common BCP 47 roots.
// Aliases cover the tags people are likely to store for Chinese, Norwegian, and Tagalog.
const OPENAI_TTS_LANGUAGES = new Set([
  "af",
  "ar",
  "hy",
  "az",
  "be",
  "bs",
  "bg",
  "ca",
  "zh",
  "cmn",
  "hr",
  "cs",
  "da",
  "nl",
  "en",
  "et",
  "fi",
  "fr",
  "gl",
  "de",
  "el",
  "he",
  "hi",
  "hu",
  "is",
  "id",
  "it",
  "ja",
  "kn",
  "kk",
  "ko",
  "lv",
  "lt",
  "mk",
  "ms",
  "mr",
  "mi",
  "ne",
  "no",
  "nb",
  "nn",
  "fa",
  "pl",
  "pt",
  "ro",
  "ru",
  "sr",
  "sk",
  "sl",
  "es",
  "sw",
  "sv",
  "tl",
  "fil",
  "ta",
  "th",
  "tr",
  "uk",
  "ur",
  "vi",
  "cy",
  // Not on the published list, but two common words each came back right from a transcriber.
  "am",
  "eu",
  "ht",
  "kok",
  "la",
  "mai",
  "mg",
  "si",
  "sq",
]);

/** Normalize a language tag to a locale with a voice, keeping a supported region. */
export function voiceLocale(language: string): string | null {
  const normalized = language.trim().replace(/_/g, "-").toLowerCase();
  const match = [...EXACT_SPEECH_LOCALES].find((locale) => locale.toLowerCase() === normalized);
  if (match) return match;
  // A traditional Chinese tag speaks with the Taiwan voice.
  const script = speechLocale(normalized);
  if (script && EXACT_SPEECH_LOCALES.has(script)) return script;
  const root = normalized.split("-")[0];
  return root ? (SPEECH_LOCALES.get(root) ?? null) : null;
}

/** Whether OpenAI speech can say a BCP 47 tag. */
export function openAiSupportsLanguage(language: string): boolean {
  const root = language.trim().replace(/_/g, "-").split("-")[0]?.toLowerCase();
  return root ? OPENAI_TTS_LANGUAGES.has(root) : false;
}

/** A native reference voice takes precedence; OpenAI says the rest and backs native voices up. */
export function createSpeechProviders(
  env: SpeechBindings,
  language: string,
  source: DependencySource = "traffic",
): SpeechProvider[] {
  const providers: SpeechProvider[] = [];
  const locale = voiceLocale(language);
  const native = locale ? nativeSpeechVoice(locale, env.ELEVENLABS_SPEECH_VOICES) : null;
  if (locale && native && env.ELEVENLABS_API_KEY?.trim()) {
    providers.push(
      createElevenLabsSpeechProvider(
        env,
        locale,
        native.voice,
        meteredFetch(env, "elevenlabs", source),
      ),
    );
  }
  if (openAiSupportsLanguage(language) && env.OPENAI_API_KEY?.trim()) {
    providers.push(
      createOpenAiSpeechProvider(env, language, meteredFetch(env, "openai_speech", source)),
    );
  }
  return providers;
}
