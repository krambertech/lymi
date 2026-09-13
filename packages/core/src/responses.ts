import { z } from "zod";
import {
  Actor,
  AppLanguage,
  Direction,
  Directions,
  FieldSource,
  MemberRole,
  ReminderTime,
  ReviewMode,
  Scope,
} from "./types";

/**
 * Response shapes, as the API sends them. The Drizzle row types are the source of truth for
 * what is stored; these say what crosses the wire, and they generate the OpenAPI document.
 * Timestamps are ISO 8601 strings in JSON.
 */
const Timestamp = z.iso.datetime().meta({ description: "ISO 8601 timestamp" });

/** Where one learner-local day stands against its streak goal. */
export const ReviewDayOutcome = z.enum(["open", "goal_met", "exhausted", "nothing_due"]).meta({
  description:
    "open: not yet satisfied. goal_met: the goal's attempts landed. exhausted: every eligible review was done below the goal. nothing_due: nothing was eligible, which protects the streak without adding to it.",
});

export const ReviewDayProgress = z
  .object({
    date: z.string().meta({ description: "Local YYYY-MM-DD" }),
    attempts: z.number().int().meta({ description: "Accepted, non-undone grades that day" }),
    goal: z.number().int(),
    outcome: ReviewDayOutcome,
  })
  .meta({ id: "ReviewDayProgress" });
export type ReviewDayProgress = z.infer<typeof ReviewDayProgress>;

/** Whose deck it is and what the caller may do in it. */
const Membership = {
  role: MemberRole.meta({ description: "The caller's role in the deck" }),
  owner: z.object({ id: z.string(), name: z.string() }).meta({ description: "Who owns the deck" }),
};

export const DeckOut = z
  .object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    defaultLanguage: z.string().nullable().meta({ description: "Prefills language on new cards" }),
    directions: Directions.meta({ description: "Legacy form of `reviewModes`" }),
    reviewModes: z
      .array(ReviewMode)
      .meta({ description: "How cards that follow the deck are asked" }),
    position: z.number().int(),
    archivedAt: Timestamp.nullable(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
    ...Membership,
  })
  .meta({ id: "Deck" });
export type DeckOut = z.infer<typeof DeckOut>;

export const DeckSummaryOut = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    defaultLanguage: z.string().nullable(),
    directions: Directions.meta({ description: "Legacy form of `reviewModes`" }),
    reviewModes: z.array(ReviewMode),
    position: z.number().int(),
    total: z.number().int().meta({ description: "Active cards in the deck" }),
    due: z.number().int().meta({ description: "Cards with a direction due now for the caller" }),
    ...Membership,
  })
  .meta({ id: "DeckSummary" });
export type DeckSummaryOut = z.infer<typeof DeckSummaryOut>;

export const CardImageOut = z
  .object({
    id: z.string().meta({ description: "Changes whenever the picture is replaced" }),
    url: z.string().meta({
      description:
        "Path on the product origin that serves the picture to anyone who can read the card",
    }),
    contentType: z.string().meta({ description: "Always image/webp: pictures are normalized" }),
    width: z.number().int(),
    height: z.number().int(),
    byteSize: z.number().int(),
    description: z.string().nullable().meta({
      description:
        "What the picture shows, without naming the answer. Picture modes wait until there is one.",
    }),
    source: z.enum(["upload", "url"]),
    sourceHost: z.string().nullable().meta({ description: "Host of an imported link" }),
    createdBy: Actor,
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "CardImage" });
export type CardImageOut = z.infer<typeof CardImageOut>;

