import { z } from "zod";
import { SLIPPING_LAPSES, SLIPPING_REVIEWS } from "../slipping";
import { Actor, Direction, Directions, EnrichmentStatus, FieldSource, ReviewMode } from "../types";
import { Timestamp } from "./common";

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
    notes: z.string().nullable().meta({ description: "Markdown source in the notes subset" }),
    language: z.string().nullable().meta({ description: "BCP 47 tag, or null" }),
    tags: z.array(z.string()),
    source: z.string().nullable().meta({ description: "Free text: where the card came from" }),
    sectionId: z.string().nullable().meta({
      description: "The card's active section. Null without one, and while it is archived.",
    }),
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
    pronunciationSource: FieldSource.nullable(),
    enrichmentStatus: EnrichmentStatus.nullable().meta({
      description: "Set while the AI is filling the card's empty fields, and null once it settles",
    }),
    audioKey: z.string().nullable(),
    createdBy: Actor.meta({ description: "Who added the card" }),
    importId: z
      .string()
      .nullable()
      .meta({ description: "The import that added the card, if one did" }),
    archivedAt: Timestamp.nullable(),
    createdAt: Timestamp,
    updatedAt: Timestamp,
  })
  .meta({ id: "Card" });
export type CardOut = z.infer<typeof CardOut>;

const ReviewRecord = {
  reviewCount: z.number().int().meta({ description: "Grades counted" }),
  lapses: z.number().int().meta({ description: "Forgot grades counted" }),
  lastRating: z
    .number()
    .int()
    .min(1)
    .max(4)
    .nullable()
    .meta({ description: "The latest grade: 1 Forgot, 2 Hard, 3 Good, 4 Easy. Null if none." }),
  lastReviewedAt: Timestamp.nullable(),
  dueAt: Timestamp.nullable().meta({
    description: "When it is next due. Null when it is not asked in this mode.",
  }),
  slipping: z.boolean().meta({
    description: `Forgotten at least ${SLIPPING_LAPSES} times in at least ${SLIPPING_REVIEWS} counted reviews`,
  }),
};

/**
 * The learner's own record of one card, from their accepted grades only: never another member's,
 * never an undone one. The overall record counts the reviews `filter.reviews.since` and
 * `filter.reviews.mode` select; the per-mode records count every mode since `since`.
 */
export const CardReviewStatsOut = z
  .object({
    ...ReviewRecord,
    dueAt: ReviewRecord.dueAt.meta({
      description:
        "When it is next due: in reviews.mode when the filter set one, else its soonest asked mode",
    }),
    modes: z.array(z.object({ mode: ReviewMode, ...ReviewRecord })).meta({
      description: "The same record for each review mode asked or graded, since reviews.since",
    }),
  })
  .meta({ id: "CardReviewStats" });
export type CardReviewStatsOut = z.infer<typeof CardReviewStatsOut>;

/** A card found by search, with the name of the deck it is in. */
export const CardHitOut = CardOut.extend({
  deckName: z.string().meta({ description: "The deck the card is in" }),
  stats: CardReviewStatsOut.optional().meta({ description: "Present when the search set `stats`" }),
}).meta({ id: "CardHit" });

/** How a page of search results says where it stands. The REST route and the MCP tool share it. */
export const CardSearchPaging = {
  nextCursor: z.string().nullable().meta({
    description:
      "Pass as `cursor` for the next page. Null on the last page. A page can be short or even empty while this is set.",
  }),
  total: z.number().int().nullable().meta({
    description:
      "How many cards match, across every page. Null when not known exactly: on every page after the first of a search that matches text, and when that search reads its 5,000-card limit.",
  }),
};

/** One page of a card search. */
export const CardSearchOut = z
  .object({ cards: z.array(CardHitOut), ...CardSearchPaging })
  .meta({ id: "CardSearchPage" });
export type CardSearchOut = z.infer<typeof CardSearchOut>;

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

const OutcomeId = z.string().meta({
  description:
    "The card the outcome is about. For a skipped add, the existing card; for an error, the id that was sent.",
});

/** Why one card in a bulk write was left alone. */
const CardWriteErrorOut = z.object({
  id: OutcomeId,
  status: z.literal("error"),
  code: z.enum(["not_found", "forbidden", "invalid", "conflict", "unavailable"]).meta({
    description:
      "not_found, forbidden or invalid, as a single write would answer; unavailable when saving failed and the card can be sent again",
  }),
  error: z.string().meta({ description: "Why this card was not changed, in plain words" }),
});

/** One outcome per card sent. A duplicate is skipped, never rejected. See ADR 0004. */
export const AddCardOutcomeOut = z
  .discriminatedUnion("status", [
    z.object({ id: OutcomeId, status: z.literal("added"), card: CardOut }),
    z.object({
      id: OutcomeId,
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

/** One outcome per card in a bulk edit. A card that fails says why and leaves the others alone. */
export const EditCardOutcomeOut = z
  .discriminatedUnion("status", [
    z.object({ id: OutcomeId, status: z.literal("updated"), card: CardOut }),
    CardWriteErrorOut,
  ])
  .meta({ id: "EditCardOutcome" });
export type EditCardOutcomeOut = z.infer<typeof EditCardOutcomeOut>;

export const EditCardsOut = z
  .object({ results: z.array(EditCardOutcomeOut) })
  .meta({ id: "EditCardsResult" });

/** One outcome per card in a bulk archive or restore. */
export const ArchiveCardOutcomeOut = z
  .discriminatedUnion("status", [
    z.object({ id: OutcomeId, status: z.literal("archived") }),
    z.object({ id: OutcomeId, status: z.literal("restored") }),
    CardWriteErrorOut,
  ])
  .meta({ id: "ArchiveCardOutcome" });

export const ArchiveCardsOut = z
  .object({ results: z.array(ArchiveCardOutcomeOut) })
  .meta({ id: "ArchiveCardsResult" });

/** A card write reduced to the card's id and what happened to it. */
export const TerseCardOutcomeOut = z
  .object({
    id: OutcomeId,
    status: z.enum(["added", "skipped", "updated", "archived", "restored", "error"]),
    enrichmentStatus: EnrichmentStatus.nullable().optional().meta({
      description: "On an add: set while the AI is filling the card, null once it settles",
    }),
    code: CardWriteErrorOut.shape.code.optional(),
    error: z.string().optional().meta({ description: "Why the card was not written" }),
  })
  .meta({ id: "TerseCardOutcome" });
export type TerseCardOutcomeOut = z.infer<typeof TerseCardOutcomeOut>;

export const TerseCardsOut = z
  .object({ results: z.array(TerseCardOutcomeOut) })
  .meta({ id: "TerseCardsResult" });
