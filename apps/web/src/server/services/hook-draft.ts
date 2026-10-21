import {
  CARD_LIMITS,
  effectiveModes,
  headword,
  hookable,
  modesFromDirections,
  type ReviewModeKey,
} from "@lymi/core";
import { and, eq, isNotNull, isNull, ne } from "@lymi/core/db";
import { z } from "zod";
import type { TextProvider } from "../ai";
import { schema } from "../db";
import { languagePrompts } from "../languages";
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
  /** A few other meanings from the card's deck, which tell Ukrainian from Russian where one meaning cannot. */
  deckMeanings?: readonly string[];
};

/** Enough other meanings to tell the deck's meaning language apart from its closest neighbour. */
const DECK_MEANINGS = 8;

/** One line the learner can read in a glance under the cue. */
const MAX_WORDS = 6;

/** The rule now lives in core, for the clients; language tests still read it from here. */
export { hookable } from "@lymi/core";

/** Raise with any change to what the model reads, so analytics and evaluations can tell runs apart. */
export const HOOK_PROMPT_VERSION = 4;

export const HOOK_INSTRUCTIONS = [
  "You write one memory hook for a language learner's vocabulary card: a short line in the learner's own language that, once read, makes the term hard to forget.",
  "Write the hook entirely in the language the card's meaning is written in. Read the meaning text to tell which, along with deckMeanings, other meanings from the same deck in the same language, and give that language's tag in language before the hook. Most examples below are Russian, but a meaning in English gets an English hook, and a meaning in Ukrainian, with letters such as і, ї, є or ґ, gets a Ukrainian hook, never a Russian one. When the meaning alone could be either, such as магазин, the language of deckMeanings decides. No words of the language being learned appear in the hook.",
  "A hook needs two links, and both must click.",
  "Sound: words of the learner's language that, said aloud, sound like the term. Cover as much of the term's stem as you can, in its order: its stressed syllable and its distinctive consonants. An ending that every word of its kind shares, such as the -ma of an Estonian infinitive or the -ar of a Spanish verb, comes back on its own, so never spend a word covering it. A whole word that sounds like the whole stem is best. Two or three short words can chain to cover it, and the sound can hide inside a longer word instead of starting it. Sharing only the first two or three letters is the weakest link and rarely enough.",
  "Meaning: the sound words and the meaning act on each other in one scene with a reason in it. The keyword does, causes, wants or suffers the meaning, so recalling the meaning brings back the scene and the scene brings back the sound. A scene that is true to life, a small joke, a pun or a strong feeling sticks; a keyword merely placed next to the meaning does not.",
  "The line reads as natural speech someone might say, and makes literal sense. One strong keyword in a sensible scene beats a chain that forces nonsense: read the line back, and if a listener would ask what it means, it fails.",
  "Other routes, when they beat a sound-alike:",
  "- A compound: check every term for one first. When the term is two or more words joined, its parts' literal meanings joined with a plus sign are usually the best hook, because they rebuild the term itself: a glove that is literally a hand shoe. Use them when they are vivid or sensible.",
  "- A loanword or a shared root with a word the learner already knows in their own language: name that word.",
  "Work like this. Say the term aloud as a native speaker does, using its pronunciation when one is given. In candidates, write five hooks across different routes: a whole-word sound-alike, a chain of short words covering the term, a sound hidden inside a longer word, and a parts or root reading where one exists. Then copy into hook the one candidate strongest on how much of the term it sounds like, how surely it leads to the meaning, how easily it is pictured or felt, and how naturally it reads. If none is strong on all four, hook is null.",
  "A card may carry guide, advice for hooking terms in its language. Follow it.",
  "Write the sounds shared with the term in capitals.",
  "These are the learner's own hooks for cards asked meaning first, the standard to match, with what makes each work:",
  "- meri (Estonian, море): МЭРИ у моря. The whole word is a name.",
  "- kurb (Estonian, грустный): КУРБан грустит. The whole word, in a name that does the meaning.",
  "- näitama (Estonian, показывать): НЯНЯ ТАМ! Показываешь пальцем. Two words chain over the whole term, and pointing is the meaning.",
  "- tegema (Estonian, делать): ТЕ ГЕНы делают тебя тобой. A chain, with a true reason.",
  "- astuma (Estonian, шагать): пАСТУх шагает за стадом. The sound sits inside the word.",
  "- kordama (Estonian, повторять): Повтори свой реКОРД. The sound sits inside the word, and repeating a record is the meaning.",
  "- kõhn (Estonian, худой): Худой не ходит на КУХНю. A joke that is true.",
  "- elukutse (Estonian, профессия): жизнь + призвание. A compound read as its parts.",
  "Weak drafts, for contrast: ТУНДра чувствует ветер for tundma (чувствовать) only shares the first letters, and a tundra has no reason to feel; ХАРВИ появляется нечасто for harva (редко) leans on a name few people know.",
  "For a card asked term first, the learner sees the term and recalls the meaning, so the scene suggests the meaning without naming it:",
  "- sbrigarsi (Italian, to hurry up): fire BRIGAde scrambling out",
  "An English hook for a card asked meaning first works the same way:",
  "- pato (Spanish, duck): a duck asleep in a POT",
  "Rules:",
  `- At most ${MAX_WORDS} words, one line; count them before answering. Shorter is better. No explanation, quotation marks, emoji, arrows or dashes: where a pause is needed, use a comma or start a new sentence. A plus sign goes only between the parts of a compound.`,
  "- Every word is a real everyday word or a name everyone in the learner's language knows. No made-up words, brands, abbreviations or rare names.",
  "- The picture is instant: no puzzles, no alcohol, drugs, violence or illness.",
  "- The card lists the modes it is asked in. meaning_to_term: the learner sees the meaning and recalls the term, so never write the term or any word of it in its own spelling. term_to_meaning: the learner sees the term and recalls the meaning, so never write the meaning or a word sharing its root. image_to_term asks for the term as meaning_to_term does, and image_to_meaning asks for the meaning as term_to_meaning does.",
  "- A term with forms separated by ' · ' is hooked on its first form.",
  "- A phrase of up to three words is hooked on its hardest word. Return null for a longer sentence.",
  "- Return null when the term is in the same language as its meaning, or when the card is not a word or phrase with a translation. Null is better than a weak hook.",
].join("\n");

