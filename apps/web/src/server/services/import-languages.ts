import { LanguageTag, languageOfScript } from "@lymi/core";
import { z } from "zod";
import type { TextProvider } from "../ai";

/** Terms read from each deck for detection: enough to see past a stray loanword, few enough for one call. */
export const TERMS_PER_DECK = 12;

export type DeckTerms = { key: string; name: string; terms: string[] };

const Reply = z.object({
  decks: z.array(z.object({ key: z.string(), language: z.string().nullable() })),
});

const REPLY_SCHEMA = {
  name: "deck_languages",
  schema: {
    type: "object",
    properties: {
      decks: {
        type: "array",
        items: {
          type: "object",
          properties: {
            key: { type: "string" },
            language: { type: ["string", "null"], maxLength: 12 },
          },
          required: ["key", "language"],
          additionalProperties: false,
        },
      },
    },
    required: ["decks"],
    additionalProperties: false,
  },
} as const;

const INSTRUCTIONS =
  "You are given decks from a learner's flashcard collection, each with its name and a sample of the terms on its cards. " +
  "For each deck, return the BCP 47 tag of the language the terms are written in, such as it, uk, zh or pt-BR. " +
  "Judge by the terms; use the name only to choose between languages that share a script, such as Japanese kanji and Chinese. " +
  "Return null when the terms are in no one language, such as formulas, symbols or a mix of languages, or when you are not confident. " +
  "Return one entry per deck, with the key you were given.";

/**
 * Each deck's language read from its terms: a script only one language uses settles it here,
 * and the rest go to the model in one call. A deck neither can place is left out of the result,
 * as is every model deck when the model is unconfigured or fails, so the import never waits on it.
 */
export async function detectDeckLanguages(
  decks: readonly DeckTerms[],
  provider: TextProvider | null,
): Promise<Record<string, string>> {
  const found: Record<string, string> = {};
  const unsure: DeckTerms[] = [];
  for (const deck of decks) {
    const script = languageOfScript(deck.terms);
    if (script) found[deck.key] = script;
    else if (deck.terms.length > 0) unsure.push(deck);
  }
  if (!provider || unsure.length === 0) return found;
  try {
    const reply = Reply.safeParse(
      await provider.complete({
        instructions: INSTRUCTIONS,
        input: JSON.stringify({
          decks: unsure.map((d) => ({ key: d.key, name: d.name, terms: d.terms })),
        }),
        schema: REPLY_SCHEMA,
      }),
    );
    const keys = new Set(unsure.map((d) => d.key));
    for (const deck of reply.success ? reply.data.decks : []) {
      const tag = deck.language?.trim();
      if (keys.has(deck.key) && tag && LanguageTag.safeParse(tag).success) found[deck.key] = tag;
    }
  } catch {
    console.warn("Detecting import deck languages failed; falling back to deck names");
  }
  return found;
}
