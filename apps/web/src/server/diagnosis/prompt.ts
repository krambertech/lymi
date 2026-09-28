import {
  DIAGNOSIS_CAUSES,
  Diagnosis,
  type DiagnosisCause,
  HOOK_LIMIT,
  type ReviewModeKey,
} from "@lymi/core";
import { z } from "zod";
import type { TextRequest } from "../ai";

/**
 * Below this confidence the stored cause is `unclear` and carries no draft. Chosen by running
 * `evaluate.ts` over `evaluation.json`.
 */
export const DIAGNOSIS_THRESHOLD = 0.7;

/**
 * Stored on each diagnosis. Raise it when the instructions change what the model would name, so a
 * draw re-diagnoses rows the learner has not acted on.
 */
export const DIAGNOSIS_PROMPT_VERSION = 2;

/** A card as the model reads it. A neighbour's text is cut: its first lines carry the format. */
export type DiagnosisCard = {
  id: string;
  term: string;
  meaning: string | null;
  example?: string | null;
  notes?: string | null;
};

/** Everything one diagnosis reads: the card, its deck's neighbours and the learner's other sticky cards. */
export type DiagnosisInput = {
  meaningLanguage: string;
  card: DiagnosisCard & { language: string | null; asked: ReviewModeKey[] };
  deck: { name: string; cards: DiagnosisCard[] };
  oftenForgotten: DiagnosisCard[];
};

/** What the model named, before the threshold decides whether the learner hears it. */
export type Proposal = {
  /** The model's one-sentence account, for the evaluation. Never stored. */
  reason: string;
  proposedCause: DiagnosisCause;
  confidence: number;
  /** The cause with a draft that parses, or null when the draft did not. */
  diagnosis: Diagnosis | null;
};

const INSTRUCTIONS = `You help one language learner with a card they keep forgetting: on at least 3 of the last 5 days they reviewed it, their first try was Forgot. Name the single most likely reason and draft a fix, or say there is no clear reason.

You get the card with its example and notes; deck.cards, its nearest neighbours in the same deck, with the start of their notes; deck.sharedFormats, the term patterns many of deck.cards share, and deck.repeatedNoteLines, the labels of note lines many of them carry, such as "наоборот:" or "see also:", both counted from deck.cards; and oftenForgotten, the learner's other cards that keep slipping.

The reasons:
- confused_pair: the learner gives the other card's answer for this one. The other card must be in deck.cards or oftenForgotten, and the pair needs at least one of these:
  - the other card is also in oftenForgotten;
  - the two terms look or sound nearly alike (lie and lay, cansado and casado, wichtig and richtig);
  - they mean so nearly the same that the learner must choose between them (класть and ставить both "put");
  - they are two sides of one action from one root (learn and teach, alustama and algama);
  - a note on this card compares the two or warns about mixing them up, after "сравни", "compare", "не путай с…" or "careful: not…", on a line that is not in deck.repeatedNoteLines. The word it compares must be the other card's term, or the one word where the other card's term differs from this one ("tema kott" and "oma kott" for "Ta võtab tema koti." and "Ta võtab oma koti."); a word found only in the other card's notes or example does not make it the partner. A note that only names the opposite ("наоборот", "opposite") is not a comparison.
  Opposites are not evidence. A learner who forgets "короткий" does not answer "длинный": knowing the opposite is what makes an opposite easy. An antonym is a pair only when it also passes one of the tests above, and above 0.7 only when it is also in oftenForgotten and the two terms look nearly alike (einsteigen and aussteigen). A word named on a line in deck.repeatedNoteLines is a cross-reference the deck writes on card after card, never evidence. Most words share a few letters with some other card; sharing letters, a word class, an ending, a topic or the deck's format is not enough. Go above 0.7 only for a pair a teacher would call a known confusion. Fix: two new short cards, each a term and a meaning, that tell the pair apart, such as a short phrase each where only one of the two words fits. Give the other card's id.
- two_things: the card asks for two things and grades them as one: two separate words or sentences, a question with its answer, or a term with an unrelated extra. One sentence is one thing, even when its clauses contrast ("he doesn't know me, but I know him"). Fix: the two cards to split it into. The first keeps what the card is mainly about.
- several_answers: the cue as written has another everyday translation in the card's language, the language being learned, that a learner would give first and still count as wrong. For example the meaning "высокий" fits both "kõrge" and "pikk", and "rápido" fits both "quick" and "fast". The other answer is a different word, never another form or spelling of this card's term. Fix: the cue with a word or two of context that leaves only this card's answer, and the other answer, written in the card's language. The cue is the meaning when the card is asked meaning_to_term, and the term when it is asked only term_to_meaning.
- no_anchor: nothing to hang the term on. It names a feeling, a manner, a degree or another abstract idea, often explained by a phrase rather than one word, has no cognate in a language the learner reads, and is not confused with another card. Fix: a hook, one short association in the meaning language that leads back to the term, such as a sound-alike word or a vivid image. A hook never spells out the answer or gives its first letters.
- unclear: none of these fits with confidence. A common word, a cognate or a clear concrete meaning is usually fine as written; many cards are simply hard. Say unclear rather than force a reason.

Rules:
- A format the deck uses throughout is never a reason. The deck's formats are the patterns listed in deck.sharedFormats and deck.repeatedNoteLines, such as a verb's principal parts (Estonian "tooma · tuua · toon"), a question with its answer, or a notes line such as "наоборот: pikk". A listed pattern is what those cards are for: not two things on one card, not a pair and never a card to split. A pattern counts as the deck's format only when it is listed; the one question with its answer in a deck of sentences is not the deck's format and can be two_things.
- A rarer near-synonym is not another answer, and neither is a word that the meaning's gloss rules out: "высокий (о здании)" and "short (in length)" already leave one answer. When an abstract term's only other answers are near-synonyms, the reason is no_anchor, not several_answers.
- Choose confused_pair only for a card you can name by id. A look-alike that is not among the cards you were given is not a pair.
- confidence is your probability from 0 to 1 that the reason is right and the fix would help. Stay below 0.5 when you are guessing.
- Write draft meanings and the hook in the language the card's meaning is written in, or in meaningLanguage when the card has no meaning. Write draft terms in the card's language, in the format the deck uses.
- Keep drafts short: a term under 80 characters, a meaning under 120, a hook under 150.
- reason is one plain sentence in English saying what you saw.
- Fill only the fields your cause uses and return null for every other field.`;