export const CardOut = z
  .object({
    id: z.string(),
    userId: z.string(),
    deckId: z.string(),
    term: z
      .string()
      .meta({ description: "What the card asks about, in the language being learned" }),
    normalizedTerm: z.string().meta({ description: "The key the duplicate rule compares" }),
    meaning: z.string().nullable(),
    pronunciation: z.string().nullable(),
    example: z.string().nullable(),
    notes: z.string().nullable(),
    language: z.string().nullable().meta({ description: "BCP 47 tag, or null" }),
    tags: z.array(z.string()),
    source: z.string().nullable().meta({ description: "Free text: where the card came from" }),
    directions: Directions.nullable().meta({
      description: "Legacy form of `reviewModes`. Overrides the deck when set.",
    }),
    reviewModes: z
      .array(ReviewMode)
      .nullable()
      .meta({ description: "Overrides the deck's review modes when set" }),
    image: CardImageOut.nullable().meta({ description: "The active picture, if any" }),
    imageVersion: z.string().nullable().meta({
      description:
        "Changes with every picture write. Send it back as `version` so a stale write gets 409.",
    }),
    meaningSource: FieldSource.nullable(),
    exampleSource: FieldSource.nullable(),
    audioKey: z.string().nullable(),
    createdBy: Actor.meta({ description: "Who added the card" }),
    archivedAt: Timestamp.nullable(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "Card" });
export type CardOut = z.infer<typeof CardOut>;

/** A card found by search, with the name of the deck it is in. */
export const CardHitOut = CardOut.extend({
  deckName: z.string().meta({ description: "The deck the card is in" }),
}).meta({ id: "CardHit" });

export const CardStateOut = z
  .object({
    id: z.string(),
    cardId: z.string(),
    userId: z.string(),
    mode: ReviewMode,
    direction: Direction.nullable().meta({
      description: "Legacy form of `mode`. Null for picture modes.",
    }),
    due: Timestamp,
    state: z
      .number()
      .int()
      .min(0)
      .max(3)
      .meta({ description: "0 New, 1 Learning, 2 Review, 3 Relearning" }),
    fsrs: z.string().meta({ description: "ts-fsrs Card as JSON" }),
    lastReview: Timestamp.nullable(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "CardState" });

export const CardWithStateOut = z
  .object({ card: CardOut, state: CardStateOut.nullable() })
  .meta({ id: "CardWithState" });

/** One outcome per card sent. A duplicate is skipped, never rejected. See ADR 0004. */
/** One review of one card, as the card's history shows it. */
export const ReviewOut = z
  .object({
    id: z.string(),
    cardId: z.string(),
    mode: ReviewMode,
    direction: Direction.nullable().meta({
      description: "Legacy form of `mode`. Null for picture modes.",
    }),
    rating: z.number().int().min(1).max(4),
    state: z.number().int().meta({ description: "FSRS state before this review" }),
    elapsedDays: z.number().int(),
    scheduledDays: z.number().int(),
    stabilityAfter: z.number(),
    difficultyAfter: z.number(),
    reviewedAt: Timestamp,
    source: z.enum(["web", "api", "mcp"]),
  })
  .meta({ id: "Review" });
export type ReviewOut = z.infer<typeof ReviewOut>;

/** A write to one card, from the audit log: who did what, and when. */
export const CardEventOut = z
  .object({
    id: z.string(),
    actor: Actor,
    action: z.string().meta({ description: "create, update, archive or restore" }),
    at: Timestamp,
    payload: z.unknown().nullable().meta({ description: "What the write sent, if anything" }),
  })
  .meta({ id: "CardEvent" });
export type CardEventOut = z.infer<typeof CardEventOut>;

/** Everything that ever happened to a card: its reviews and its writes, newest first. */
export const CardHistoryOut = z
  .object({
    states: z
      .array(CardStateOut)
      .meta({ description: "One per review mode the card has been asked in" }),
    reviews: z.array(ReviewOut),
    events: z.array(CardEventOut),
  })
  .meta({ id: "CardHistory" });
export type CardHistoryOut = z.infer<typeof CardHistoryOut>;

export const AddCardOutcomeOut = z
  .discriminatedUnion("status", [
    z.object({ status: z.literal("added"), card: CardOut }),
    z.object({
      status: z.literal("skipped"),
      term: z.string().meta({ description: "The term that was sent" }),
      existing: CardOut.meta({ description: "The active card that already holds this term" }),
      deckName: z.string().meta({ description: "Where the existing card lives" }),
    }),
  ])
  .meta({ id: "AddCardOutcome" });
export type AddCardOutcomeOut = z.infer<typeof AddCardOutcomeOut>;

export const AddCardsOut = z
  .object({ results: z.array(AddCardOutcomeOut) })
  .meta({ id: "AddCardsResult" });

export const QueueItemOut = z
  .object({
    card: CardOut,
    mode: ReviewMode.meta({ description: "Show the cue before reveal and grade the target" }),
    direction: Direction.optional().meta({
      description:
        "Legacy form of `mode`, present for text modes only so an older client never grades a picture mode as its text sibling.",
    }),
    stateId: z.string(),
    fsrsState: z.number().int(),
    next: z
      .object({ 1: Timestamp, 2: Timestamp, 3: Timestamp, 4: Timestamp })
      .meta({ description: "When each grade would schedule the card" }),
  })
  .meta({ id: "QueueItem" });

export const QueueOut = z
  .object({ total: z.number().int(), items: z.array(QueueItemOut) })
  .meta({ id: "Queue" });

export const GradeOut = z
  .object({
    ok: z.literal(true),
    duplicate: z
      .boolean()
      .meta({ description: "True when an older or equal review already existed" }),
    due: Timestamp,
    state: z.number().int(),
    reviewId: z
      .string()
      .nullable()
      .meta({ description: "The attempt, for Undo. Null when the grade was a duplicate." }),
    day: ReviewDayProgress,
  })
  .meta({ id: "GradeResult" });

export const SettingsOut = z
  .object({
    userId: z.string(),
    appLanguage: AppLanguage.nullable().meta({
      description:
        "The language of the interface and reminders. Null until the learner has chosen.",
    }),
    meaningLanguage: z
      .string()
      .meta({ description: "The language meanings are written in. Follows the app language." }),
    dailyGoal: z.number().int().meta({
      description:
        "Recall attempts that satisfy a day's streak goal. 50 until the learner chooses.",
    }),
    dailyGoalChosenAt: Timestamp.nullable().meta({
      description: "When the learner chose the goal. Null means the first review should ask.",
    }),
    reviewTimezone: z
      .string()
      .nullable()
      .meta({ description: "IANA zone that decides where a review day begins" }),
    reviewTimezoneMode: z.enum(["automatic", "manual"]),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "Settings" });

export const PushConfigOut = z
  .object({ publicKey: z.string().min(1).meta({ description: "Public VAPID key" }) })
  .meta({ id: "PushConfig" });

export const PushSubscriptionStatusOut = z
  .object({
    enabled: z.boolean(),
    reminderTime: ReminderTime.nullable(),
    timezone: z.string().nullable(),
  })
  .meta({ id: "PushSubscriptionStatus" });

export const ApiKeyOut = z
  .object({
    id: z.string(),
    name: z.string().nullable(),
    start: z
      .string()
      .nullable()
      .meta({ description: "First characters of the key, for recognising it" }),
    scope: Scope,
    lastRequest: Timestamp.nullable(),
    createdAt: Timestamp,
  })
  .meta({ id: "ApiKey" });

export const ApiKeyCreatedOut = ApiKeyOut.extend({
  key: z.string().meta({ description: "The plain key. Shown once; the server stores a hash." }),
}).meta({ id: "ApiKeyCreated" });

export const ConnectedAppOut = z
  .object({
    id: z.string(),
    clientId: z.string().meta({ description: "The client's Client ID Metadata Document URL" }),
    name: z.string().nullable().meta({ description: "The name the client gave for itself" }),
    scope: Scope,
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "ConnectedApp" });

export const MeOut = z
  .object({
    id: z.string(),
    name: z.string(),
    email: z.string(),
  })
  .meta({ id: "Me" });

/** The learner's photo, for the app only. `version` is null when the initial shows instead. */
export const AvatarOut = z
  .object({
    source: z.enum(["custom", "google"]).nullable(),
    version: z.string().nullable(),
    revision: z.number().int(),
    /** A Google photo is stored, so removing the learner's own photo brings it back. */
    hasGoogle: z.boolean(),
  })
  .meta({ id: "Avatar" });
export type AvatarOut = z.infer<typeof AvatarOut>;

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
      days: z
        .array(z.object({ date: LocalDate, lit: z.boolean() }))
        .meta({ description: "The last thirty days, oldest first" }),
      lit: z.number().int().meta({ description: "Days reviewed of those thirty" }),
      longestRun: z.number().int().meta({ description: "Longest unbroken run, all time" }),
      litAllTime: z.number().int(),
      daysAllTime: z.number().int().meta({ description: "Days since the first review" }),
    }),
    months: z
      .array(
        z.object({
          month: z.string().meta({ description: "Local YYYY-MM" }),
          lit: z.number().int(),
          days: z
            .number()
            .int()
            .meta({ description: "Days elapsed; the current month counts to today" }),
        }),
      )
      .meta({ description: "Up to twelve months, oldest first" }),
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
      lapses: z.number().int().meta({ description: "Forgotten at least this many times" }),
      reviews: z.number().int().meta({ description: "And reviewed at least this many times" }),
      cards: z.array(
        z.object({
          id: z.string(),
          deckId: z.string(),
          term: z.string(),
          meaning: z.string().nullable(),
          language: z.string().nullable(),
          lapses: z.number().int(),
          reviews: z.number().int(),
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
        "Days in a row whose goal was satisfied. Today adds once satisfied and is otherwise skipped; a nothing-due day keeps the run without adding.",
    }),
    longest: z.number().int().meta({ description: "The longest such run anywhere in the history" }),
    reviewedDays: z.number().int().meta({ description: "Days with at least one attempt, ever" }),
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
          nothingDue: z.boolean(),
        }),
      )
      .meta({
        description: "Every day with an attempt or a nothing-due confirmation, oldest first",
      }),
  })
  .meta({ id: "Streak" });
