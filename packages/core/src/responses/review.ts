import { z } from "zod";
import { RETURN_GAPS, SLIPPING_RETURN_GAP } from "../draw";
import { SLIPPING_FORGOTTEN_DAYS, SLIPPING_RECENT_DAYS } from "../slipping";
import { Direction, Rating, ReviewMode } from "../types";
import { CardOut } from "./cards";
import { Timestamp } from "./common";

/** Where one learner-local day stands against its streak goal. */
export const ReviewDayOutcome = z.enum(["open", "goal_met", "exhausted", "nothing_due"]).meta({
  description:
    "open: not yet satisfied. goal_met: the goal's attempts landed. exhausted: every eligible review was done below the goal. nothing_due: nothing was eligible, which protects the streak without adding to it.",
});
export type ReviewDayOutcome = z.infer<typeof ReviewDayOutcome>;

export const ReviewDayProgress = z
  .object({
    date: z.string().meta({ description: "Local YYYY-MM-DD" }),
    attempts: z.number().int().meta({ description: "Accepted, non-undone grades that day" }),
    goal: z.number().int(),
    outcome: ReviewDayOutcome,
  })
  .meta({ id: "ReviewDayProgress" });
export type ReviewDayProgress = z.infer<typeof ReviewDayProgress>;

export const QueueItemOut = z
  .object({
    card: CardOut,
    mode: ReviewMode.meta({ description: "Show the cue before reveal and grade the target" }),
    direction: Direction.optional().meta({
      description:
        "Legacy form of `mode`, present for text modes only so an older client never grades a picture mode as its text sibling.",
    }),
    stateId: z.string(),
    fsrsState: z.number().int(),
    next: z
      .object({ 1: Timestamp, 2: Timestamp, 3: Timestamp, 4: Timestamp })
      .meta({ description: "When each grade would schedule the card" }),
  })
  .meta({ id: "QueueItem" });

export const QueueOut = z
  .object({ total: z.number().int(), items: z.array(QueueItemOut) })
  .meta({ id: "Queue" });

export const RoundsOut = z
  .object({
    forgotten: z
      .number()
      .int()
      .meta({ description: "Cards whose latest grade today is Forgot, across every deck" }),
    new: z
      .number()
      .int()
      .meta({ description: "Cards never reviewed in any mode that can start today" }),
    slipping: z
      .number()
      .int()
      .meta({
        description: `Cards whose first grade was Forgot on ${SLIPPING_FORGOTTEN_DAYS} of their last ${SLIPPING_RECENT_DAYS} review days before today, not reviewed today, due or not`,
      }),
  })
  .meta({ id: "ReviewRounds" });
export type RoundsOut = z.infer<typeof RoundsOut>;

const DrawModeOut = z
  .object({
    mode: ReviewMode.meta({ description: "Show the cue before reveal and grade the target" }),
    direction: Direction.optional().meta({
      description: "Legacy form of `mode`, present for text modes only",
    }),
    stateId: z.string(),
    fsrsState: z.number().int().meta({ description: "0 New, 1 Learning, 2 Review, 3 Relearning" }),
    due: Timestamp,
    retrievability: z
      .number()
      .meta({ description: "At the start of the day, 0 to 1; 0 for a direction never reviewed" }),
    added: Timestamp.meta({ description: "When the direction began to exist for the learner" }),
    hasCue: z
      .boolean()
      .meta({ description: "False when the card lacks what this direction shows first" }),
    next: z
      .object({ 1: Timestamp, 2: Timestamp, 3: Timestamp, 4: Timestamp })
      .meta({ description: "When each grade would schedule the mode, as of the response" }),
  })
  .meta({ id: "DrawMode" });

const DrawCardOut = z
  .object({
    card: CardOut,
    modes: z.array(DrawModeOut).meta({ description: "In the order they are introduced" }),
    slipping: z.boolean().meta({
      description: `Often forgotten: a miss returns once, ${SLIPPING_RETURN_GAP} attempts later, instead of up to ${RETURN_GAPS.length} times`,
    }),
  })
  .meta({ id: "DrawCard" });

const DrawLogEntryOut = z
  .object({
    cardId: z.string(),
    mode: ReviewMode,
    direction: Direction.optional().meta({
      description: "Legacy form of `mode`, present for text modes only",
    }),
    rating: Rating,
    stateBefore: z.number().int().meta({ description: "FSRS state before the grade" }),
    at: Timestamp,
  })
  .meta({ id: "DrawLogEntry" });

export const DrawOut = z
  .object({
    day: z.object({
      date: z.string().meta({ description: "Local YYYY-MM-DD" }),
      zone: z.string().meta({ description: "The review timezone the day follows" }),
      start: Timestamp,
      end: Timestamp.meta({ description: "The start of the next day, exclusive" }),
    }),
    goal: z.number().int(),
    attempts: z.number().int().meta({ description: "Accepted, non-undone grades today" }),
    total: z.number().int().meta({ description: "Cards that can be reviewed today in this scope" }),
    cards: z.array(DrawCardOut),
    log: z
      .array(DrawLogEntryOut)
      .meta({ description: "Today's grades in every scope, oldest first" }),
  })
  .meta({ id: "Draw" });
export type DrawOut = z.infer<typeof DrawOut>;

export const GradeOut = z
  .object({
    ok: z.literal(true),
    duplicate: z
      .boolean()
      .meta({ description: "True when an older or equal review already existed" }),
    due: Timestamp,
    state: z.number().int(),
    reviewId: z
      .string()
      .nullable()
      .meta({ description: "The attempt, for Undo. Null when the grade was a duplicate." }),
    day: ReviewDayProgress,
  })
  .meta({ id: "GradeResult" });
export type GradeOut = z.infer<typeof GradeOut>;

export const UndoOut = z
  .object({ ok: z.literal(true), day: ReviewDayProgress })
  .meta({ id: "UndoResult" });
