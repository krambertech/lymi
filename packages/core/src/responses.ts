import { z } from "zod";
import { Actor, Direction, Directions, FieldSource, ReminderTime, Scope } from "./types";

/**
 * Response shapes, as the API sends them. The Drizzle row types are the source of truth for
 * what is stored; these say what crosses the wire, and they generate the OpenAPI document.
 * Timestamps are ISO 8601 strings in JSON.
 */
const Timestamp = z.iso.datetime().meta({ description: "ISO 8601 timestamp" });

export const DeckOut = z
  .object({
    id: z.string(),
    userId: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    defaultLanguage: z.string().nullable().meta({ description: "Prefills language on new cards" }),
    directions: Directions,
    position: z.number().int(),
    archivedAt: Timestamp.nullable(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "Deck" });
export type DeckOut = z.infer<typeof DeckOut>;

export const DeckSummaryOut = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    defaultLanguage: z.string().nullable(),
    directions: Directions,
    position: z.number().int(),
    total: z.number().int().meta({ description: "Active cards in the deck" }),
    due: z.number().int().meta({ description: "Card states due now" }),
  })
  .meta({ id: "DeckSummary" });
export type DeckSummaryOut = z.infer<typeof DeckSummaryOut>;

export const CardOut = z
  .object({
    id: z.string(),
    userId: z.string(),
    deckId: z.string(),
    term: z.string().meta({ description: "The word or phrase, in the language being learned" }),
    normalizedTerm: z.string().meta({ description: "The key the duplicate rule compares" }),
    meaning: z.string().nullable(),
    pronunciation: z.string().nullable(),
    example: z.string().nullable(),
    notes: z.string().nullable(),
    language: z.string().nullable().meta({ description: "BCP 47 tag, or null" }),
    tags: z.array(z.string()),
    source: z.string().nullable().meta({ description: "Free text: where the card came from" }),
    directions: Directions.nullable().meta({ description: "Overrides the deck when set" }),
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
    direction: Direction,
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
    direction: Direction,
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
  })
  .meta({ id: "GradeResult" });

export const SettingsOut = z
  .object({
    userId: z.string(),
    meaningLanguage: z.string().meta({ description: "The language meanings are written in" }),
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
    image: z.string().nullable(),
  })
  .meta({ id: "Me" });

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

export const OkOut = z.object({ ok: z.literal(true) }).meta({ id: "Ok" });

export const ErrorOut = z
  .object({
    error: z.string().meta({ description: "What went wrong, in plain words" }),
    issues: z.array(z.unknown()).optional().meta({ description: "Zod issues, on 400" }),
  })
  .meta({ id: "Error" });
