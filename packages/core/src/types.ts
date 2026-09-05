import { z } from "zod";

/** Which way the card is asked. Recognition: see the term, recall the meaning. Production: the reverse. */
export const Direction = z.enum(["recognition", "production"]);
export type Direction = z.infer<typeof Direction>;

/** FSRS grade. 1 Again, 2 Hard, 3 Good, 4 Easy. */
export const Rating = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type Rating = z.infer<typeof Rating>;

/** Where a field's content came from. Shown in the UI so AI text is never mistaken for the lesson. */
export const FieldSource = z.enum(["lesson", "ai", "manual"]);
export type FieldSource = z.infer<typeof FieldSource>;

/** Who performed an action. Written to the audit log. */
export const Actor = z.enum(["user", "api", "mcp", "ai", "system"]);
export type Actor = z.infer<typeof Actor>;

/** BCP 47 language tag, loosely validated. "it", "pt-BR", "uk". */
export const LanguageTag = z
  .string()
  .min(2)
  .max(12)
  .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/);

/** Which way a deck (or a single card) is asked. */
export const Directions = z.enum(["recognition", "production", "both"]);
export type Directions = z.infer<typeof Directions>;

export const DeckInput = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).optional(),
  defaultLanguage: LanguageTag.nullable().optional(),
  directions: Directions.optional(),
});
export type DeckInput = z.infer<typeof DeckInput>;

export const CardInput = z.object({
  deckId: z.string().min(1),
  term: z.string().trim().min(1).max(500),
  meaning: z.string().trim().max(1000).optional(),
  pronunciation: z.string().trim().max(200).optional(),
  example: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(2000).optional(),
  language: LanguageTag.nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  source: z.string().trim().max(200).optional(),
  directions: Directions.nullable().optional(),
  meaningSource: FieldSource.optional(),
  exampleSource: FieldSource.optional(),
});
export type CardInput = z.infer<typeof CardInput>;

/** A batch add. A lesson is 20 to 40 terms; one call, not one per term. */
export const CardsInput = z.object({
  cards: z.array(CardInput).min(1).max(200),
});
export type CardsInput = z.infer<typeof CardsInput>;

export const CardPatch = CardInput.partial()
  .omit({ deckId: true })
  .extend({
    deckId: z.string().min(1).optional(),
  });
export type CardPatch = z.infer<typeof CardPatch>;

export const GradeInput = z.object({
  cardId: z.string().min(1),
  direction: Direction,
  rating: Rating,
  /** Client time of the review, so offline grades keep their real timestamp. */
  reviewedAt: z.coerce.date().optional(),
});
export type GradeInput = z.infer<typeof GradeInput>;

export const SettingsPatch = z.object({
  /** The language meanings are written in. */
  meaningLanguage: LanguageTag.optional(),
});
export type SettingsPatch = z.infer<typeof SettingsPatch>;
