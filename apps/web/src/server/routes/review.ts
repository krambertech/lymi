import { GradeInput, GradeOut, QueueOut } from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { body, ctxOf, describe, query } from "../http";
import type { AppEnv } from "../index";
import { gradeCard, reviewQueue } from "../services";

export const review = new Hono<AppEnv>();

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
      "Oldest due first, with the four dates each grade would schedule so a client can show them without a round trip.",
    ok: { schema: QueueOut, description: "The queue" },
    errors: [400],
  }),
  query(QueueQuery, "query"),
  async (c) => {
    const { deck, limit } = c.req.valid("query");
    return c.json(await reviewQueue(ctxOf(c), { deckId: deck, limit }));
  },
);

review.post(
  "/grade",
  describe({
    tags: ["Review"],
    summary: "Grade a card",
    description:
      "Learner only: API keys and MCP tokens get 403 whatever their scope. A grade older than the state's last review is ignored and reported as `duplicate`, which makes offline replay safe.",
    ok: { schema: GradeOut, description: "The new schedule" },
    errors: [400, 403, 404],
  }),
  body(GradeInput, "grade"),
  async (c) => c.json(await gradeCard(ctxOf(c), c.req.valid("json"))),
);
