import { createGoogleChirpProvider, type GoogleChirpBindings } from "./google-chirp";
import { createOpenAiSpeechProvider, type OpenAiSpeechBindings } from "./openai-speech";
import type { SpeechProvider } from "./types";

type SpeechBindings = GoogleChirpBindings & OpenAiSpeechBindings;

// https://developers.openai.com/api/docs/guides/text-to-speech#supported-languages
// OpenAI's published TTS language list, represented as common BCP 47 roots.
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
]);

const CHIRP_LOCALES = new Map<string, string>([
  ["ar", "ar-XA"],
  ["bn", "bn-IN"],
  ["bg", "bg-BG"],
  ["yue", "yue-HK"],
  ["hr", "hr-HR"],
  ["cs", "cs-CZ"],
  ["da", "da-DK"],
  ["nl", "nl-NL"],
  ["en", "en-US"],
  ["et", "et-EE"],
  ["fi", "fi-FI"],
  ["fr", "fr-FR"],
  ["de", "de-DE"],
  ["el", "el-GR"],
  ["gu", "gu-IN"],
  ["he", "he-IL"],
  ["hi", "hi-IN"],
  ["hu", "hu-HU"],
  ["id", "id-ID"],
  ["it", "it-IT"],
  ["ja", "ja-JP"],
  ["kn", "kn-IN"],
  ["ko", "ko-KR"],
  ["lv", "lv-LV"],
  ["lt", "lt-LT"],
  ["ml", "ml-IN"],
  ["cmn", "cmn-CN"],
  ["zh", "cmn-CN"],
  ["mr", "mr-IN"],
  ["nb", "nb-NO"],
  ["no", "nb-NO"],
  ["pl", "pl-PL"],
  ["pt", "pt-BR"],
  ["pa", "pa-IN"],
  ["ro", "ro-RO"],
  ["ru", "ru-RU"],
  ["sr", "sr-RS"],
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
  ["ur", "ur-IN"],
  ["vi", "vi-VN"],
]);

const CHIRP_EXACT_LOCALES = new Set([
  ...CHIRP_LOCALES.values(),
  "nl-BE",
  "en-AU",
  "en-IN",
  "en-GB",
  "fr-CA",
  "es-US",
]);

/** Normalize a language tag to a published Chirp 3 HD locale. */
export function chirpLocale(language: string): string | null {
  const normalized = language.trim().replace(/_/g, "-");
  const exact = [...CHIRP_EXACT_LOCALES].find(
    (locale) => locale.toLowerCase() === normalized.toLowerCase(),
  );
  if (exact) return exact;
  const root = normalized.split("-")[0]?.toLowerCase();
  return root ? (CHIRP_LOCALES.get(root) ?? null) : null;
}

/** Whether a BCP 47 tag is on OpenAI's published TTS language list. */
export function openAiSupportsLanguage(language: string): boolean {
  const root = language.trim().replace(/_/g, "-").split("-")[0]?.toLowerCase();
  return root ? OPENAI_TTS_LANGUAGES.has(root) : false;
}

/** Prefer OpenAI; use Chirp only when OpenAI is unsupported or unavailable. */
export function createSpeechProviders(env: SpeechBindings, language: string): SpeechProvider[] {
  if (openAiSupportsLanguage(language) && env.OPENAI_API_KEY?.trim()) {
    return [createOpenAiSpeechProvider(env, language)];
  }

  const locale = chirpLocale(language);
  if (locale && env.GOOGLE_CLOUD_TTS_CREDENTIALS?.trim()) {
    return [createGoogleChirpProvider(env, { locale })];
  }

  return [];
}
