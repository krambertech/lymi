/**
 * Each supported language's AI text, one module per language, so generic prompts never name one.
 * docs/proposals/supported-languages.md.
 */
import { languageKey, type SupportedTag, supportedLanguage } from "@lymi/core";
import { japanese } from "./japanese";
import type { LanguagePrompts } from "./types";

export type { FieldGuide, LanguageCheck, LanguagePrompts } from "./types";

export const LANGUAGE_PROMPTS = {
  ja: japanese,
} as const satisfies Record<SupportedTag, LanguagePrompts>;

/** Chinese keeps its lesson reading here until its module lands. */
const CONFIGURED_LESSON: Readonly<Record<string, string>> = { zh: "pinyin" };

/** The AI text for a supported language, or null for any other. */
export function languagePrompts(tag: string | null | undefined): LanguagePrompts | null {
  const support = supportedLanguage(tag);
  return support ? LANGUAGE_PROMPTS[support.tag] : null;
}

/** What a reading printed in a lesson looks like in this language, or undefined when no rule says. */
export function lessonReading(tag: string | null | undefined): string | undefined {
  const key = languageKey(tag);
  return (
    languagePrompts(tag)?.lesson ??
    (Object.hasOwn(CONFIGURED_LESSON, key) ? CONFIGURED_LESSON[key] : undefined)
  );
}
