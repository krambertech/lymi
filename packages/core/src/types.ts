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

/**
 * What a key or OAuth grant may do. `read` lists and searches. `write` also adds, edits and
 * archives decks and cards. Reviews are never writable by an integration, whatever the scope.
 */
export const Scope = z.enum(["read", "write"]);
export type Scope = z.infer<typeof Scope>;

/**
 * BCP 47 language tag, loosely validated. "it", "pt-BR", "uk". The messages are written for
 * a person because they are shown to one: the interface parses with these same schemas, so
 * whatever the API says on a 400 is what the field says under the control.
 */
export const LanguageTag = z
  .string()
  .min(2, "A language tag is at least two letters, like it or uk.")
  .max(12, "That is too long for a language tag.")
  .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/, "Use a language tag like ca, pt-BR or zh-Hant.");

/** Which way a deck (or a single card) is asked. */
export const Directions = z.enum(["recognition", "production", "both"]);
export type Directions = z.infer<typeof Directions>;

export const DeckInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Give the deck a name.")
    .max(80, "Keep the name under 80 characters."),
  /** Null clears it, so a description can be taken back off a deck. */
  description: z
    .string()
    .trim()
    .max(500, "Keep the description under 500 characters.")
    .nullable()
    .optional(),
  defaultLanguage: LanguageTag.nullable().optional(),
  directions: Directions.optional(),
});
export type DeckInput = z.infer<typeof DeckInput>;

export const CardInput = z.object({
  deckId: z.string().min(1, "Choose a deck for it to go in."),
  term: z
    .string()
    .trim()
    .min(1, "Type the word or phrase.")
    .max(500, "That is longer than a card holds."),
  meaning: z.string().trim().max(1000, "Keep the meaning under 1000 characters.").optional(),
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

/** Daily reminders run on quarter-hour boundaries so one shared cron can deliver them. */
export const ReminderTime = z
  .string()
  .regex(/^([01]\d|2[0-3]):(00|15|30|45)$/, "Choose a time on a 15-minute boundary");
export type ReminderTime = z.infer<typeof ReminderTime>;

const PushEndpoint = z
  .url()
  .max(4096)
  .refine((value) => value.startsWith("https://"), "Push endpoint must use HTTPS");

const PushKey = z
  .string()
  .min(1)
  .max(512)
  .regex(/^[A-Za-z0-9_-]+$/);

const TimeZone = z
  .string()
  .min(1)
  .max(64)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("en", { timeZone: value }).format();
      return true;
    } catch {
      return false;
    }
  }, "Use an IANA timezone such as Europe/Tallinn");

/** One browser installation. Push endpoints are capabilities and never appear in responses. */
export const PushSubscriptionInput = z.object({
  endpoint: PushEndpoint,
  expirationTime: z.number().int().nonnegative().max(8_640_000_000_000_000).nullable(),
  keys: z.object({ p256dh: PushKey, auth: PushKey }),
  reminderTime: ReminderTime,
  timezone: TimeZone,
});
export type PushSubscriptionInput = z.infer<typeof PushSubscriptionInput>;

export const PushEndpointInput = z.object({ endpoint: PushEndpoint });
export type PushEndpointInput = z.infer<typeof PushEndpointInput>;

export const ApiKeyInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name the key, so you know which one to revoke later.")
    .max(32, "Keep the name under 32 characters."),
  scope: Scope,
});
export type ApiKeyInput = z.infer<typeof ApiKeyInput>;

/**
 * Asking to be told when Lymi opens up. Not a sign-up: it stores an address and
 * nothing else, and it grants no access to the app.
 */
export const BetaSignupInput = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  /** Where on the site the address came from. Free text so a second page can say its own name. */
  source: z.string().trim().min(1).max(32).optional(),
});
export type BetaSignupInput = z.infer<typeof BetaSignupInput>;

export const BetaSignupOut = z.object({
  /** True when this address was already on the list. The caller is told, never rejected. */
  alreadyOn: z.boolean(),
});
export type BetaSignupOut = z.infer<typeof BetaSignupOut>;
