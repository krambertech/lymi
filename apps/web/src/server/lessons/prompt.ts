import { CARD_LIMITS } from "@lymi/core";
import { z } from "zod";
import { lessonReading } from "../languages";

/** Raise with any change to what the model reads, so analytics and evaluations can tell runs apart. */
export const LESSON_PROMPT_VERSION = 1;

/** The rules come from docs/card-writing.md; change both together. */
export const INSTRUCTIONS = `You turn one language lesson into a pick list: the terms worth a card in the learner's deck. The learner ticks the terms they want, so list every candidate and let them choose.

Read
- Read every page in the order given. A lesson mixes printed text, the learner's handwriting, transcripts and pasted notes.
- Copy every form letter for letter as the material writes it, with every diacritic. Never rebuild or normalise a form: when the lesson lists a verb with a 3rd-person form (algab, meeldib), the card keeps that form even if the deck's other cards end differently. A handwritten correction replaces the printed form it corrects.
- "seen" is the exact line you read the term from. "heading" is the lesson or section heading the term sits under, as printed. A page with no heading of its own continues the heading of the page before it; "" only when the material has none.

Choose, in this order
1. What the lesson marks: glossed, bold, highlighted, underlined, circled, drilled, or written by hand in a margin with a meaning nearby. Set "handwritten" for a term written by hand.
2. Words the lesson teaches by listing or explaining them.
3. Page furniture is never a term: headings, row numbers, transcriptions into another script, mnemonic columns, exercise instructions, page numbers.
List a term even when the deck seems to have it; Lymi checks the learner's decks itself.

Write each term as one card: one term, one sense
- "deck" comes first: the id of the learner's deck this lesson belongs to, by the language it teaches and then its topic. Every term follows that deck's shape and meaning language.
- "term" is the citation form in the deck's shape. Copy the shape of the deck's cards: when they join several forms with " · ", give the forms the lesson prints, joined the same way. An inflected form, an imperative or a request formula built on a listed word belongs to that word's card.
- "kind" is "word" for one lexical item, "phrase" for a fixed multi-word expression the lesson teaches as a unit.
- "meaning" is one translation, one to three words, in the deck's meaning language. Use the lesson's own gloss, cut to the sense the lesson teaches, and set "meaningFromLesson". With no gloss in the lesson, write the usual translation and clear "meaningFromLesson".
- When that meaning also fits another common word, add a short cue in parentheses so only this term fits it: "думать (размышлять)".
- "pronunciation" is the reading the lesson prints for the term, copied as printed, in any form its deck's "Readings" line lists. Give only the reading, without brackets, and "" when the lesson prints none; never write one the lesson does not print. A reading belongs on its term's card and is never a term of its own.

Questions
Most lessons need no question: the learner sees the list and unticks what they do not want. Ask only when one answer unticks several terms at once, such as a page of exercises, a second lesson in the same upload, or the few words the learner marked among many printed ones; never ask when every option keeps nearly the same terms. Ask about marks, highlighting or handwriting only when a photo or PDF shows them on some of the terms and not the rest; glossed and listed words are not "marked". Grammar categories are always kept. Write each question as one plain sentence of at most 12 words, addressed to the learner as "you", and each option as the learner's own short reply to it, in at most 5 words and without repeating the question's nouns. Each option lists the ids of the terms it drops; "default" is the index of the option most learners want.`;

/** No question for a page's worth of material, one for a few pages, two for a long upload. */
export function questionLimit(pages: number, words: number): number {
  const size = pages + Math.ceil(words / 1500);
  return size <= 1 ? 0 : size <= 5 ? 1 : 2;
}

export type DeckCandidate = {
  id: string;
  name: string;
  description: string | null;
  language: string | null;
  examples: { term: string; meaning: string | null }[];
};

const english = (tag: string | null) => {
  if (!tag) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "language" }).of(tag) ?? tag;
  } catch {
    return tag;
  }
};

/** The learner's decks as the model sees them. Their own cards decide the shape and the meaning language. */
export function decksBrief(
  decks: DeckCandidate[],
  options: { fixed: boolean; hint: string | undefined; meaningLanguage: string; limit: number },
): string {
  const lines = [
    options.fixed
      ? "The learner chose this deck:"
      : "The learner's decks. Choose the one this lesson belongs to:",
  ];
  for (const deck of decks) {
    lines.push(
      `\nDeck ${deck.id}: ${deck.name}${deck.description ? ` (${deck.description})` : ""}, teaching ${english(deck.language) ?? "a language its cards show"}`,
    );
    const reading = lessonReading(deck.language);
    if (reading) lines.push(`  Readings: ${reading}.`);
    for (const card of deck.examples) lines.push(`  ${card.term} — ${card.meaning ?? ""}`);
  }
  lines.push(
    `\nMeaning language: the language a deck's cards use for meanings; for a deck with no cards, ${english(options.meaningLanguage)}.`,
  );
  if (options.hint && !options.fixed)
    lines.push(`When two decks fit equally, choose ${options.hint}.`);
  lines.push(`Ask at most ${options.limit} questions.`);
  return lines.join("\n");
}

/** The reply's shape, with the deck limited to the learner's own. */
export function replySchema(deckIds: string[]) {
  return {
    ...REPLY_SCHEMA,
    required: ["deck", ...REPLY_SCHEMA.required],
    properties: { deck: { type: "string", enum: deckIds }, ...REPLY_SCHEMA.properties },
  };
}

export const REPLY_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["terms", "questions"],
  properties: {
    terms: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "id",
          "term",
          "kind",
          "meaning",
          "meaningFromLesson",
          "pronunciation",
          "handwritten",
          "heading",
          "seen",
        ],
        properties: {
          id: { type: "string", description: "t1, t2, … in list order" },
          term: { type: "string" },
          kind: { type: "string", enum: ["word", "phrase"] },
          meaning: { type: "string" },
          meaningFromLesson: { type: "boolean" },
          pronunciation: { type: "string" },
          handwritten: { type: "boolean" },
          heading: { type: "string" },
          seen: { type: "string" },
        },
      },
    },
    questions: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "options", "default"],
        properties: {
          question: { type: "string" },
          options: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["label", "drop"],
              properties: {
                label: { type: "string" },
                drop: { type: "array", items: { type: "string" } },
              },
            },
          },
          default: { type: "integer" },
        },
      },
    },
  },
} as const;

/** A reply the model sent. Anything past the card limits is cut rather than refused. */
export const Reply = z.object({
  deck: z.string(),
  terms: z.array(
    z.object({
      id: z.string(),
      term: z.string().trim().min(1).max(CARD_LIMITS.term),
      kind: z.enum(["word", "phrase"]),
      meaning: z.string().trim().max(CARD_LIMITS.meaning),
      meaningFromLesson: z.boolean(),
      pronunciation: z.string().trim().max(CARD_LIMITS.pronunciation).default(""),
      handwritten: z.boolean(),
      heading: z.string().trim().max(200),
      seen: z.string().trim().max(500),
    }),
  ),
  questions: z.array(
    z.object({
      question: z.string().trim().min(1).max(300),
      options: z
        .array(z.object({ label: z.string().trim().min(1).max(120), drop: z.array(z.string()) }))
        .min(2)
        .max(4),
      default: z.number().int().min(0),
    }),
  ),
});
export type Reply = z.infer<typeof Reply>;
