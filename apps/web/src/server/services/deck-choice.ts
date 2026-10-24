import { LanguageTag, languageOfScript } from "@lymi/core";
import { and, count, desc, eq, isNotNull, isNull, max } from "@lymi/core/db";
import { z } from "zod";
import type { TextProvider } from "../ai";
import { schema } from "../db";
import { aiAllowedFor } from "./ai-consent";
import type { ServiceContext } from "./context";

/** A deck the learner can add to, with the language its cards are in. */
export type LanguageDeck = { id: string; language: string; lastAdded: number };

const Reply = z.object({ language: z.string().nullable() });

const REPLY_SCHEMA = {
  name: "term_language",
  schema: {
    type: "object",
    properties: { language: { type: ["string", "null"], maxLength: 12 } },
    required: ["language"],
    additionalProperties: false,
  },
} as const;

const INSTRUCTIONS =
  "A language learner shared a word or phrase from another app to add it to one of their decks. " +
  "You are given the term, where it came from when known, and the languages their decks teach as BCP 47 tags. " +
  "Return the one tag from that list that the term is written in. " +
  "Return null when the term could be in more than one of them, is in none of them, or you are not confident.";

/**
 * The language the term is written in, out of the learner's: a script only one language uses
 * settles it, and otherwise the model chooses among them. Null when neither can tell, when no
 * model is configured, or when it fails, so the caller keeps its own choice.
 */
export async function termLanguage(
  term: string,
  source: string | undefined,
  languages: readonly string[],
  provider: TextProvider | null,
): Promise<string | null> {
  const script = languageOfScript([term]);
  if (script) return languages.includes(script) ? script : null;
  if (!provider) return null;
  try {
    const reply = Reply.safeParse(
      await provider.complete({
        instructions: INSTRUCTIONS,
        input: JSON.stringify({ term, ...(source ? { source } : {}), languages }),
        schema: REPLY_SCHEMA,
        effort: "low",
      }),
    );
    const tag = reply.success ? reply.data.language?.trim() : undefined;
    return tag && LanguageTag.safeParse(tag).success && languages.includes(tag) ? tag : null;
  } catch {
    console.warn("Choosing a deck for a shared term failed; the phone keeps its deck");
    return null;
  }
}

/** Of the decks in the term's language, the one the learner added to last. */
export function deckFor(decks: readonly LanguageDeck[], language: string | null): string | null {
  const matching = decks.filter((d) => d.language === language);
  matching.sort((a, b) => b.lastAdded - a.lastAdded);
  return matching[0]?.id ?? null;
}

/**
 * The learner's own active decks with the language each teaches: its default language, or else
 * the language most of its cards are in. A deck with neither is left out.
 */
async function languageDecks(ctx: ServiceContext): Promise<LanguageDeck[]> {
  const decks = await ctx.db
    .select({ id: schema.decks.id, language: schema.decks.defaultLanguage })
    .from(schema.decks)
    .where(and(eq(schema.decks.userId, ctx.userId), isNull(schema.decks.archivedAt)));
  if (decks.length === 0) return [];
  const rows = await ctx.db
    .select({
      deckId: schema.cards.deckId,
      language: schema.cards.language,
      cards: count(),
      lastAdded: max(schema.cards.createdAt),
    })
    .from(schema.cards)
    .where(
      and(
        eq(schema.cards.userId, ctx.userId),
        isNull(schema.cards.archivedAt),
        isNotNull(schema.cards.language),
      ),
    )
    .groupBy(schema.cards.deckId, schema.cards.language)
    .orderBy(desc(count()));
  return decks.flatMap((deck) => {
    const own = rows.filter((r) => r.deckId === deck.id);
    const language = deck.language ?? own[0]?.language;
    if (!language) return [];
    const lastAdded = Math.max(0, ...own.map((r) => r.lastAdded?.getTime() ?? 0));
    return [{ id: deck.id, language, lastAdded }];
  });
}

/**
 * The deck a term shared from another app belongs in: the learner's deck in the term's language,
 * the one added to last when several teach it. Reads only; nothing is written or audited.
 */
export async function chooseDeck(
  ctx: ServiceContext,
  input: { term: string; source?: string | undefined },
  provider: TextProvider | null,
): Promise<{ deckId: string | null; language: string | null }> {
  const decks = await languageDecks(ctx);
  const languages = [...new Set(decks.map((d) => d.language))];
  // One language among the decks gives nothing to choose by.
  if (languages.length < 2) return { deckId: null, language: null };
  // Without the learner's yes only the script decides.
  const model = (await aiAllowedFor(ctx)) ? provider : null;
  const language = await termLanguage(input.term, input.source, languages, model);
  return { deckId: deckFor(decks, language), language };
}