export const HOOK_REPLY_SCHEMA = {
  name: "memory_hook",
  schema: {
    type: "object",
    properties: {
      language: { type: "string" },
      candidates: { type: "array", items: { type: "string" } },
      hook: { type: ["string", "null"], maxLength: CARD_LIMITS.hook },
    },
    required: ["language", "candidates", "hook"],
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

/** What the model reads about one card. */
export function hookInput(card: HookCard): string {
  const guide = languagePrompts(card.language)?.hook;
  return JSON.stringify({
    term: card.term,
    meaning: card.meaning,
    termLanguage: card.language,
    ...(card.pronunciation ? { pronunciation: card.pronunciation } : {}),
    asked: card.asked,
    ...(card.deckMeanings?.length ? { deckMeanings: card.deckMeanings } : {}),
    ...(guide ? { guide } : {}),
  });
}

/** One draft for one card, or null when the model has none it may offer. */
export async function draftHook(provider: TextProvider, card: HookCard): Promise<string | null> {
  const input = hookInput(card);
  const reply = Reply.safeParse(
    await provider.complete({
      instructions: HOOK_INSTRUCTIONS,
      input,
      schema: HOOK_REPLY_SCHEMA,
      // The candidates are written in the reply, so no hidden reasoning: about 2 s, as good as medium's 10 s on real cards.
      effort: "none",
    }),
  );
  return reply.success ? acceptDraft(reply.data.hook, card) : null;
}

/**
 * A fresh draft for the owner's hook editor, asked for with its Draft button, or null for a card the
 * keyword method does not fit, where no vendor is configured, or when the AI had none. The draft is
 * kept on the card only so a hook saved as exactly that text is marked as the AI's; keeping it is
 * bookkeeping, not a change to the card, so it is not audited and leaves `updatedAt` alone.
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
  const neighbours = await ctx.db
    .select({ meaning: schema.cards.meaning })
    .from(schema.cards)
    .where(
      and(
        eq(schema.cards.deckId, card.deckId),
        isNull(schema.cards.archivedAt),
        isNotNull(schema.cards.meaning),
        ne(schema.cards.id, card.id),
      ),
    )
    .limit(DECK_MEANINGS);
  const deckMeanings = neighbours.flatMap(({ meaning }) => (meaning?.trim() ? [meaning] : []));
  const hookCard = { ...subject, asked, deckMeanings };
  if (!provider) return null;

  // A reply can come back empty or break a rule now and then, so one more try before answering none.
  let draft: string | null;
  try {
    draft = (await draftHook(provider, hookCard)) ?? (await draftHook(provider, hookCard));
  } catch (error) {
    console.error("Drafting a hook failed", {
      error: error instanceof Error ? error.name : "unknown",
    });
    throw new ServiceError("unavailable", "The AI couldn't draft a hook. Try again in a moment.");
  }
  // An empty answer keeps the last draft, which may still be in the learner's field. Only while the
  // card still reads as it did, so a draft never outlives the words it was for.
  if (draft === null) return null;
  await ctx.db
    .update(schema.cards)
    .set({ hookDraft: draft })
    .where(
      and(
        eq(schema.cards.id, card.id),
        eq(schema.cards.term, card.term),
        eq(schema.cards.meaning, subject.meaning),
      ),
    );
  return draft;
}
