import {
  CHOSEN_LIMIT,
  DrawOut,
  GradeInput,
  GradeOut,
  QueueOut,
  ReviewDayProgress,
  ROUNDS,
  RoundsOut,
  UndoInput,
  UndoOut,
} from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { body, ctxOf, describe, query } from "../http";
import type { AppEnv } from "../index";
import { clientSupports } from "../phone-clients";
import {
  checkToday,
  gradeCard,
  reviewDraw,
  reviewHistory,
  reviewQueue,
  reviewRounds,
  undoReview,
} from "../services";

export const review = new Hono<AppEnv>();

const HistoryQuery = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().meta({ description: "Default 7" }),
  tz: z.coerce
    .number()
    .int()
    .optional()
    .meta({ description: "Minutes, as Date.getTimezoneOffset reports it" }),
});
const HistoryOut = z
  .object({
    days: z.array(z.number().int()),
    streak: z.number().int().meta({
      description:
        "Days in a row, exact and unbounded by `days`. Today counts once it has a review.",
    }),
  })
  .meta({ id: "ReviewHistory" });

const QueueQuery = z.object({
  deck: z.string().optional().meta({ description: "Limit to one deck" }),
  series: z.string().optional().meta({ description: "Limit to the decks of one of your series" }),
  section: z.string().optional().meta({ description: "Limit to one section of a deck you study" }),
  limit: z.coerce.number().int().min(1).max(200).optional().meta({ description: "Default 50" }),
  round: z.enum(ROUNDS).optional().meta({
    description:
      "Review one Today group instead of the day's draw: cards forgotten today, new cards, or cards that keep slipping. Each card comes once; a slipping card comes whether or not it is due.",
  }),
  cards: z
    .string()
    .max(CHOSEN_LIMIT * 40)
    .optional()
    .transform((v) => (v ? v.split(",").filter(Boolean) : undefined))
    .meta({
      description: `Review cards chosen in one deck, as comma-separated ids, at most ${CHOSEN_LIMIT}. Needs \`deck\`, and no \`round\` or \`section\`. Each started card not yet reviewed today comes once, due ones first, whether or not it is due; new cards are left out.`,
    }),
});

review.get(
  "/queue",
  describe({
    tags: ["Review"],
    summary: "Cards to review today, in order",
    description:
      "The order today's review takes if every grade succeeds: cards missed earlier today at their gaps, cards left learning from an earlier day, then the reviews you still know best with one new card in five. One review mode per card per day; each item says its `mode`: show the cue before reveal and grade the target. `total` counts every card that can be reviewed today. Includes the four dates each grade would schedule for clients that need a preview.",
    ok: { schema: QueueOut, description: "The queue" },
    errors: [400, 404],
  }),
  query(QueueQuery, "query"),
  async (c) => {
    const { deck, series, section, limit, round, cards } = c.req.valid("query");
    return c.json(
      await reviewQueue(ctxOf(c), {
        deckId: deck,
        seriesId: series,
        sectionId: section,
        limit,
        round,
        cardIds: cards,
      }),
    );
  },
);

const RoundsQuery = z.object({
  tz: z
    .string()
    .max(64)
    .optional()
    .meta({ description: "IANA timezone, used only until a review zone is known" }),
});

review.get(
  "/rounds",
  describe({
    tags: ["Review"],
    summary: "Cards in each Today round",
    description:
      "How many cards each round of `GET /api/review/queue?round=` holds now: forgotten today, new, and slipping.",
    ok: { schema: RoundsOut, description: "One count per round" },
    errors: [400],
  }),
  query(RoundsQuery, "query"),
  async (c) =>
    c.json(
      await reviewRounds(ctxOf(c), {
        zone: c.req.valid("query").tz,
      }),
    ),
);

const DrawQuery = z.object({
  deck: z.string().optional().meta({ description: "Limit the cards to one deck" }),
  series: z
    .string()
    .optional()
    .meta({ description: "Limit the cards to the decks of one of your series" }),
  section: z
    .string()
    .optional()
    .meta({ description: "Limit the cards to one section of a deck you study" }),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(500)
    .optional()
    .meta({ description: "Cards from the front of the order. Default 100" }),
  tz: z
    .string()
    .max(64)
    .optional()
    .meta({ description: "IANA timezone, used only until a review zone is known" }),
});

