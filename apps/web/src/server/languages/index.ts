/**
 * Each supported language's AI text, one module per language, so generic prompts never name one.
 * docs/proposals/supported-languages.md.
 */
import { type SupportedTag, supportedLanguage } from "@lymi/core";
import { chinese } from "./chinese";
import { japanese } from "./japanese";
import type { LanguagePrompts } from "./types";

export type { FieldGuide, LanguageCheck, LanguagePrompts } from "./types";

export const LANGUAGE_PROMPTS = {
  ja: japanese,
  zh: chinese,
} as const satisfies Record<SupportedTag, LanguagePrompts>;

/** The AI text for a supported language, or null for any other. */
export function languagePrompts(tag: string | null | undefined): LanguagePrompts | null {
  const support = supportedLanguage(tag);
  return support ? LANGUAGE_PROMPTS[support.tag] : null;
}

/** What a reading printed in a lesson looks like in this language, or undefined when no rule says. */
export function lessonReading(tag: string | null | undefined): string | undefined {
  return languagePrompts(tag)?.lesson;
}