export type StreakOut = z.infer<typeof StreakOut>;

export const UndoOut = z
  .object({ ok: z.literal(true), day: ReviewDayProgress })
  .meta({ id: "UndoResult" });

export const JoinLinkOut = z
  .object({
    link: z
      .object({ url: z.string(), createdAt: Timestamp })
      .nullable()
      .meta({ description: "The deck's join link, or null while sharing is off" }),
    members: z.number().int().meta({ description: "People who joined and are still in the deck" }),
  })
  .meta({ id: "JoinLink" });
export type JoinLinkOut = z.infer<typeof JoinLinkOut>;

/** What a join page may show. Never cards, and nothing about the deck unless the link works. */
export const JoinPreviewOut = z
  .object({
    status: z.enum(["live", "off", "archived", "invalid"]),
    deck: z
      .object({
        name: z.string(),
        total: z.number().int(),
        owner: z.object({ name: z.string() }),
        language: z.string().nullable(),
        lastAddedAt: Timestamp.nullable(),
        samples: z.array(z.object({ term: z.string(), meaning: z.string().nullable() })).meta({
          description:
            "Up to ten cards drawn at random, shown on the page and never in its metadata",
        }),
      })
      .nullable()
      .meta({ description: "Present only while the link works" }),
    viewer: z
      .enum(["signed-out", "visitor", "member", "owner", "removed"])
      .meta({ description: "Who is looking: not signed in, not in the deck, in it, or removed" }),
    deckId: z
      .string()
      .nullable()
      .meta({ description: "Present only when the viewer can already open the deck" }),
  })
  .meta({ id: "JoinPreview" });
export type JoinPreviewOut = z.infer<typeof JoinPreviewOut>;

export const JoinOut = z.object({ deckId: z.string(), role: MemberRole }).meta({ id: "Join" });
export type JoinOut = z.infer<typeof JoinOut>;

export const OkOut = z.object({ ok: z.literal(true) }).meta({ id: "Ok" });

export const ErrorOut = z
  .object({
    error: z.string().meta({ description: "What went wrong, in plain words" }),
    issues: z.array(z.unknown()).optional().meta({ description: "Zod issues, on 400" }),
  })
  .meta({ id: "Error" });