const REPLY_SCHEMA = {
  name: "card_diagnosis",
  schema: {
    type: "object",
    properties: {
      reason: { type: "string", maxLength: 300 },
      cause: { type: "string", enum: [...DIAGNOSIS_CAUSES] },
      confidence: { type: "number", description: "0 to 1" },
      otherCardId: { type: ["string", "null"], description: "confused_pair only" },
      cards: {
        type: ["array", "null"],
        description: "Two cards, for confused_pair and two_things",
        items: {
          type: "object",
          properties: { term: { type: "string" }, meaning: { type: "string" } },
          required: ["term", "meaning"],
          additionalProperties: false,
        },
      },
      cueField: { type: ["string", "null"], enum: ["term", "meaning", null] },
      cue: { type: ["string", "null"], description: "several_answers only" },
      otherAnswer: { type: ["string", "null"], description: "several_answers only" },
      hook: { type: ["string", "null"], maxLength: HOOK_LIMIT, description: "no_anchor only" },
    },
    required: [
      "reason",
      "cause",
      "confidence",
      "otherCardId",
      "cards",
      "cueField",
      "cue",
      "otherAnswer",
      "hook",
    ],
    additionalProperties: false,
  },
} as const;

const Reply = z.object({
  reason: z.string().catch(""),
  cause: z.enum(DIAGNOSIS_CAUSES),
  confidence: z.number().catch(0),
  otherCardId: z.string().nullable().catch(null),
  cards: z
    .array(z.object({ term: z.string(), meaning: z.string() }))
    .nullable()
    .catch(null),
  cueField: z.enum(["term", "meaning"]).nullable().catch(null),
  cue: z.string().nullable().catch(null),
  otherAnswer: z.string().nullable().catch(null),
  hook: z.string().nullable().catch(null),
});
export type Reply = z.infer<typeof Reply>;

/** Other cards' text past this length only costs tokens: the format shows in the first lines. */
const NEIGHBOUR_TEXT = 200;

/** Term patterns a deck can be built on, named as the model reads them. */
const TERM_FORMATS: [string, RegExp][] = [
  ["principal parts after ' · '", / · /],
  ["a question with its answer after ' — '", /\?\s*[—–-]\s*\S/],
  ["two sentences", /[.!?…]\s+\p{Lu}/u],
  ["a whole sentence", /^\p{Lu}.*[.!?…]$/u],
  ["forms after ' / '", / \/ /],
  ["forms in brackets", /\(.+,.+\)/],
  ["a verb with 'to'", /^to\s/i],
  [
    "a noun with its article",
    /^(der|die|das|the|a|an|el|la|los|las|le|les|il|lo|gli|un|una|ein|eine|het|de|en|ett)\s/i,
  ],
];

