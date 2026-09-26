import { z } from "zod";
import { ReviewDayOutcome, ReviewDayProgress } from "./review";

const LocalDate = z.string().meta({ description: "Local YYYY-MM-DD in the learner's timezone" });

export const InsightsOut = z
  .object({
    period: z
      .union([z.literal(30), z.literal(90), z.literal(0)])
      .meta({ description: "Days the recall figure covers. 0 is everything." }),
    recall: z.object({
      passed: z.number().int(),
      failed: z.number().int(),
      rate: z
        .number()
        .nullable()
        .meta({ description: "Passed over graded, 0 to 1. Null when nothing has come back." }),
      series: z
        .array(
          z.object({
            at: z
              .string()
              .meta({ description: "Local YYYY-MM-DD for the week's Monday, or YYYY-MM" }),
            passed: z.number().int(),
            failed: z.number().int(),
            rate: z.number(),
          }),
        )
        .meta({
          description:
            "Retention per week, or per month when the period is everything. Only buckets that graded something, so a week away is a gap rather than a zero.",
        }),
    }),
    consistency: z.object({
      days: z.array(z.object({ date: LocalDate, lit: z.boolean() })).meta({
        description:
          "The thirty local days ending today, oldest first. Always thirty, so a first day is drawn inside the same frame as a full month.",
      }),
      lit: z.number().int().meta({ description: "Days reviewed of those thirty" }),
      longestRun: z.number().int().meta({ description: "Longest unbroken run, all time" }),
      litAllTime: z.number().int(),
      daysAllTime: z.number().int().meta({ description: "Days since the first review" }),
    }),
    activity: z.object({
      today: LocalDate.meta({
        description:
          "Today in the review timezone, so the grid's boundary between done and not yet is the server's own.",
      }),
      firstDay: LocalDate.nullable().meta({
        description: "The first day with a review, where paging back stops. Null before any.",
      }),
      goal: z.number().int().meta({
        description:
          "The learner's current daily goal, which a day carrying no goal of its own is drawn against.",
      }),
      days: z
        .array(
          z.object({
            date: LocalDate,
            attempts: z.number().int().meta({
              description:
                "Accepted recall attempts, imported history included. The streak's own count leaves imports out, so the two differ by design.",
            }),
            goal: z.number().int().nullable().meta({
              description:
                "The goal the day was measured against. Null before goals, and imported.",
            }),
            satisfied: z.boolean().meta({
              description: "The day counted toward a streak. An imported day never does.",
            }),
            outcome: ReviewDayOutcome.nullable().meta({
              description:
                "How the day ended, so a day that met its goal keeps its own sentence. Null before goals, and for a day that is only imported history.",
            }),
          }),
        )
        .meta({
          description:
            "Every day that held an attempt, oldest first. Sparse: a day with nothing is absent rather than a zero.",
        }),
    }),
    cards: z.object({
      total: z.number().int(),
      new: z.number().int(),
      learning: z.number().int().meta({ description: "Learning and relearning together" }),
      known: z.number().int(),
    }),
    forecast: z
      .array(z.object({ date: LocalDate, count: z.number().int() }))
      .meta({ description: "Seven days from today. Overdue cards count into today." }),
    leeches: z.object({
      forgottenDays: z
        .number()
        .int()
        .meta({ description: "Forgotten at the first try on at least this many days" }),
      recentDays: z
        .number()
        .int()
        .meta({ description: "Of the card's last this many review days before today" }),
      cards: z.array(
        z.object({
          id: z.string(),
          deckId: z.string(),
          term: z.string(),
          meaning: z.string().nullable(),
          language: z.string().nullable(),
          lapses: z.number().int().meta({ description: "Forgot grades, all time" }),
          reviews: z.number().int().meta({ description: "Grades, all time" }),
        }),
      ),
    }),
  })
  .meta({ id: "Insights" });
export type InsightsOut = z.infer<typeof InsightsOut>;

export const StreakOut = z
  .object({
    today: ReviewDayProgress,
    goal: z.number().int().meta({
      description:
        "The learner's chosen goal. Today keeps the goal it opened with once it is finished; later days use this.",
    }),
    current: z.number().int().meta({
      description:
        "Days in a row whose goal was satisfied. Today adds once satisfied and is otherwise skipped; a nothing-due day or a rest day keeps the run without adding.",
    }),
    longest: z.number().int().meta({ description: "The longest such run anywhere in the history" }),
    reviewedDays: z.number().int().meta({ description: "Days with at least one attempt, ever" }),
    restDays: z.array(LocalDate).meta({
      description:
        "Past days that fell short but kept the run, oldest first: a run allows one rest day in any seven days. Derived on every read.",
    }),
    days: z
      .array(
        z.object({
          date: LocalDate,
          attempts: z.number().int(),
          goal: z
            .number()
            .int()
            .nullable()
            .meta({ description: "The goal that day was measured against. Null before goals." }),
          satisfied: z.boolean().meta({
            description:
              "The day counts toward a streak: its goal was met, its eligible reviews were exhausted, or it predates goals and had a review",
          }),
          outcome: ReviewDayOutcome.nullable().meta({
            description:
              "How the day ended, so a day that met its goal is told apart from one that ran out below it. Null before goals.",
          }),
        }),
      )
      .meta({
        description: "Every day with an attempt or a nothing-due confirmation, oldest first",
      }),
  })
  .meta({ id: "Streak" });
export type StreakOut = z.infer<typeof StreakOut>;
