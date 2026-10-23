import { LANGUAGE_PROMPTS } from ".";

/** The English names of supported languages that a generic prompt mentions, besides those it may name for another reason. */
export function supportedNamesIn(text: string, except: readonly string[] = []): string[] {
  const names = new Intl.DisplayNames(["en"], { type: "language" });
  return Object.keys(LANGUAGE_PROMPTS).flatMap((tag) => {
    const name = names.of(tag) ?? tag;
    return text.includes(name) && !except.includes(name) ? [name] : [];
  });
}
