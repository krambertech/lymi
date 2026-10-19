import { LANGUAGE_PROMPTS } from ".";

/** The English names of supported languages that a generic prompt mentions. */
export function supportedNamesIn(text: string): string[] {
  const names = new Intl.DisplayNames(["en"], { type: "language" });
  return Object.keys(LANGUAGE_PROMPTS).flatMap((tag) => {
    const name = names.of(tag) ?? tag;
    return text.includes(name) ? [name] : [];
  });
}
