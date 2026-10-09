import { z } from "zod";
import { Timestamp } from "./common";

const UtcDate = z.string().meta({ description: "UTC YYYY-MM-DD" });

const Count = z.number().int();

export const ReportPeriodOut = z.object({
  from: UtcDate,
  to: UtcDate.meta({ description: "UTC YYYY-MM-DD, inclusive" }),
  days: Count,
});

export const DeckReportMetricsOut = z.object({
  adds: z.object({
    events: Count.meta({
      description:
        "Times a learner added the deck in the period, rejoins included. Adding a deck the learner already has records nothing, so a repeated request is never counted.",
    }),
    learners: Count.meta({ description: "Distinct learners behind those adds." }),
    newLearners: Count.meta({
      description: "Learners whose first add of this deck falls in the period.",
    }),
    rejoins: Count.meta({
      description: "Adds by a learner who had added the deck before and left it.",
    }),
    viaPublication: Count.meta({ description: "Adds from the public page or `/add/<slug>`." }),
    viaLink: Count.meta({ description: "Adds through a private join link or invitation." }),
    viaUnknown: Count.meta({ description: "Adds recorded before Lymi noted the way in." }),
  }),
  activation: z.object({
    cohort: Count.meta({ description: "`adds.newLearners`: the learners this section follows." }),
    activated: Count.meta({
      description:
        "Of the cohort, learners whose first accepted review of the deck came within 7 days of adding it.",
    }),
    pending: Count.meta({
      description:
        "Of the cohort, learners with no review yet whose 7 days are not over, so they are counted neither way.",
    }),
    rate: z.number().nullable().meta({
      description:
        "`activated` over `cohort` less `pending`, 0 to 1. Null when that denominator is 0.",
    }),
    medianHoursToFirstReview: z.number().nullable().meta({
      description: "Median hours from adding to the first accepted review, over `activated`.",
    }),
  }),
  use: z.object({
    reviewers: Count.meta({
      description: "Distinct learners with at least one accepted review of the deck's cards.",
    }),
    reviews: Count.meta({
      description:
        "Accepted reviews: graded in Lymi, not undone, and not the owner's own. Each review mode of a card counts.",
    }),
    returning: Count.meta({
      description: "Reviewers with accepted reviews on two or more different UTC days.",
    }),
    importedReviews: Count.meta({
      description:
        "Reviews replayed from another app's history and dated in the period. Never part of the other figures.",
    }),
  }),
  discovery: z.object({
    pageViews: Count.nullable().meta({
      description:
        "Requests for the deck's public page in any language, less known crawlers, link previews and prefetches. Requests, not people. Null when Lymi was not counting yet for any day of the period.",
    }),
    pageViewsCoverage: z.enum(["full", "partial", "none"]).meta({
      description:
        "`partial` when the period starts before `pageViewsSince`, so the figure covers only its later days.",
    }),
  }),
});

const PublicationStatusOut = z.object({
  slug: z.string(),
  status: z.enum(["published", "withdrawn"]),
  publishedAt: Timestamp.meta({ description: "The latest time the deck was published." }),
  withdrawnAt: Timestamp.nullable(),
});

export const DeckReportSummaryOut = z.object({
  deck: z.object({
    id: z.string(),
    name: z.string(),
    archived: z.boolean(),
  }),
  publication: PublicationStatusOut,
  members: Count.meta({ description: "Learners who have the deck now. Not tied to the period." }),
  current: DeckReportMetricsOut,
  previous: DeckReportMetricsOut.meta({
    description: "The same figures for the equal-length period just before.",
  }),
});

const ReportFrame = {
  period: ReportPeriodOut,
  previous: ReportPeriodOut,
  incomplete: z.boolean().meta({
    description: "The period ends today (UTC), so its last day is still filling.",
  }),
  generatedAt: Timestamp.meta({
    description: "Reports are computed when asked, so this is how fresh the figures are.",
  }),
  pageViewsSince: UtcDate.nullable().meta({
    description: "The first UTC day Lymi counted page views. Earlier days have none to report.",
  }),
};

export const DeckReportsOut = z.object({
  ...ReportFrame,
  decks: z.array(DeckReportSummaryOut).meta({
    description:
      "Every deck the account owns and has ever published, withdrawn and archived ones included, most recently published first.",
  }),
});

export const DeckReportDayOut = z.object({
  date: UtcDate,
  adds: Count.meta({ description: "Add events, as `adds.events`." }),
  reviewers: Count,
  reviews: Count,
  pageViews: Count.nullable().meta({ description: "Null before `pageViewsSince`." }),
});

export const DeckReportOut = z.object({
  ...ReportFrame,
  ...DeckReportSummaryOut.shape,
  days: z.array(DeckReportDayOut).meta({
    description: "Every UTC day of the period, oldest first, zeros included.",
  }),
});

export type DeckReportMetricsOut = z.infer<typeof DeckReportMetricsOut>;
export type DeckReportSummaryOut = z.infer<typeof DeckReportSummaryOut>;
export type DeckReportsOut = z.infer<typeof DeckReportsOut>;
export type DeckReportDayOut = z.infer<typeof DeckReportDayOut>;
export type DeckReportOut = z.infer<typeof DeckReportOut>;
export type ReportPeriodOut = z.infer<typeof ReportPeriodOut>;
