import {
  CARD_LIMITS,
  DIAGNOSIS_CAUSES,
  Diagnosis,
  type DiagnosisCause,
  type ReviewModeKey,
} from "@lymi/core";
import { z } from "zod";
import type { TextRequest } from "../ai";

/**
 * Below this confidence the stored cause is `unclear` and carries no draft. Chosen by running
 * `evaluate.ts` over `evaluation.json`.
 */
export const DIAGNOSIS_THRESHOLD = 0.7;

/** A card as the model reads it. Long text is cut, because the first lines carry the format. */
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

The reasons:
- confused_pair: the learner mixes this card up with one specific other card from deck.cards or oftenForgotten. Name a pair only when the two terms are easy to swap because they look or sound nearly alike (lie and lay, affect and effect), when they mean so nearly the same that the learner must choose between them (класть and ставить both "put"), when they are two sides of one action from one root (learn and teach), or when the notes compare them. Most words share a few letters with some other card; sharing letters, a word class, an ending, a topic or the deck's format is not enough on its own. Go above 0.7 only for a pair a teacher would call a known confusion. A partner that is also in oftenForgotten is stronger evidence than one only in deck.cards. Fix: two new short cards, each a term and a meaning, that tell the pair apart, such as a short phrase each where only one of the two words fits. Give the other card's id.
- two_things: the card asks for two things and grades them as one: two separate words or sentences, a question with its answer, or a term with an unrelated extra. Fix: the two cards to split it into. The first keeps what the card is mainly about.
- several_answers: the cue as written has another everyday translation in the card's language, the language being learned, that a learner would give first and still count as wrong. For example the meaning "высокий" fits both "kõrge" and "pikk", and "rápido" fits both "quick" and "fast". Fix: the cue with a word or two of context that leaves only this card's answer, and the other answer, written in the card's language. The cue is the meaning when the card is asked meaning_to_term, and the term when it is asked only term_to_meaning.
- no_anchor: nothing to hang the term on. It names a feeling, a manner, a degree or another abstract idea, often explained by a phrase rather than one word, has no cognate in a language the learner reads, and is not confused with another card. Fix: a hook, one short association in the meaning language that leads back to the term, such as a sound-alike word or a vivid image. A hook never spells out the answer or gives its first letters.
- unclear: none of these fits with confidence. A common word, a cognate or a clear concrete meaning is usually fine as written; many cards are simply hard. Say unclear rather than force a reason.

Rules:
- A format the deck uses throughout is never a reason. When most of deck.cards share a pattern, such as a verb's principal parts (Estonian "tooma · tuua · toon"), a noun with its article or plural, or a verb with the case it governs, that pattern is what those cards are for. It is not two things on one card and never a card to split.
- A rarer near-synonym is not another answer, and neither is a word that the meaning's longer gloss rules out. When an abstract term's only other answers are near-synonyms, the reason is no_anchor, not several_answers.
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
      hook: {
        type: ["string", "null"],
        maxLength: CARD_LIMITS.hook,
        description: "no_anchor only",
      },
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

/** Other cards' text past this length only costs tokens: the format shows in the first line. */
const NEIGHBOUR_TEXT = 200;

function clip(text: string | null | undefined, limit: number): string | null {
  if (!text) return null;
  return text.length > limit ? `${text.slice(0, limit)}…` : text;
}

const neighbour = (card: DiagnosisCard) => ({
  id: card.id,
  term: clip(card.term, NEIGHBOUR_TEXT),
  meaning: clip(card.meaning, NEIGHBOUR_TEXT),
});

/** The one model call a diagnosis makes. */
export function diagnosisRequest(input: DiagnosisInput): TextRequest {
  return {
    instructions: INSTRUCTIONS,
    input: JSON.stringify({
      meaningLanguage: input.meaningLanguage,
      card: input.card,
      deck: { name: input.deck.name, cards: input.deck.cards.map(neighbour) },
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
