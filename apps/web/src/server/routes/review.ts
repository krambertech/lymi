import { GradeInput, GradeOut, QueueOut } from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { body, ctxOf, describe, query } from "../http";
import type { AppEnv } from "../index";
import { gradeCard, reviewHistory, reviewQueue } from "../services";

export const review = new Hono<AppEnv>();

const HistoryQuery = z.object({
  days: z.coerce.number().int().min(1).max(90).optional().meta({ description: "Default 7" }),
  tz: z.coerce
    .number()
    .int()
    .optional()
    .meta({ description: "Minutes, as Date.getTimezoneOffset reports it" }),
});
const HistoryOut = z.object({ days: z.array(z.number().int()) }).meta({ id: "ReviewHistory" });

const QueueQuery = z.object({
  deck: z.string().optional().meta({ description: "Limit to one deck" }),
  limit: z.coerce.number().int().min(1).max(200).optional().meta({ description: "Default 50" }),
});

review.get(
  "/queue",
  describe({
    tags: ["Review"],
    summary: "Cards due now",
    description:
      "Oldest due first, with at most one direction per card. Includes the four dates each grade would schedule for clients that need a preview.",
    ok: { schema: QueueOut, description: "The queue" },
    errors: [400],
  }),
  query(QueueQuery, "query"),
  async (c) => {
    const { deck, limit } = c.req.valid("query");
    return c.json(await reviewQueue(ctxOf(c), { deckId: deck, limit }));
  },
);

review.get(
  "/history",
  describe({
    tags: ["Review"],
    summary: "Reviews per day",
    description:
      "Counts for the last N days in the learner's timezone, oldest first. Feeds the seven lights on Today.",
    ok: { schema: HistoryOut, description: "One count per day" },
    errors: [400],
  }),
  query(HistoryQuery, "query"),
  async (c) => {
    const { days, tz } = c.req.valid("query");
    return c.json(await reviewHistory(ctxOf(c), { days, tzOffset: tz }));
  },
);

review.post(
  "/grade",
  describe({
    tags: ["Review"],
    summary: "Grade a card",
    learnerOnly: true,
    description:
      "Learner only: API keys and MCP tokens get 403 whatever their scope. A grade older than the state's last review is ignored and reported as `duplicate`, which makes offline replay safe.",
    ok: { schema: GradeOut, description: "The new schedule" },
    errors: [400, 404],
  }),
  body(GradeInput, "grade"),
  async (c) => c.json(await gradeCard(ctxOf(c), c.req.valid("json"))),
);
