import {
  CARD_LIMITS,
  effectiveModes,
  headword,
  modesFromDirections,
  type ReviewModeKey,
} from "@lymi/core";
import { and, eq } from "@lymi/core/db";
import { z } from "zod";
import type { TextProvider } from "../ai";
import { schema } from "../db";
import { getCard } from "./cards";
import { type ServiceContext, ServiceError } from "./context";
import { getSettings } from "./settings";

/**
 * What the model sees of a card: the term, its meaning, the term's language, and the text modes
 * it is asked in, which decide what the hook must never write.
 */
export type HookCard = {
  term: string;
  meaning: string;
  language: string;
  pronunciation?: string | null | undefined;
  asked: readonly ReviewModeKey[];
};

/** One line the learner can read in a glance under the cue. */
const MAX_WORDS = 6;

export const HOOK_INSTRUCTIONS = [
  "You write one memory hook for a language learner's vocabulary card: a tiny mnemonic that brings the answer back when the card's cue is shown.",
  "Write the hook entirely in the language the card's meaning is written in, the learner's own language. No words of the language being learned appear in it.",
  "Use the keyword method. Say the term aloud the way a native speaker does, using its pronunciation when one is given. Think of several common words or well-known names in the learner's language that start with the same sounds, and keep the one that sounds closest and pictures most easily. Write the sound it shares with the term in capitals. Then tie that keyword to the meaning as directly as possible, in a picture you could draw in one line.",
  "For a card asked meaning first, the strongest pattern is the keyword doing the meaning, often just two or three words. These are the learner's own hooks, the standard to match:",
  "- kurb (Estonian, грустный): КУРБан грустит",
  "- nõrk (Estonian, слабый): НОРКа слабая",
  "- meri (Estonian, море): МЭРИ у моря",
  "- vaatama (Estonian, смотреть): Смотри, ВАТА летит!",
  "- astuma (Estonian, шагать): пАСТУх шагает за стадом",
  "- tooma (Estonian, приносить): ТОМ принёс томатный сок",
  "For a card asked term first, the learner sees the term and recalls the meaning, so the scene suggests the meaning without naming it:",
  "- sbrigarsi (Italian, to hurry up): fire BRIGAde scrambling out",
  "Rules:",
  `- At most ${MAX_WORDS} words, one line. Shorter is better. No explanation, quotation marks, emoji or arrows.`,
  "- The keyword is a real everyday word or a name everyone knows, never a made-up word, a fragment split across words, or a brand or abbreviation.",
  "- The keyword must truly sound like the start of the term. If no keyword sounds close, return null.",
  "- The picture is ordinary and instant: no puzzles, nothing surreal, no alcohol, drugs, violence or illness.",
  "- The card lists the modes it is asked in. meaning_to_term: the learner sees the meaning and recalls the term, so never write the term or any word of it in its own spelling. term_to_meaning: the learner sees the term and recalls the meaning, so never write the meaning or a word sharing its root.",
  "- A term with forms separated by ' · ' is hooked on its first form.",
  "- A phrase of up to three words is hooked on its hardest word. Return null for a longer sentence.",
  "- Return null when the term is in the same language as its meaning, or when the card is not a word or phrase with a translation. Null is better than a strange hook.",
].join("\n");

const REPLY_SCHEMA = {
  name: "memory_hook",
  schema: {
    type: "object",
    properties: { hook: { type: ["string", "null"], maxLength: CARD_LIMITS.hook } },
    required: ["hook"],
    additionalProperties: false,
  },
} as const;

const Reply = z.object({ hook: z.string().nullable() });

/** Lowercase, without accents, so "Kõrvits" and "korvits" compare alike. */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** The words of a text worth guarding: four letters or more, parentheses left out. */
function contentWords(text: string): string[] {
  return fold(text.replace(/\([^)]*\)/g, " "))
    .split(/[^\p{L}]+/u)
    .filter((word) => word.length >= 4);
}

/** True when one of `words` appears in `hook`, compared on the first five letters so inflections count. */
function mentions(hook: string, words: readonly string[]): boolean {
  const said = contentWords(hook);
  return words.some((word) => {
    const stem = word.slice(0, 5);
    return said.some((w) => w.startsWith(stem) || (w.length >= 4 && stem.startsWith(w)));
  });
}

