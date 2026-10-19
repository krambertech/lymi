type NativeVoice = { voice: string; name: string };

// Native reference voices; English reference voices can drift on short foreign words.
export const NATIVE_SPEECH_VOICES: Readonly<Record<string, NativeVoice>> = {
  ar: { voice: "jAAHNNqlbAX9iWjJPEtE", name: "Sara - Soft, Calm and Gentle" },
  cs: { voice: "KIDKfqJyZ6ASuyzsKfh5", name: "Jan - Kind Educator" },
  da: { voice: "xj6X4BCUsv9oxohm1E8o", name: "Søren - Clear, Confident and Versatile" },
  de: { voice: "FTNCalFNG5bRnkkaP5Ug", name: "Otto - Casual and Normal" },
  el: { voice: "20zUtLxCwVzsFDWub4sB", name: "Stefanos - Calm, Narrational and Soft" },
  es: { voice: "Nh2zY9kknu6z4pZy6FhD", name: "David Martin - Confident and Balanced" },
  et: { voice: "jGja51dd7gcoK0zkxeyg", name: "Priit" },
  fi: { voice: "YSabzCJMvEHDduIDMdwV", name: "Aurora - Cheerful, Optimistic and Round" },
  fr: { voice: "aQROLel5sQbj1vuIVi6B", name: "Nicolas - Narrator" },
  he: { voice: "6WRlPmU1fqPwYbSxeP16", name: "Noa - Warm, Patient Narrator" },
  hi: { voice: "MF4J4IDTRo0AxOO4dpFR", name: "Devi - Encouraging and Motivating" },
  it: { voice: "HuK8QKF35exsCh2e7fLT", name: "Carmelo La Rosa - Deep and Balanced" },
  ja: { voice: "vzIXwvf41vKosKu00hYj", name: "Hiroki - Calm and Precise" },
  ko: { voice: "s07IwTCOrCDCaETjUVjx", name: "Hyunbin - Diplomatic, Clear and Measured" },
  nl: { voice: "YUdpWWny7k5yb4QCeweX", name: "Ruth - Warm and Dynamic Narrator" },
  // Oslo; chosen over Gemini, Olaf, Martin and Maja E, docs/proposals/long-tail-languages.md.
  nb: { voice: "uNsWM1StCcpydKYOjKyu", name: "Mia Starset - Clear and Friendly" },
  pl: { voice: "H5xTcsAIeS5RAykjz57a", name: "Alex - Warm Storyteller" },
  "pt-BR": { voice: "Qrdut83w0Cr152Yb4Xn3", name: "Paulo - Expressive and Confident" },
  ro: { voice: "am5XuPVtut7uKJQKMja2", name: "Mike L - Soft, Clear and Charming" },
  // Stresses the U+0301 syllable in 37 of 40 marked words and sounds native, PR #864.
  ru: { voice: "3EuKHIEZbSzrHGNmdYsx", name: "Nikolay" },
  sr: { voice: "g8TYYIFt2Qo27yGQmTYq", name: "Jovana - Warm Serbian Narrator" },
  // Stockholm; chosen over Gemini, Sanna Hartfield and Adam Composer, docs/proposals/long-tail-languages.md.
  sv: { voice: "kPdGSxhZAqy4bmPAf9iJ", name: "Evelina - Calm, Clear and Engaging" },
  tr: { voice: "RXCCWbOxP7Hisa63Xsv5", name: "Adam - Calm, Relaxing and Informative" },
  uk: { voice: "9Sj8ugvpK1DmcAXyvi3a", name: "Alex Nekrasov - Confident and Clear" },
  // Northern; chosen over Gemini and four native voices, docs/proposals/long-tail-languages.md.
  vi: { voice: "aN7cv9yXNrfIR87bDmyD", name: "Ninh Đôn - Deep and Warm" },
  cmn: { voice: "bhJUNIXWQQ94l8eI2VUf", name: "Amy - Friendly, Young and Natural" },
  // Traditional tags speak with a Taiwan voice; chosen on 一 and 不 sandhi and 行 háng/xíng, PR #869.
  "cmn-TW": { voice: "Z8Aisvg1z70p27kGvkZZ", name: "Ling - Steady, Calm and Grounded" },
};

const DEFAULT_NATIVE_SPEECH_LANGUAGES = new Set([
  "ar",
  "pt-BR",
  "cmn-CN",
  "cmn-TW",
  "da",
  "nl",
  "et",
  "fi",
  "fr",
  "de",
  "el",
  "it",
  "ja",
  "ko",
  "nb",
  "ru",
  "sv",
  "uk",
  "vi",
]);

export function nativeSpeechVoice(locale: string, overrides?: string): NativeVoice | null {
  let configured: Record<string, unknown> = {};
  if (overrides?.trim()) {
    try {
      const parsed: unknown = JSON.parse(overrides);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        configured = parsed as Record<string, unknown>;
      }
    } catch {
      // A malformed optional voice map must not prevent Gemini or a stored clip from playing.
    }
  }
  const root = locale.split("-")[0] ?? locale;
  const alias = ({ nb: "no", cmn: "zh" } as Record<string, string>)[root];
  for (const key of [locale, root, ...(alias ? [alias] : [])]) {
    if (!(key in configured)) continue;
    const voice = configured[key];
    if (voice === null) return null;
    if (typeof voice === "string" && /^[a-zA-Z0-9]{16,64}$/.test(voice)) {
      return { voice, name: "Configured voice" };
    }
  }
  if (!DEFAULT_NATIVE_SPEECH_LANGUAGES.has(locale) && !DEFAULT_NATIVE_SPEECH_LANGUAGES.has(root)) {
    return null;
  }
  return NATIVE_SPEECH_VOICES[locale] ?? NATIVE_SPEECH_VOICES[root] ?? null;
}
