/**
 * The scripts each language is written in, so a term in another script can be caught before it
 * lands in the wrong deck. Keyed by primary subtag; a language missing here is never refused.
 */
const LATIN = "Latin";
const CYRILLIC = "Cyrillic";
const ARABIC = "Arabic";
const DEVANAGARI = "Devanagari";

const WRITTEN_IN: Readonly<Record<string, readonly string[]>> = {
  ja: ["Han", "Hiragana", "Katakana"],
  zh: ["Han", "Bopomofo"],
  yue: ["Han"],
  ko: ["Hangul", "Han"],
  el: ["Greek"],
  he: ["Hebrew"],
  yi: ["Hebrew"],
  ar: [ARABIC],
  fa: [ARABIC],
  ur: [ARABIC],
  ps: [ARABIC],
  hi: [DEVANAGARI],
  mr: [DEVANAGARI],
  ne: [DEVANAGARI],
  sa: [DEVANAGARI],
  bn: ["Bengali"],
  pa: ["Gurmukhi"],
  gu: ["Gujarati"],
  ta: ["Tamil"],
  te: ["Telugu"],
  kn: ["Kannada"],
  ml: ["Malayalam"],
  si: ["Sinhala"],
  th: ["Thai"],
  lo: ["Lao"],
  km: ["Khmer"],
  my: ["Myanmar"],
  ka: ["Georgian"],
  hy: ["Armenian"],
  am: ["Ethiopic"],
  sr: [CYRILLIC, LATIN],
  ...Object.fromEntries(
    ["ru", "uk", "be", "bg", "mk", "kk", "ky", "mn", "tg", "tt", "ba"].map((tag) => [
      tag,
      [CYRILLIC],
    ]),
  ),
  ...Object.fromEntries(
    [
      "af",
      "az",
      "ca",
      "cs",
      "cy",
      "da",
      "de",
      "en",
      "eo",
      "es",
      "et",
      "eu",
      "fi",
      "fil",
      "fr",
      "ga",
      "gl",
      "hr",
      "hu",
      "id",
      "is",
      "it",
      "la",
      "lt",
      "lv",
      "ms",
      "mt",
      "nb",
      "nl",
      "nn",
      "no",
      "pl",
      "pt",
      "ro",
      "sk",
      "sl",
      "sq",
      "sv",
      "sw",
      "tl",
      "tr",
      "uz",
      "vi",
    ].map((tag) => [tag, [LATIN]]),
  ),
};

const patterns = new Map<string, RegExp>();

/**
 * Whether text could be in the language: it has a letter in one of the language's scripts, or no
 * letters at all. A Japanese deck takes Tシャツ and refuses trattoria; it cannot tell Italian from
 * Spanish, which share a script.
 */
export function fitsLanguage(text: string, language: string | null | undefined): boolean {
  const primary = (language ?? "").trim().toLowerCase().split(/[-_]/)[0] ?? "";
  const scripts = WRITTEN_IN[primary];
  if (!scripts || !/\p{L}/u.test(text)) return true;
  let pattern = patterns.get(primary);
  if (!pattern) {
    pattern = new RegExp(scripts.map((script) => `\\p{Script=${script}}`).join("|"), "u");
    patterns.set(primary, pattern);
  }
  return pattern.test(text);
}
