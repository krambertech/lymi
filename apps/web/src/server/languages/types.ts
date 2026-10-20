import type { EnrichedField, SupportedTag } from "@lymi/core";

/**
 * How to write each field of a card in one language, as the enrichment guide says it. A language
 * with a format in core takes its pronunciation and example lines from there instead.
 */
export type FieldGuide = Partial<Record<"meaning" | "example" | "notes" | "pronunciation", string>>;

/** A rule the evaluation holds this language's replies to, beside the house rules in checks.ts. */
export type LanguageCheck = {
  field: EnrichedField;
  rule: string;
  pass: (text: string) => boolean;
};

/**
 * What one supported language tells the model at each AI call site. Every slot reaches the model
 * as per-deck or per-card input, so system prompts stay static and name no language.
 */
export interface LanguagePrompts {
  tag: SupportedTag;
  /** Enrichment: the deck's field guide, then one worked example in the system prompt's format. */
  enrich: { guide: FieldGuide; example: string };
  /** Adding cards from a lesson: what a reading the lesson prints looks like. */
  lesson: string;
  /** Memory hooks: advice for this language's terms, or null when the generic method serves. */
  hook: string | null;
  checks: readonly LanguageCheck[];
}