review.get(
  "/draw",
  describe({
    tags: ["Review"],
    summary: "What the draw reads",
    description:
      "The inputs a client needs to pick the next card itself: the learner-local day, the goal, the cards at the front of today's order with every direction they are asked in, and today's accepted grades in every scope. A card missed today is included whatever the limit. Nothing about a review is stored, so the same inputs give the same next card on every device.",
    ok: { schema: DrawOut, description: "The draw's inputs" },
    errors: [400, 404],
  }),
  query(DrawQuery, "query"),
  async (c) => {
    const { deck, series, section, limit, tz } = c.req.valid("query");
    return c.json(
      await reviewDraw(ctxOf(c), {
        deckId: deck,
        seriesId: series,
        sectionId: section,
        limit,
        zone: tz,
      }),
    );
  },
);

review.get(
  "/history",
  describe({
    tags: ["Review"],
    summary: "Reviews per day",
    description:
      "Counts for the last N days in the learner's timezone, oldest first. `GET /api/stats/streak` has every day and the goal.",
    ok: { schema: HistoryOut, description: "One count per day" },
    errors: [400],
  }),
  query(HistoryQuery, "query"),
  async (c) => {
    const { days, tz } = c.req.valid("query");
    return c.json(await reviewHistory(ctxOf(c), { days, tzOffset: tz }));
  },
);

/** The first phone release that draws furigana, so its grades say where the reading showed. */
const FURIGANA_SINCE = { ios: "0.0.2" };
/** The first phone release that draws a Cantonese card's Jyutping over its term rather than as a line. */
const JYUTPING_SINCE = { ios: "0.0.7" };
/** The first phone release that draws a Russian card's stress on its term rather than as a line after the reveal. */
const STRESS_SINCE = { ios: "0.0.4" };
/** The first phone release that draws a Tamil card's reading over each word. */
const WORD_READING_SINCE = { ios: "0.0.6" };

review.post(
  "/grade",
  describe({
    tags: ["Review"],
    summary: "Grade a card",
    learnerOnly: true,
    description:
      "Learner only: API keys and MCP tokens get 403 whatever their scope. Name the graded `mode`; the legacy `direction` is still accepted. A grade older than the state's last review is ignored and reported as `duplicate`, which makes offline replay safe. Every accepted grade is one attempt toward the learner-local day it happened on; `day` says where that day stands. Send `aid` when the learner peeked at the card's hook before the reveal; Easy means recall without help, so an aided Easy is 400. `recallMs` and `gradeMs` are the foreground time before the reveal and before the grade; they are stored as they are and never move the schedule.",
    ok: { schema: GradeOut, description: "The new schedule" },
    errors: [400, 404],
  }),
  body(GradeInput, "grade"),
  async (c) =>
    c.json(
      await gradeCard(ctxOf(c), c.req.valid("json"), {
        over: clientSupports(c, FURIGANA_SINCE),
        jyutping: clientSupports(c, JYUTPING_SINCE),
        inPlace: clientSupports(c, STRESS_SINCE),
        byWord: clientSupports(c, WORD_READING_SINCE),
      }),
    ),
);

review.post(
  "/undo",
  describe({
    tags: ["Review"],
    summary: "Undo a grade",
    learnerOnly: true,
    description:
      "Learner only. Restores the card state the grade replaced and removes the attempt from its day's count, which can reopen a completed goal. Only the latest grade of a card's review mode can be undone; an older one is 409. Undoing twice is harmless.",
    ok: { schema: UndoOut, description: "The day after the undo" },
    errors: [400, 404, 409],
  }),
  body(UndoInput, "undo"),
  async (c) =>
    c.json({ ok: true as const, day: await undoReview(ctxOf(c), c.req.valid("json").reviewId) }),
);

const TodayBody = z.object({
  timezone: z.string().max(64).optional().meta({
    description: "The device zone, used only if no review zone has been reported yet",
  }),
});

review.post(
  "/today",
  describe({
    tags: ["Review"],
    summary: "Settle today",
    learnerOnly: true,
    description:
      "Learner only; call it when the app is opened. With nothing eligible and no attempts, today is confirmed as nothing due, which protects the streak without adding to it. With attempts and nothing eligible, today is exhausted and counts. A day with no visit is never confirmed.",
    ok: { schema: ReviewDayProgress, description: "Where today stands" },
    errors: [400],
  }),
  body(TodayBody, "today"),
  async (c) => c.json(await checkToday(ctxOf(c), c.req.valid("json").timezone)),
);
