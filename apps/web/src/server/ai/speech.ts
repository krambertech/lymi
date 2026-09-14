import { createGoogleChirpProvider } from "./google-chirp";
import { createGoogleGeminiProvider, type GoogleGeminiBindings } from "./google-gemini";
import { createOpenAiSpeechProvider, type OpenAiSpeechBindings } from "./openai-speech";
import type { SpeechProvider } from "./types";

type SpeechBindings = GoogleGeminiBindings & OpenAiSpeechBindings;

// https://docs.cloud.google.com/text-to-speech/docs/gemini-tts#available_languages
// One default locale per root; Arabic uses the Modern Standard "World" locale.
const GEMINI_LOCALES = new Map<string, string>([
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
]);

const GEMINI_EXACT_LOCALES = new Set([
  ...GEMINI_LOCALES.values(),
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

/** Normalize a language tag to a published Gemini-TTS locale, keeping a supported region. */
export function geminiLocale(language: string): string | null {
  return publishedLocale(language, GEMINI_LOCALES, GEMINI_EXACT_LOCALES);
}

/** Normalize a language tag to a published Chirp 3 HD locale. */
export function chirpLocale(language: string): string | null {
  return publishedLocale(language, CHIRP_LOCALES, CHIRP_EXACT_LOCALES);
}

function publishedLocale(
  language: string,
  defaults: Map<string, string>,
  exact: Set<string>,
): string | null {
  const normalized = language.trim().replace(/_/g, "-").toLowerCase();
  const match = [...exact].find((locale) => locale.toLowerCase() === normalized);
  if (match) return match;
  const root = normalized.split("-")[0];
  return root ? (defaults.get(root) ?? null) : null;
}

/** Whether a BCP 47 tag is on OpenAI's published TTS language list. */
export function openAiSupportsLanguage(language: string): boolean {
  const root = language.trim().replace(/_/g, "-").split("-")[0]?.toLowerCase();
  return root ? OPENAI_TTS_LANGUAGES.has(root) : false;
}

/** Gemini first, then Chirp's native voices; OpenAI is last because it cannot pin a locale. */
export function createSpeechProviders(env: SpeechBindings, language: string): SpeechProvider[] {
  const providers: SpeechProvider[] = [];
  const google = Boolean(env.GOOGLE_CLOUD_TTS_CREDENTIALS?.trim());

  const gemini = geminiLocale(language);
  if (gemini && google) providers.push(createGoogleGeminiProvider(env, { locale: gemini }));

  const chirp = chirpLocale(language);
  if (chirp && google) providers.push(createGoogleChirpProvider(env, { locale: chirp }));

  if (openAiSupportsLanguage(language) && env.OPENAI_API_KEY?.trim()) {
    providers.push(createOpenAiSpeechProvider(env, language));
  }

  return providers;
}
