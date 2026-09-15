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
