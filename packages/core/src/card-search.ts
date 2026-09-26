import { z } from "zod";
import { SLIPPING_FORGOTTEN_DAYS, SLIPPING_RECENT_DAYS } from "./slipping";
import { CARD_LIMITS, EnrichmentStatus, FieldSource, LanguageTag, ReviewModeKey } from "./types";

/**
 * Card search: free text, a structured filter modelled on Linear's API filters, a sort, and a
 * cursor. The REST query string, the REST body and the MCP tool all parse into CardSearchInput.
 */

/** How many comparisons one filter may hold, each operator counting once, so a query stays inside D1's bound-parameter limit. */
export const CARD_FILTER_MAX_CONDITIONS = 50;

const Text = z.string().max(CARD_LIMITS.term);
const Id = z.string().min(1).max(100);
const List = <T extends z.ZodType>(item: T) => z.array(item).min(1).max(100);

const DURATION =
  /^([-+])?P(?!$)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)W)?(?:(\d+)D)?(?:T(?=\d)(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
const Timestamp = z.iso.datetime({ offset: true });
/** The longest duration a DateValue may name, in years. */
const MAX_DURATION_YEARS = 100;

function durationParts(value: string) {
  const match = DURATION.exec(value);
  if (!match) return null;
  const [, sign, ...parts] = match;
  const [years, months, weeks, days, hours, minutes, seconds] = parts.map((part) =>
    Number(part ?? 0),
  ) as [number, number, number, number, number, number, number];
  return { by: sign === "-" ? -1 : 1, years, months, weeks, days, hours, minutes, seconds };
}

function withinBound(value: string): boolean {
  const parts = durationParts(value);
  if (!parts) return true;
  const { years, months, weeks, days, hours, minutes, seconds } = parts;
  const inDays =
    years * 365.25 +
    months * 30.44 +
    weeks * 7 +
    days +
    (hours + (minutes + seconds / 60) / 60) / 24;
  return inDays <= MAX_DURATION_YEARS * 365.25;
}

/** A moment: an ISO 8601 timestamp, or an ISO 8601 duration from now, as Linear takes them. */
export const DateValue = z
  .string()
  .refine(
    (value) => DURATION.test(value) || Timestamp.safeParse(value).success,
    'Use an ISO timestamp like "2026-09-01T00:00:00Z" or a duration from now like "-P30D".',
  )
  .refine(withinBound, `Keep a duration within ${MAX_DURATION_YEARS} years.`);

/**
 * The moment a DateValue names, measured from `now`. Years and months move by the calendar and
 * keep the day where the target month has it, else its last day: 31 March less P1M is the end
 * of February.
 */
export function resolveDateValue(value: string, now: Date): Date {
  const parts = durationParts(value);
  if (!parts) return new Date(value);
  const { by, years, months, weeks, days, hours, minutes, seconds } = parts;
  const at = new Date(now);
  const month = at.getUTCMonth() + by * (years * 12 + months);
  const year = at.getUTCFullYear() + Math.floor(month / 12);
  const monthOfYear = ((month % 12) + 12) % 12;
  const lastDay = new Date(Date.UTC(year, monthOfYear + 1, 0)).getUTCDate();
  at.setUTCFullYear(year, monthOfYear, Math.min(at.getUTCDate(), lastDay));
  at.setUTCDate(at.getUTCDate() + by * (weeks * 7 + days));
  at.setTime(at.getTime() + by * ((hours * 60 + minutes) * 60 + seconds) * 1000);
  return at;
}

export const IdComparator = z.strictObject({
  eq: Id.optional(),
  in: List(Id).optional(),
  nin: List(Id).optional(),
  null: z.boolean().optional(),
});
export type IdComparator = z.infer<typeof IdComparator>;

export const StringComparator = z.strictObject({
  eq: Text.optional(),
  in: List(Text).optional(),
  contains: Text.optional(),
  startsWith: Text.optional(),
  null: z.boolean().optional(),
});
export type StringComparator = z.infer<typeof StringComparator>;

export const NumberComparator = z.strictObject({
  eq: z.number().optional(),
  gte: z.number().optional(),
  lte: z.number().optional(),
});
export type NumberComparator = z.infer<typeof NumberComparator>;

export const GradeComparator = z.strictObject({
  eq: z.number().int().min(1).max(4).optional(),
  in: List(z.number().int().min(1).max(4)).optional(),
});
export type GradeComparator = z.infer<typeof GradeComparator>;

export const DateComparator = z.strictObject({
  lt: DateValue.optional(),
  lte: DateValue.optional(),
  gt: DateValue.optional(),
  gte: DateValue.optional(),
  null: z.boolean().optional(),
});
export type DateComparator = z.infer<typeof DateComparator>;

const enumComparator = <T extends z.ZodEnum>(values: T) =>
  z.strictObject({
    eq: values.optional(),
    in: List(values).optional(),
    nin: List(values).optional(),
    null: z.boolean().optional(),
  });

export const SourceComparator = enumComparator(FieldSource);
export type SourceComparator = z.infer<typeof SourceComparator>;
export const EnrichmentComparator = enumComparator(EnrichmentStatus);
export type EnrichmentComparator = z.infer<typeof EnrichmentComparator>;

export const ReviewFilter = z
  .strictObject({
    since: DateValue.optional().meta({
      description: "Count only reviews at or after this moment. Left out: all time.",
    }),
    mode: ReviewModeKey.optional().meta({
      description: "Count only reviews in this review mode, and take its due date for dueAt",
    }),
    count: NumberComparator.optional().meta({ description: "Grades counted" }),
    lapses: NumberComparator.optional().meta({ description: "Forgot grades counted" }),
    lapseRate: NumberComparator.optional().meta({
      description: "Forgot grades per grade, 0 to 1. A card never reviewed has none.",
    }),
    lastRating: GradeComparator.optional().meta({
      description: "The latest grade: 1 Forgot, 2 Hard, 3 Good, 4 Easy",
    }),
    lastReviewedAt: DateComparator.optional(),
    slipping: z
      .strictObject({ eq: z.boolean() })
      .optional()
      .meta({
        description: `Often forgotten: the first grade was Forgot on ${SLIPPING_FORGOTTEN_DAYS} of its last ${SLIPPING_RECENT_DAYS} review days before today. Card-wide, whatever since and mode.`,
      }),
  })
  .meta({
    description:
      "The learner's own accepted grades, never another member's or an undone one. Its conditions combine with AND. since and mode also set what stats and the review sorts count.",
  });
export type ReviewFilter = z.infer<typeof ReviewFilter>;

export const CardFilter = z
  .strictObject({
    deckId: IdComparator.optional(),
    sectionId: IdComparator.optional().meta({
      description: "An active section of the card's deck",
    }),
    language: IdComparator.optional().meta({ description: "The card's language tag" }),
    term: StringComparator.optional(),
    meaning: StringComparator.optional(),
    example: StringComparator.optional(),
    pronunciation: StringComparator.optional(),
    notes: StringComparator.optional().meta({ description: "Compared as words, without Markdown" }),
    source: StringComparator.optional(),
    tags: z
      .strictObject({
        some: StringComparator.optional().meta({ description: "At least one tag matches" }),
      })
      .optional(),
    meaningSource: SourceComparator.optional(),
    exampleSource: SourceComparator.optional(),
    pronunciationSource: SourceComparator.optional(),
    enrichmentStatus: EnrichmentComparator.optional().meta({
      description: "working while AI enrichment runs, failed if it did not finish, null otherwise",
    }),
    createdAt: DateComparator.optional(),
    updatedAt: DateComparator.optional(),
    dueAt: DateComparator.optional().meta({
      description:
        "When the card is next due for the learner: in reviews.mode when set, else its soonest asked mode",
    }),
    reviews: ReviewFilter.optional(),
  })
  .meta({
    description:
      "Conditions on cards. Every field given must match: they combine with AND. For alternatives within a field use in, as in sectionId: { in: [...] } or reviews.lastRating: { in: [1, 2] }. At most 50 comparisons. " +
      "Text compares ignoring case and repeated spaces, the way duplicate terms match, against the text the learner reads; accents count. " +
      'null: true means none or empty. nin also keeps cards with none. Dates take an ISO timestamp or an ISO 8601 duration from now: "-P30D" is 30 days ago, "P1W" a week ahead.',
  });
export type CardFilter = z.infer<typeof CardFilter>;

/** How many comparisons a filter makes, each operator counting once. */
export function countConditions(filter: CardFilter): number {
  return Object.entries(filter).reduce(
    (sum, [key, value]) => (value === undefined ? sum : sum + countOperators(key, value)),
    0,
  );
}

function countOperators(key: string, comparator: object): number {
  let count = 0;
  for (const [op, value] of Object.entries(comparator)) {
    if (value === undefined || (key === "reviews" && (op === "since" || op === "mode"))) continue;
    count += typeof value === "object" && !Array.isArray(value) ? countOperators(op, value) : 1;
  }
  return count;
}

export const CARD_SORT_FIELDS = [
  "createdAt",
  "archivedAt",
  "term",
  "lapses",
  "lapseRate",
  "lastReviewedAt",
  "dueAt",
] as const;
export const CardSortField = z.enum(CARD_SORT_FIELDS);
export type CardSortField = z.infer<typeof CardSortField>;

export const CardSort = z
  .array(
    z.strictObject({
      field: CardSortField,
      direction: z.enum(["asc", "desc"]),
    }),
  )
  .min(1)
  .max(3)
  .refine(
    (keys) => new Set(keys.map((key) => key.field)).size === keys.length,
    "Sort by each field once.",
  )
  .meta({
    description:
      "Up to 3 keys, the first deciding most. createdAt desc by default, archivedAt desc for archived cards. Cards with no value for a key come last, and the id breaks ties. lapses, lapseRate and lastReviewedAt count the same reviews as the filter's reviews conditions.",
  });
export type CardSort = z.infer<typeof CardSort>;

const SearchFields = {
  query: z
    .string()
    .trim()
    .max(200)
    .optional()
    .meta({ description: "Free text matched against the term, meaning, example and notes" }),
  archived: z
    .boolean()
    .optional()
    .meta({ description: "Archived cards instead of active ones. Off by default." }),
  deckId: Id.optional().meta({ description: "Shorthand for filter.deckId.eq" }),
  sectionId: Id.optional().meta({
    description: "Shorthand for filter.sectionId.eq, an active section",
  }),
  term: z
    .string()
    .trim()
    .min(1)
    .max(CARD_LIMITS.term)
    .optional()
    .meta({ description: "Shorthand for filter.term.eq: the card with exactly this term" }),
  language: LanguageTag.optional().meta({ description: "Shorthand for filter.language.eq" }),
  stats: z.boolean().optional().meta({
    description:
      "Add the learner's own review record to each card, overall and per review mode. Off by default.",
  }),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .meta({ description: "At most this many per page. 50 by default." }),
  cursor: z
    .string()
    .regex(/^[\w-]+$/, "Pass the `nextCursor` value from the previous page.")
    .max(2000)
    .optional()
    .meta({
      description:
        "The `nextCursor` value from the previous page. Keep the same query, filter and sort while paging.",
    }),
};

/** A card search, as the REST body and the MCP tool take it. */
export const CardSearchInput = z
  .object({
    ...SearchFields,
    filter: CardFilter.optional(),
    sort: CardSort.optional(),
  })
  .superRefine((input, ctx) => {
    if (input.filter && countConditions(input.filter) > CARD_FILTER_MAX_CONDITIONS) {
      ctx.addIssue({
        code: "custom",
        path: ["filter"],
        message: `Use at most ${CARD_FILTER_MAX_CONDITIONS} comparisons in one filter.`,
      });
    }
  });
export type CardSearchInput = z.infer<typeof CardSearchInput>;

/** The simple search as a query string, where booleans and numbers arrive as text. */
export const CardSearchQuery = z.object({
  ...SearchFields,
  archived: z.stringbool().optional(),
  stats: z.stringbool().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type CardSearchQuery = z.infer<typeof CardSearchQuery>;
