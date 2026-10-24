import {
  ContentReportInput,
  ContentReportOut,
  ModerationReportOut,
  ResolveContentReportInput,
} from "@lymi/core";
import { Hono } from "hono";
import { z } from "zod";
import { operatorEmails } from "../env";
import { body, ctxOf, describe, query } from "../http";
import type { AppEnv } from "../index";
import {
  getContentReport,
  listContentReports,
  reportContent,
  resolveContentReport,
} from "../services";

/** A learner's report of a deck or card someone else wrote. In the app only, never by key. */
export const contentReports = new Hono<AppEnv>();

contentReports.post(
  "/",
  describe({
    hide: true,
    learnerOnly: true,
    ok: { schema: ContentReportOut, description: "Report stored and sent to Lymi" },
    errors: [400, 404, 409],
  }),
  body(ContentReportInput, "report"),
  async (c) => c.json(await reportContent(ctxOf(c), c.env, c.req.valid("json"))),
);

/** Lymi's operators reading and settling reports, by session or by their own key. Not found to anyone else. */
export const moderation = new Hono<AppEnv>();

const ListQuery = z.object({ status: z.enum(["open", "resolved"]).optional() });

moderation.get(
  "/reports",
  describe({
    hide: true,
    ok: { schema: z.array(ModerationReportOut), description: "Reports, open ones oldest first" },
    errors: [404],
  }),
  query(ListQuery, "reports"),
  async (c) =>
    c.json(
      await listContentReports(
        ctxOf(c),
        operatorEmails(c.env),
        c.req.valid("query").status ?? "open",
      ),
    ),
);

moderation.get(
  "/reports/:id",
  describe({ hide: true, ok: { schema: ModerationReportOut, description: "One report" }, errors: [404] }),
  async (c) =>
    c.json(await getContentReport(ctxOf(c), operatorEmails(c.env), c.req.param("id"))),
);

moderation.post(
  "/reports/:id/resolve",
  describe({
    hide: true,
    ok: { schema: ModerationReportOut, description: "The report, resolved" },
    errors: [400, 404, 409],
  }),
  body(ResolveContentReportInput, "resolution"),
  async (c) =>
    c.json(
      await resolveContentReport(
        ctxOf(c),
        operatorEmails(c.env),
        c.req.param("id"),
        c.req.valid("json").action,
      ),
    ),
);