/**
 * Whether a draft gives away what the card asks for: the term where the meaning is the cue, the
 * meaning where the term is. A sound-alike written in the learner's own script is not the term.
 */
export function givesAway(hook: string, card: HookCard): boolean {
  if (card.asked.includes("meaning_to_term") && mentions(hook, contentWords(headword(card.term)))) {
    return true;
  }
  return card.asked.includes("term_to_meaning") && mentions(hook, contentWords(card.meaning));
}

/** The draft as the model wrote it, trimmed, or null when it broke a rule the prompt sets. */
export function acceptDraft(raw: string | null, card: HookCard): string | null {
  const hook = raw
    ?.trim()
    .replace(/^["“«]|["”»]$/g, "")
    .trim();
  if (!hook) return null;
  if (hook.includes("\n") || hook.split(/\s+/).length > MAX_WORDS) return null;
  return givesAway(hook, card) ? null : hook;
}

/**
 * Whether a card is one the keyword method fits: a word or short phrase in a language other than
 * the one its meanings are written in. A fact in the learner's own language has nothing to sound alike.
 */
export function hookable(card: Omit<HookCard, "asked">, meaningLanguage: string): boolean {
  if (!card.meaning.trim() || !card.language) return false;
  const primary = (tag: string) => tag.toLowerCase().split("-")[0];
  if (primary(card.language) === primary(meaningLanguage)) return false;
  return headword(card.term).trim().split(/\s+/).length <= 3;
}

/** One draft for one card, or null when the model has none it may offer. */
export async function draftHook(provider: TextProvider, card: HookCard): Promise<string | null> {
  const input = JSON.stringify({
    term: card.term,
    meaning: card.meaning,
    termLanguage: card.language,
    ...(card.pronunciation ? { pronunciation: card.pronunciation } : {}),
    asked: card.asked.filter((mode) => mode === "meaning_to_term" || mode === "term_to_meaning"),
  });
  const reply = Reply.safeParse(
    await provider.complete({
      instructions: HOOK_INSTRUCTIONS,
      input,
      schema: REPLY_SCHEMA,
      // Medium drafts hooks as well as high, measured on real cards, in about half the time.
      effort: "medium",
    }),
  );
  return reply.success ? acceptDraft(reply.data.hook, card) : null;
}

/**
 * The draft for the owner's hook editor: the one kept on the card, or a fresh one the AI writes
 * and keeps there. Null for a card the keyword method does not fit, where no vendor is configured,
 * or when the AI had none. Keeping the draft is bookkeeping, not a change to the card, so it is
 * not audited and leaves `updatedAt` alone.
 */
export async function hookDraftFor(
  ctx: ServiceContext,
  cardId: string,
  provider: TextProvider | null,
): Promise<string | null> {
  const card = await getCard(ctx, cardId);
  if (card.userId !== ctx.userId) {
    throw new ServiceError("forbidden", "Only the deck's owner can change its cards");
  }
  if (card.hookDraft !== null) return card.hookDraft || null;
  const { meaningLanguage } = await getSettings(ctx);
  const subject = {
    term: card.term,
    meaning: card.meaning ?? "",
    language: card.language ?? "",
    pronunciation: card.pronunciation,
  };
  if (!provider || !hookable(subject, meaningLanguage)) return null;
  const [deck] = await ctx.db
    .select({ directions: schema.decks.directions })
    .from(schema.decks)
    .where(eq(schema.decks.id, card.deckId));
  const asked = card.directions
    ? effectiveModes(card.directions, card.reviewModeKeys)
    : modesFromDirections(deck?.directions ?? "recognition");
  // A reply can come back empty or break a rule now and then, so one more try before keeping "none".
  const draft =
    (await draftHook(provider, { ...subject, asked })) ??
    (await draftHook(provider, { ...subject, asked }));
  // Only while the card still reads as it did, so a draft for an old meaning never lands.
  await ctx.db
    .update(schema.cards)
    .set({ hookDraft: draft ?? "" })
    .where(
      and(
        eq(schema.cards.id, card.id),
        eq(schema.cards.term, card.term),
        eq(schema.cards.meaning, subject.meaning),
      ),
    );
  return draft;
}
