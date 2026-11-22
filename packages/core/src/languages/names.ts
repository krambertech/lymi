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
  "fil",
  "fi",
  "fr",
  "he",
  "hi",
  "hr",
  "hu",
  "hy",
  "id",
  "is",
  "it",
  "ja",
  "ka",
  "ko",
  "lt",
  "lv",
  "nl",
  "nn",
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
  "ta",
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
  return LANGUAGE_TAGS.map((tag) => {
    const names = new Set<string>();
    for (const name of [
      english.of(tag),
      new Intl.DisplayNames([tag], { type: "language" }).of(tag),
    ]) {
      if (name) names.add(fold(name));
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

export function guessLanguage(name: string): string | null {
  matchers ??= build();
  const text = fold(name);
  let best: { tag: string; at: number; length: number } | null = null;
  const consider = (tag: string, at: number, { length }: string) => {
    if (at < 0) return;
    if (!best || at < best.at || (at === best.at && length > best.length)) {
      best = { tag, at, length };
    }
  };
  const words = [...text.matchAll(/[\p{L}\p{M}]+/gu)];
  for (const matcher of matchers) {
    for (const word of words)
      if (matcher.words.includes(word[0])) consider(matcher.tag, word.index, word[0]);
    for (const phrase of matcher.phrases) consider(matcher.tag, text.indexOf(phrase), phrase);
  }
  return (best as { tag: string } | null)?.tag ?? null;
}

const SCRIPTS: [RegExp, string][] = [
  [/[\p{Script=Hiragana}\p{Script=Katakana}]/u, "ja"],
  [/\p{Script=Hangul}/u, "ko"],
  [/\p{Script=Greek}/u, "el"],
  [/\p{Script=Hebrew}/u, "he"],
  [/\p{Script=Thai}/u, "th"],
  [/\p{Script=Georgian}/u, "ka"],
  [/\p{Script=Armenian}/u, "hy"],
];

export function languageOfScript(terms: readonly string[]): string | null {
  const counts = new Map<string, number>();
  for (const term of terms) {
    const match = SCRIPTS.find(([pattern]) => pattern.test(term));
    if (match) counts.set(match[1], (counts.get(match[1]) ?? 0) + 1);
  }
  const [best] = [...counts].sort((a, b) => b[1] - a[1]);
  return best && best[1] * 2 > terms.length ? best[0] : null;
}
