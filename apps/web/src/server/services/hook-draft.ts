import {
  CARD_LIMITS,
  effectiveModes,
  headword,
  modesFromDirections,
  type ReviewModeKey,
} from "@lymi/core";
import { and, eq, isNull } from "@lymi/core/db";
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
  "- The card lists the modes it is asked in. meaning_to_term: the learner sees the meaning and recalls the term, so never write the term or any word of it in its own spelling. term_to_meaning: the learner sees the term and recalls the meaning, so never write the meaning or a word sharing its root. image_to_term asks for the term as meaning_to_term does, and image_to_meaning asks for the meaning as term_to_meaning does.",
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

/** Lowercase, without accents, so "Kõrvits" and "korvits" compare alike, and "ё" reads as "е". */
function fold(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

/** Short words that carry no meaning of their own, so a hook may say them whatever the card is. */
const FUNCTION_WORDS = new Set([
  "the",
  "and",
  "for",
  "but",
  "not",
  "you",
  "are",
  "was",
  "his",
  "her",
  "its",
  "who",
  "how",
  "что",
  "как",
  "это",
  "для",
  "или",
  "при",
  "над",
  "под",
  "без",
  "его",
  "она",
  "они",
  "кто",
  "так",
  "уже",
  "ещё",
  "еще",
  "щоб",
  "або",
  "вже",
  "вони",
]);

/** The words of a text worth guarding: three letters or more, parentheses and function words left out. */
function contentWords(text: string): string[] {
  return fold(text.replace(/\([^)]*\)/g, " "))
    .split(/[^\p{L}]+/u)
    .filter((word) => word.length >= 3 && !FUNCTION_WORDS.has(word));
}

/**
 * True when one of `words` appears in `hook`. A short word must match whole; a longer one matches
 * on its first letters, up to four, so an inflection or a vowel change in the ending counts too:
 * "слабый" catches "слабая", "приносить" catches "принёс".
 */
function mentions(hook: string, words: readonly string[]): boolean {
  const said = contentWords(hook);
  return words.some((word) => {
    if (word.length <= 3) return said.includes(word);
    const stem = word.slice(0, Math.max(3, Math.min(4, word.length - 2)));
    return said.some((w) => w.startsWith(stem));
  });
}

/** Modes that ask for the term, the meaning, or both, picture modes included. */
const ASKS_TERM = new Set<ReviewModeKey>(["meaning_to_term", "image_to_term"]);
const ASKS_MEANING = new Set<ReviewModeKey>(["term_to_meaning", "image_to_meaning"]);

/**
 * Whether a draft gives away what the card asks for: the term where the meaning or a picture is
 * the cue, the meaning where the term or a picture is. A sound-alike in the learner's script is not
 * the term.
 */
export function givesAway(hook: string, card: HookCard): boolean {
  const asks = (modes: Set<ReviewModeKey>) => card.asked.some((mode) => modes.has(mode));
  if (asks(ASKS_TERM) && mentions(hook, contentWords(headword(card.term)))) return true;
  return asks(ASKS_MEANING) && mentions(hook, contentWords(card.meaning));
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
    asked: card.asked,
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
  const { meaningLanguage } = await getSettings(ctx);
  const subject = {
    term: card.term,
    meaning: card.meaning ?? "",
    language: card.language ?? "",
    pronunciation: card.pronunciation,
  };
  if (!hookable(subject, meaningLanguage)) return null;
  const [deck] = await ctx.db
    .select({ directions: schema.decks.directions })
    .from(schema.decks)
    .where(eq(schema.decks.id, card.deckId));
  const asked = card.directions
    ? effectiveModes(card.directions, card.reviewModeKeys)
    : modesFromDirections(deck?.directions ?? "recognition");
  const hookCard = { ...subject, asked };
  // A kept draft is checked again, since the card's modes or its deck's may have changed since.
  if (card.hookDraft === "") return null;
  if (card.hookDraft !== null && !givesAway(card.hookDraft, hookCard)) return card.hookDraft;
  if (!provider) return null;

  // A reply can come back empty or break a rule now and then, so one more try before keeping "none".
  let draft: string | null;
  try {
    draft = (await draftHook(provider, hookCard)) ?? (await draftHook(provider, hookCard));
  } catch (error) {
    // An outage is not an answer, so nothing is kept and the next editor asks again.
    console.error("Drafting a hook failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return null;
  }
  // Only while the card still reads as it did and no other request kept a draft meanwhile.
  await ctx.db
    .update(schema.cards)
    .set({ hookDraft: draft ?? "" })
    .where(
      and(
        eq(schema.cards.id, card.id),
        eq(schema.cards.term, card.term),
        eq(schema.cards.meaning, subject.meaning),
        card.hookDraft === null
          ? isNull(schema.cards.hookDraft)
          : eq(schema.cards.hookDraft, card.hookDraft),
      ),
    );
  return draft;
}
