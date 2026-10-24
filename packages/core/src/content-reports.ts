import { z } from "zod";
import { Timestamp } from "./responses/common";

/** Why a learner reported something. Fixed, so the operator's email and analytics never carry free text. */
export const ContentReportReason = z.enum(["offensive", "sexual", "harassment", "spam", "other"]);
export type ContentReportReason = z.infer<typeof ContentReportReason>;

/** How many reports one learner may send in one of their own days. */
export const CONTENT_REPORT_DAILY_LIMIT = 10;

export const CONTENT_REPORT_NOTE_MAX = 1000;

/** What is being reported: a deck the learner studies, one of its cards, or a deck behind a join link. */
export const ContentReportTarget = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("deck"), deckId: z.string().min(1).max(64) }),
  z.object({ kind: z.literal("card"), cardId: z.string().min(1).max(64) }),
  z.object({ kind: z.literal("join"), token: z.string().min(1).max(128) }),
]);
export type ContentReportTarget = z.infer<typeof ContentReportTarget>;

export const ContentReportInput = z.object({
  target: ContentReportTarget,
  reason: ContentReportReason,
  note: z.string().trim().max(CONTENT_REPORT_NOTE_MAX).optional(),
});
export type ContentReportInput = z.infer<typeof ContentReportInput>;

export const ContentReportOut = z
  .object({ id: z.string().meta({ description: "The report, or the one already open for this target" }) })
  .meta({ id: "ContentReport" });
export type ContentReportOut = z.infer<typeof ContentReportOut>;

/**
 * What the operator did about a report. Archiving and suspending cannot be undone by the owner:
 * the content stays archived and a suspended account cannot share again.
 */
export const ContentReportAction = z.enum([
  "dismiss",
  "archive_card",
  "archive_deck",
  "suspend_sharing",
]);
export type ContentReportAction = z.infer<typeof ContentReportAction>;

export const ResolveContentReportInput = z.object({ action: ContentReportAction });
export type ResolveContentReportInput = z.infer<typeof ResolveContentReportInput>;

/** A report as the operator reads it: the content as it was when reported, and who is involved. */
export const ModerationReportOut = z
  .object({
    id: z.string(),
    status: z.enum(["open", "resolved"]),
    reason: ContentReportReason,
    note: z.string().nullable(),
    createdAt: Timestamp,
    resolvedAt: Timestamp.nullable(),
    action: ContentReportAction.nullable(),
    via: z.enum(["member", "join"]),
    reporter: z.object({ id: z.string().nullable(), name: z.string(), email: z.string() }).nullable(),
    owner: z.object({ id: z.string().nullable(), name: z.string(), email: z.string() }).nullable(),
    deck: z.object({ id: z.string(), name: z.string(), members: z.number().int() }),
    card: z
      .object({
        id: z.string().nullable(),
        term: z.string(),
        meaning: z.string().nullable(),
        example: z.string().nullable(),
        notes: z.string().nullable(),
      })
      .nullable(),
    /** Reports against the same owner, this one included, so a pattern shows. */
    ownerReports: z.number().int(),
  })
  .meta({ id: "ModerationReport" });
export type ModerationReportOut = z.infer<typeof ModerationReportOut>;
