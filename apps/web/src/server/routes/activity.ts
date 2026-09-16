import { ActivityPageOut, ActivityQuery } from "@lymi/core";
import { Hono } from "hono";
import { ctxOf, describe, query } from "../http";
import type { AppEnv } from "../index";
import { requireLearner } from "../principal";
import { listActivity } from "../services";

/** What came into the learner's decks from outside the app, and who is in their shared decks. */
export const activity = new Hono<AppEnv>();

activity.get(
  "/",
  describe({
    tags: ["Activity"],
    summary: "List activity",
    description:
      "Writes by connected apps, API keys and the AI, imports, and the people events of a shared deck, newest first. Writes of one kind by one caller in one deck on one day are one entry. Page with `cursor` from `nextCursor`.",
    // The screen that watches the integrations is not readable by them: a key must not be able
    // to list the learner's other keys and apps by their names on these rows.
    learnerOnly: true,
    ok: { schema: ActivityPageOut, description: "A page of activity" },
    errors: [400],
  }),
  requireLearner,
  query(ActivityQuery, "activity query"),
  async (c) => c.json(await listActivity(ctxOf(c), c.req.valid("query"))),
);
