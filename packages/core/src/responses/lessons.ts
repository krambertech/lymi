import { z } from "zod";

/** A card the learner already has that a term on the pick list matches. */
const LessonMatchOut = z.object({
  cardId: z.string(),
  term: z.string(),
  deckName: z.string(),
});

export const LessonTermOut = z.object({
  id: z.string(),
  term: z.string(),
  kind: z.enum(["word", "phrase"]),
  /** Null when the lesson gives no meaning and the model's own gloss is not kept on the card. */
  meaning: z.string().nullable(),
  /** The gloss the list shows, from the lesson or written by the model. */
  gloss: z.string(),
  handwritten: z.boolean(),
  heading: z.string().nullable(),
  /** The text the model read the term from. */
  seen: z.string(),
  /** How likely the term is worth its own card, or null when no decision model ran. */
  keep: z.number().nullable(),
  ticked: z.boolean(),
  /** The same term, already in the learner's decks. */
  existing: LessonMatchOut.nullable(),
  /** A card for the same word in another form, such as the infinitive alone. */
  formOf: LessonMatchOut.nullable(),
});

export const LessonQuestionOut = z.object({
  id: z.string(),
  question: z.string(),
  options: z.array(z.object({ label: z.string(), drop: z.array(z.string()) })),
  default: z.number().int(),
});

/** One read of lesson material: the pick list and any questions. Nothing is stored. */
export const LessonReadOut = z
  .object({
    terms: z.array(LessonTermOut),
    questions: z.array(LessonQuestionOut),
    pages: z.number().int(),
    usage: z.object({
      model: z.string(),
      inputTokens: z.number().int(),
      outputTokens: z.number().int(),
      costUsd: z.number(),
      ms: z.number().int(),
    }),
  })
  .meta({ id: "LessonRead" });

/** Smart add reads a learner may start in one of their own days. A read that fails is not counted. */
export const LESSON_READS_PER_DAY = 5;

export const LessonAccessOut = z
  .object({
    allowed: z.boolean(),
    /** Today's reads against the limit, or null for an account without one. */
    daily: z
      .object({
        limit: z.number().int(),
        used: z.number().int(),
        /** The start of the learner's next day, when the count starts again. */
        resetsAt: z.iso.datetime(),
      })
      .nullable(),
  })
  .meta({ id: "LessonAccess" });

const LessonUsageOut = LessonReadOut.shape.usage;

/** One line of the streamed read: terms as the model writes them, then its questions, then the cost. */
export const LessonEventOut = z
  .discriminatedUnion("type", [
    z.object({
      type: z.literal("deck"),
      deckId: z.string(),
      deckName: z.string(),
      /** True when Lymi chose it from the lesson, false when the learner opened Smart add from it. */
      guessed: z.boolean(),
    }),
    z.object({ type: z.literal("term"), term: LessonTermOut }),
    z.object({ type: z.literal("questions"), questions: z.array(LessonQuestionOut) }),
    z.object({ type: z.literal("done"), pages: z.number().int(), usage: LessonUsageOut }),
    z.object({ type: z.literal("error"), message: z.string() }),
  ])
  .meta({ id: "LessonEvent" });

/** The terms a learner's own answer leaves off the list. */
export const LessonAnswerOut = z.object({ drop: z.array(z.string()) }).meta({ id: "LessonAnswer" });

export type LessonTermOut = z.infer<typeof LessonTermOut>;
export type LessonQuestionOut = z.infer<typeof LessonQuestionOut>;
export type LessonReadOut = z.infer<typeof LessonReadOut>;
export type LessonAccessOut = z.infer<typeof LessonAccessOut>;
export type LessonEventOut = z.infer<typeof LessonEventOut>;
export type LessonAnswerOut = z.infer<typeof LessonAnswerOut>;
