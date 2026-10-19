import type { Card } from "@lymi/core/schema";

/** What a lead-in is written from: the written term, what is spoken, and the sense meant. */
export interface LeadInInput {
  term: string;
  reading: string;
  meaning: string;
}

/** Why a card is spoken without a lead-in before any model is asked. */
export type LeadInSkip =
  | "no_reading"
  | "no_meaning"
  | "long_meaning"
  | "sentence"
  | "loanword"
  | "long";

/**
 * How one language decides and writes the words said before a term, so speech hears the sense
 * meant. Adding a language is adding a policy and its evaluation cases.
 */
export interface LeadInPolicy {
  /** The card language's primary subtag. */
  language: string;
  /** The language's English name, as the decision model reads it. */
  name: string;
  /** Bump to decide and write every card of this language again. */
  version: number;
  /** Free checks, so most cards never reach a model. */
  screen(card: Card): LeadInInput | LeadInSkip;
  /** The decision model's yes-or-no question about one card's reading. */
  question: string;
  /** At or above this score the writer is asked; fitted on the language's evaluation cases. */
  threshold: number;
  instructions: string;
  accepts(previousText: string | null, input: LeadInInput): boolean;
}
