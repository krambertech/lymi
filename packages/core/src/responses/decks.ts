import { z } from "zod";
import { Directions, MemberRole, ReviewMode, SectionProgression } from "../types";
import { Timestamp } from "./common";

/** Whose deck it is, what the caller may do in it, and whether its owner published it. */
const Membership = {
  role: MemberRole.meta({ description: "The caller's role in the deck" }),
  owner: z
    .object({
      id: z.string(),
      name: z.string(),
      /**
       * Where the owner's photo is served, or null. A published deck only: publishing is the
       * deliberate act that makes a photo public, so a deck shared by link carries none.
       */
      avatarUrl: z.string().nullable().default(null),
    })
    .meta({ description: "Who owns the deck" }),
  published: z.boolean().meta({
    description: "True while the deck is published, which makes its owner its publisher",
  }),
};

const SeriesId = z.string().nullable().meta({
  description:
    "The owner's active series the deck is in. Always null for a member, and while the series is archived.",
});

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
    seriesId: SeriesId,
    sectionProgression: SectionProgression,
    meaningLanguage: z.string().nullable().meta({
      description:
        "The edition the caller reads this deck in, pinned when they added it. Null for its own words.",
    }),
    archivedAt: Timestamp.nullable(),
    importId: z
      .string()
      .nullable()
      .meta({ description: "The import that created the deck, if one did" }),
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
    seriesId: SeriesId,
    sectionProgression: SectionProgression,
    meaningLanguage: z.string().nullable().meta({
      description:
        "The edition the caller reads this deck in, pinned when they added it. Null for its own words.",
    }),
    total: z.number().int().meta({ description: "Active cards in the deck" }),
    due: z.number().int().meta({ description: "Cards with a direction due now for the caller" }),
    archivedAt: Timestamp.nullable().meta({ description: "Null while the deck is active" }),
    ...Membership,
  })
  .meta({ id: "DeckSummary" });
export type DeckSummaryOut = z.infer<typeof DeckSummaryOut>;
