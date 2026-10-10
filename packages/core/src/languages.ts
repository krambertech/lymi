/** Languages offered by name. Any other BCP 47 tag can still be typed in. */
export const LANGUAGE_TAGS = [
  "ar",
  "bg",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "es",
  "et",
  "fa",
  "fi",
  "fr",
  "he",
  "hi",
  "hr",
  "hu",
  "id",
  "it",
  "ja",
  "ko",
  "lt",
  "lv",
  "nl",
  "no",
  "pl",
  "pt",
  "pt-BR",
  "ro",
  "ru",
  "sk",
  "sl",
  "sr",
  "sv",
  "th",
  "tr",
  "uk",
  "vi",
  "zh",
] as const;

type Matcher = { tag: string; words: string[]; phrases: string[] };
let matchers: Matcher[] | null = null;

const fold = (text: string) => text.normalize("NFC").toLocaleLowerCase();

function build(): Matcher[] {
  const english = new Intl.DisplayNames(["en"], { type: "language" });
  return LANGUAGE_TAGS.filter((tag) => !tag.includes("-")).map((tag) => {
    const names = new Set<string>();
    for (const name of [
      english.of(tag),
      new Intl.DisplayNames([tag], { type: "language" }).of(tag),
    ]) {
      // "Norwegian Bokmål" and "norsk bokmål" are also found as "Norwegian" and "norsk".
      if (name)
        for (const part of [name, name.split(/[\s(]/)[0] ?? ""]) if (part) names.add(fold(part));
    }
    const all = [...names];
    return {
      tag,
      words: all.filter(
        (name) => /^\p{Script=Latin}+$/u.test(name) || /^\p{Script=Cyrillic}+$/u.test(name),
      ),
      phrases: all.filter((name) => !/^[\p{Script=Latin}\p{Script=Cyrillic}]+$/u.test(name)),
    };
  });
}

/**
 * The language a deck's name says it is in, by the language's English or native name:
 * "Italian::Lesson 1" is Italian, "日本語 N5" is Japanese. The leftmost name wins. Null when
 * the name says nothing, so the learner chooses.
 */
export function guessLanguage(name: string): string | null {
  matchers ??= build();
  const text = fold(name);
  let best: { tag: string; at: number } | null = null;
  const consider = (tag: string, at: number) => {
    if (at >= 0 && (!best || at < best.at)) best = { tag, at };
  };
  const words = [...text.matchAll(/[\p{L}\p{M}]+/gu)];
  for (const matcher of matchers) {
    for (const word of words)
      if (matcher.words.includes(word[0])) consider(matcher.tag, word.index);
    for (const phrase of matcher.phrases) consider(matcher.tag, text.indexOf(phrase));
  }
  return (best as { tag: string } | null)?.tag ?? null;
}

/** Scripts only one language in Lymi's reach is written in, so a sample of terms settles it. */
const SCRIPTS: [RegExp, string][] = [
  [/[\p{Script=Hiragana}\p{Script=Katakana}]/u, "ja"],
  [/\p{Script=Hangul}/u, "ko"],
  [/\p{Script=Greek}/u, "el"],
  [/\p{Script=Hebrew}/u, "he"],
  [/\p{Script=Thai}/u, "th"],
  [/\p{Script=Georgian}/u, "ka"],
  [/\p{Script=Armenian}/u, "hy"],
];

/**
 * The language a deck's terms are written in, when their script says so on its own: kana is
 * Japanese, Hangul Korean. Han, Cyrillic, Arabic and Latin are shared by many languages, so
 * those decks are null here and left to the model. Most terms must agree, so a Japanese loanword
 * in a Spanish deck decides nothing.
 */
export function languageOfScript(terms: readonly string[]): string | null {
  const counts = new Map<string, number>();
  for (const term of terms) {
    const match = SCRIPTS.find(([pattern]) => pattern.test(term));
    if (match) counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  const [best] = [...counts].sort((a, b) => b[1] - a[1]);
  return best && best[1] * 2 > terms.length ? best[0] : null;
}
