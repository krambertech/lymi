/**
 * Each supported language's AI text, one module per language, so generic prompts never name one.
 * docs/proposals/supported-languages.md.
 */
import { languageSupport, type SupportedTag } from "@lymi/core";
import { cantonese } from "./cantonese";
import { chinese } from "./chinese";
import { japanese } from "./japanese";
import { tamil } from "./tamil";
import type { LanguagePrompts } from "./types";

export type { FieldGuide, LanguageCheck, LanguagePrompts } from "./types";

/** Every supported language, and Tamil and Cantonese, whose modules are evaluated before they join SupportedTag. */
type PromptTag = SupportedTag | "ta" | "yue";

export const LANGUAGE_PROMPTS = {
  ja: japanese,
  zh: chinese,
  ta: tamil,
  yue: cantonese,
} as const satisfies Record<PromptTag, LanguagePrompts>;

/** The AI text for a language with a prompt module, or null for any other. */
export function languagePrompts(tag: string | null | undefined): LanguagePrompts | null {
  const record = languageSupport(tag)?.tag;
  return record && Object.hasOwn(LANGUAGE_PROMPTS, record)
    ? LANGUAGE_PROMPTS[record as PromptTag]
    : null;
}

/** What a reading printed in a lesson looks like in this language, or undefined when no rule says. */
export function lessonReading(tag: string | null | undefined): string | undefined {
  return languagePrompts(tag)?.lesson;
}