/** A pattern on at least this share of the neighbours, and on 3 of them, is the deck's format. */
const SHARED = 0.4;

const shared = (cards: readonly unknown[]) => Math.max(3, Math.ceil(cards.length * SHARED));

/**
 * The term patterns the deck's cards share, counted rather than left to the model, so the one
 * card of its kind is never excused as the deck's format.
 */
export function sharedFormats(cards: readonly DiagnosisCard[]): string[] {
  const least = shared(cards);
  return TERM_FORMATS.flatMap(([name, pattern]) =>
    cards.filter((card) => pattern.test(card.term.trim())).length >= least ? [name] : [],
  );
}

/** A note line's label: the words before its colon, or a short line on its own such as "примеры". */
const NOTE_LABEL = /^[\s>*_#-]*(\p{L}[\p{L}\p{M} .'’-]{0,29}?)[*_]*\s*(?::|$)/u;

/**
 * Labels of note lines the deck writes on card after card, such as "наоборот:", so a word named
 * there reads as the deck's cross-reference and not as a warning about this card.
 */
export function repeatedNoteLines(cards: readonly DiagnosisCard[]): string[] {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const labels = new Set(
      (card.notes ?? "").split("\n").flatMap((line) => {
        const label = NOTE_LABEL.exec(line)?.[1]?.trim().toLocaleLowerCase();
        return label ? [label] : [];
      }),
    );
    for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const least = shared(cards);
  return [...counts].flatMap(([label, count]) => (count >= least ? [`${label}:`] : []));
}

function clip(text: string | null | undefined, limit: number): string | null {
  if (!text) return null;
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

const neighbour = (card: DiagnosisCard) => ({
  id: card.id,
  term: clip(card.term, NEIGHBOUR_TEXT),
  meaning: clip(card.meaning, NEIGHBOUR_TEXT),
  notes: clip(card.notes, NEIGHBOUR_TEXT),
});

/** The one model call a diagnosis makes. */
export function diagnosisRequest(input: DiagnosisInput): TextRequest {
  return {
    instructions: INSTRUCTIONS,
    input: JSON.stringify({
      meaningLanguage: input.meaningLanguage,
      card: input.card,
      deck: {
        name: input.deck.name,
        cards: input.deck.cards.map(neighbour),
        sharedFormats: sharedFormats(input.deck.cards),
        repeatedNoteLines: repeatedNoteLines(input.deck.cards),
      },
      oftenForgotten: input.oftenForgotten.map(neighbour),
    }),
    schema: REPLY_SCHEMA,
  };
}

/**
 * What the model named, with its draft checked against `Diagnosis`. A pair must name a card
 * the model was shown, and a draft that does not parse is no draft, whatever the confidence.
 */
export function readReply(raw: unknown, input: DiagnosisInput): Proposal | null {
  const parsed = Reply.safeParse(raw);
  if (!parsed.success) return null;
  const reply = parsed.data;
  const confidence = Math.min(
    1,
    Math.max(0, Number.isFinite(reply.confidence) ? reply.confidence : 0),
  );
  const shown = new Set([...input.deck.cards, ...input.oftenForgotten].map((card) => card.id));
  const pairKnown =
    reply.otherCardId !== null &&
    reply.otherCardId !== input.card.id &&
    shown.has(reply.otherCardId);
  const candidate = {
    confused_pair: {
      cause: "confused_pair",
      draft: pairKnown ? { otherCardId: reply.otherCardId, cards: reply.cards } : null,
    },
    two_things: { cause: "two_things", draft: { cards: reply.cards } },
    several_answers: {
      cause: "several_answers",
      draft: { field: reply.cueField, text: reply.cue, otherAnswer: reply.otherAnswer },
    },
    no_anchor: { cause: "no_anchor", draft: { hook: reply.hook } },
    unclear: { cause: "unclear", draft: null },
  }[reply.cause];
  const diagnosis = Diagnosis.safeParse(candidate);
  return {
    reason: reply.reason,
    proposedCause: reply.cause,
    confidence,
    diagnosis: diagnosis.success ? diagnosis.data : null,
  };
}

/** What the learner is told: the proposal when it clears the threshold with a usable draft, else unclear. */
export function settle(proposal: Proposal | null, threshold = DIAGNOSIS_THRESHOLD): Diagnosis {
  if (!proposal?.diagnosis || proposal.confidence < threshold) {
    return { cause: "unclear", draft: null };
  }
  return proposal.diagnosis;
}
