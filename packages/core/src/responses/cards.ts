import { z } from "zod";
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

/** One outcome per card in a bulk edit. A card that fails says why and leaves the others alone. */
export const EditCardOutcomeOut = z
  .discriminatedUnion("status", [
    z.object({ status: z.literal("updated"), card: CardOut }),
    z.object({
      status: z.literal("error"),
      cardId: z.string().meta({ description: "The card id that was sent" }),
      error: z.string().meta({ description: "Why this card was not changed" }),
    }),
  ])
  .meta({ id: "EditCardOutcome" });
export type EditCardOutcomeOut = z.infer<typeof EditCardOutcomeOut>;

export const EditCardsOut = z
  .object({ results: z.array(EditCardOutcomeOut) })
  .meta({ id: "EditCardsResult" });

/** A card write reduced to the card's id and what happened to it. */
export const TerseCardOutcomeOut = z
  .object({
    id: z.string().meta({
      description:
        "The card written. For a skipped add, the existing card; for an error, the id that was sent.",
    }),
    status: z.enum(["added", "skipped", "updated", "archived", "error"]),
    error: z.string().optional().meta({ description: "Why the card was not written" }),
  })
  .meta({ id: "TerseCardOutcome" });
export type TerseCardOutcomeOut = z.infer<typeof TerseCardOutcomeOut>;

export const TerseCardsOut = z
  .object({ results: z.array(TerseCardOutcomeOut) })
  .meta({ id: "TerseCardsResult" });
