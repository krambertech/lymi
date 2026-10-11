import { DeckReportOut, DeckReportsOut } from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { ctxOf, describe, query } from "../http";
import type { AppEnv } from "../index";
import { deckReport, deckReports, MAX_REPORT_DAYS, type ReportPeriodInput } from "../services";
import { ServiceError } from "../services/context";

export const reports = new Hono<AppEnv>();

const UtcDate = z.iso.date().meta({ description: "UTC YYYY-MM-DD" });

const ReportQuery = z.object({
  period: z
    .enum(["7d", "30d"])
    .optional()
    .meta({ description: "The last 7 or 30 UTC days, today included. Default 30d." }),
  from: UtcDate.optional().meta({ description: "First day of a custom period. Needs `to`." }),
  to: UtcDate.optional().meta({
    description: `Last day of a custom period, inclusive and no later than today. At most ${MAX_REPORT_DAYS} days after \`from\`.`,
  }),
});

function periodOf(q: z.infer<typeof ReportQuery>): ReportPeriodInput {
  if (q.from === undefined && q.to === undefined) return { period: q.period };
  if (q.from === undefined || q.to === undefined || q.period !== undefined) {
    throw new ServiceError("invalid", "Send `period`, or both `from` and `to`");
  }
  return { from: q.from, to: q.to };
}

const REPORTS =
  "Aggregate results for decks the caller owns and has published, withdrawn and archived ones included. Counts only: no learner is named and no one learner's reviews are returned. Any key on the owning account can read them, read-only ones included. Days are UTC, each figure comes with the equal-length period before it, and every field's description is its definition. ADR 0028.";

reports.get(
  "/decks",
  describe({
    tags: ["Reports"],
    summary: "Compare published decks",
    description: REPORTS,
    ok: { schema: DeckReportsOut, description: "One summary per deck" },
    errors: [400],
  }),
  query(ReportQuery, "query"),
  async (c) => c.json(await deckReports(ctxOf(c), periodOf(c.req.valid("query")))),
);

reports.get(
  "/decks/:id",
  describe({
    tags: ["Reports"],
    summary: "One published deck's report",
    description: `${REPORTS} Adds a row per day of the period. A deck that is not the caller's, or was never published, is not found.`,
    ok: { schema: DeckReportOut, description: "The deck's summary and daily rows" },
    errors: [400, 404],
  }),
  query(ReportQuery, "query"),
  async (c) =>
    c.json(await deckReport(ctxOf(c), c.req.param("id"), periodOf(c.req.valid("query")))),
);
