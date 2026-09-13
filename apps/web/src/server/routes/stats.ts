import { InsightsOut, StreakOut } from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { ctxOf, describe, query } from "../http";
import type { AppEnv } from "../index";
import { insights, streak } from "../services";

export const stats = new Hono<AppEnv>();

const InsightsQuery = z.object({
  period: z.coerce
    .number()
    .int()
    .refine((n): n is 30 | 90 | 0 => n === 30 || n === 90 || n === 0, "Use 30, 90 or 0")
    .optional()
    .meta({ description: "Days the recall figure covers. 0 is everything. Default 30." }),
  tz: z
    .string()
    .max(64)
    .optional()
    .meta({ description: "IANA timezone, e.g. Europe/Tallinn. Days bucket in this zone." }),
});

stats.get(
  "/insights",
  describe({
    tags: ["Review"],
    summary: "Everything the Insights screen shows",
    description:
      "Recall, consistency, the collection, what is due in the next seven days, and the cards that keep coming back. `period` scopes the recall figure only; consistency and the month totals are always the whole history. Days bucket in `tz`, resolved per timestamp so history that crosses a daylight-saving change lands on the right day.",
    ok: { schema: InsightsOut, description: "One screen's worth of numbers" },
    errors: [400],
  }),
  query(InsightsQuery, "query"),
  async (c) => {
    const { period, tz } = c.req.valid("query");
    return c.json(await insights(ctxOf(c), { period, zone: tz }));
  },
);

const StreakQuery = InsightsQuery.pick({ tz: true });

stats.get(
  "/streak",
  describe({
    tags: ["Review"],
    summary: "The streak and the days behind it",
    description:
      "Today's attempts against the daily goal, days in a row whose goal was satisfied, the longest run, how many days had a review, and every day with an attempt or a nothing-due confirmation. Days follow the learner's review timezone; `tz` is used only until one is known.",
    ok: { schema: StreakOut, description: "The streak" },
    errors: [400],
  }),
  query(StreakQuery, "query"),
  async (c) => c.json(await streak(ctxOf(c), { zone: c.req.valid("query").tz })),
);
