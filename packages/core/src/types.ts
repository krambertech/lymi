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
  .max(12, "Keep the language tag under 12 characters.")
  .regex(/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/, "Use a language tag like ca, pt-BR or zh-Hant.");

/** Which way a deck (or a single card) is asked. The legacy form of `reviewModes`. ADR 0014. */
export const Directions = z.enum(["recognition", "production", "both"]);
export type Directions = z.infer<typeof Directions>;

/** The stable key persistence uses for one review mode. ADR 0014. */
export const REVIEW_MODE_KEYS = [
  "term_to_meaning",
  "meaning_to_term",
  "image_to_term",
  "image_to_meaning",
] as const;
export const ReviewModeKey = z.enum(REVIEW_MODE_KEYS);
export type ReviewModeKey = z.infer<typeof ReviewModeKey>;

/** What a review shows before reveal and what the learner grades, one of four pairs. */
export const ReviewMode = z
  .union([
    z.object({ cue: z.literal("term"), target: z.literal("meaning") }),
    z.object({ cue: z.literal("meaning"), target: z.literal("term") }),
    z.object({ cue: z.literal("image"), target: z.literal("term") }),
    z.object({ cue: z.literal("image"), target: z.literal("meaning") }),
  ])
  .meta({
    id: "ReviewMode",
    description: "The cue shown before reveal and the target the learner grades",
  });
export type ReviewMode = z.infer<typeof ReviewMode>;

/** How a deck, or a card on its own, is asked; picture modes belong on cards. */
export const ReviewModes = z
  .array(ReviewMode)
  .min(1, "Choose at least one review mode.")
  .max(REVIEW_MODE_KEYS.length)
  .refine(
    (modes) => new Set(modes.map((m) => `${m.cue}:${m.target}`)).size === modes.length,
    "List each review mode once.",
  );

/** What a learner may do in a deck. Only `owner` and `learner` are granted today. ADR 0011. */
export const MemberRole = z.enum(["owner", "editor", "contributor", "learner"]);
export type MemberRole = z.infer<typeof MemberRole>;

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
  directions: Directions.optional().meta({ description: "Legacy form of `reviewModes`" }),
  reviewModes: ReviewModes.optional().meta({
    description: "Text modes only. Picture modes are set on each card.",
  }),
  seriesId: z.string().min(1).nullable().optional().meta({
    description:
      "One of the owner's active series; the deck goes last in it. Null takes the deck out of its series.",
  }),
});
export type DeckInput = z.infer<typeof DeckInput>;

const SeriesName = z
  .string()
  .trim()
  .min(1, "Give the series a name.")
  .max(80, "Keep the name under 80 characters.");

/** Deck ids in the order they should run. Each deck once. */
const DeckIds = z
  .array(z.string().min(1))
  .max(200)
  .refine((ids) => new Set(ids).size === ids.length, "List each deck once.");

export const SeriesInput = z.object({
  name: SeriesName,
  deckIds: DeckIds.optional().meta({
    description: "The owner's decks to move into the new series, in order",
  }),
});
export type SeriesInput = z.infer<typeof SeriesInput>;

export const SeriesPatch = z.object({ name: SeriesName });
export type SeriesPatch = z.infer<typeof SeriesPatch>;

/** The series' active decks, all of them, in their new order. A full list, so a retry lands the same. */
export const SeriesDecksInput = z.object({
  deckIds: DeckIds.meta({
    description:
      "Every active deck the series should hold, in order. A deck listed from elsewhere moves in; one left out leaves the series.",
  }),
});
export type SeriesDecksInput = z.infer<typeof SeriesDecksInput>;

export const SeriesOrderInput = z.object({
  seriesIds: z
    .array(z.string().min(1))
    .max(200)
    .refine((ids) => new Set(ids).size === ids.length, "List each series once.")
    .meta({ description: "Every active series, in their new order" }),
});
export type SeriesOrderInput = z.infer<typeof SeriesOrderInput>;

/** What happens to a series' active decks when it is archived. */
export const SeriesArchiveInput = z.object({
  decks: z.enum(["archive", "keep"]).meta({
    description:
      "archive: the decks leave Library and review with the series. keep: they stay, without a series.",
  }),
});
export type SeriesArchiveInput = z.infer<typeof SeriesArchiveInput>;

export const CardInput = z.object({
  deckId: z.string().min(1, "Choose a deck for it to go in."),
  term: z.string().trim().min(1, "Type the term.").max(500, "Keep the term under 500 characters."),
  meaning: z.string().trim().max(1000, "Keep the meaning under 1000 characters.").optional(),
  pronunciation: z.string().trim().max(200).optional(),
  example: z.string().trim().max(1000).optional(),
  notes: z.string().trim().max(2000).optional(),
  language: LanguageTag.nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  source: z.string().trim().max(200).optional(),
  directions: Directions.nullable()
    .optional()
    .meta({ description: "Legacy form of `reviewModes`. Null follows the deck." }),
  reviewModes: ReviewModes.nullable()
    .optional()
    .meta({ description: "Overrides the deck's review modes. Null follows the deck." }),
  meaningSource: FieldSource.optional(),
  exampleSource: FieldSource.optional(),
});
export type CardInput = z.infer<typeof CardInput>;

/** A batch add. A lesson is 20 to 40 terms; one call, not one per term. */
export const CardsInput = z.object({
  cards: z.array(CardInput).min(1).max(200),
});
export type CardsInput = z.infer<typeof CardsInput>;

/** What a card search filters on. Every field is optional; none narrows past the learner. */
export const CardSearchInput = z.object({
  query: z
    .string()
    .trim()
    .max(200)
    .optional()
    .meta({ description: "Matched against the term, meaning, example and notes" }),
  deckId: z.string().min(1).optional(),
  language: LanguageTag.optional(),
  archived: z
    .boolean()
    .optional()
    .meta({ description: "Archived cards instead of active ones. Off by default." }),
  limit: z
    .number()
    .int()
    .min(1)
    .max(200)
    .optional()
    .meta({ description: "At most this many, newest first. 50 by default." }),
});
export type CardSearchInput = z.infer<typeof CardSearchInput>;

/** The same search as a query string, where booleans and numbers arrive as text. */
export const CardSearchQuery = CardSearchInput.extend({
  archived: z.stringbool().optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const CardPatch = CardInput.partial()
  .omit({ deckId: true })
  .extend({
    deckId: z.string().min(1).optional(),
  });
export type CardPatch = z.infer<typeof CardPatch>;

/**
 * One grade names its review mode. `direction` is the form grades took before review modes,
 * still accepted so an older app or a queued offline grade replays onto the same schedule.
 */
export const GradeInput = z
  .object({
    cardId: z.string().min(1),
    mode: ReviewMode.optional(),
    direction: Direction.optional().meta({
      description: "Legacy. recognition is term → meaning and production is meaning → term.",
    }),
    rating: Rating,
    /** Client time of the review, so offline grades keep their real timestamp. */
    reviewedAt: z.coerce.date().optional(),
    /** The device zone, used only to set the review zone the first time one is reported. */
    timezone: z.string().max(64).optional(),
  })
  .refine((grade) => grade.mode || grade.direction, {
    message: "Say which review mode was graded.",
    path: ["mode"],
  });
export type GradeInput = z.infer<typeof GradeInput>;

/** What a picture shows, for a screen reader and when it cannot load, never naming the answer. */
export const ImageDescription = z
  .string()
  .trim()
  .min(1, "Describe the picture.")
  .max(300, "Keep the description under 300 characters.");

/** The card's `imageVersion` as last read, so a newer change makes the write a 409; null expects no picture yet. */
const ImageVersion = z
  .string()
  .max(64)
  .nullable()
  .optional()
  .meta({ description: "The card's `imageVersion` as last read. Omit to skip the check." });

export const CardImageImportInput = z.object({
  url: z
    .url({ protocol: /^https?$/, error: "Use a public http or https link to a picture." })
    .max(2048),
  description: ImageDescription.optional(),
  version: ImageVersion,
});
export type CardImageImportInput = z.infer<typeof CardImageImportInput>;

/** An upload's form fields; the file itself is checked by its bytes. */
export const CardImageUploadFields = z.object({
  description: ImageDescription.optional(),
  version: ImageVersion,
});

export const CardImagePatch = z.object({
  description: ImageDescription.nullable(),
  version: ImageVersion,
});
export type CardImagePatch = z.infer<typeof CardImagePatch>;

export const CardImageVersionInput = z.object({ version: ImageVersion });
export type CardImageVersionInput = z.infer<typeof CardImageVersionInput>;

/** The languages the interface exists in. Closed so a stored value always has a catalog. */
export const AppLanguage = z.enum(["en", "uk", "ru"]);
export type AppLanguage = z.infer<typeof AppLanguage>;

export const DEFAULT_DAILY_GOAL = 50;
export const DAILY_GOAL_PRESETS = [10, 25, 50, 100] as const;

/** Recall attempts that satisfy a day's streak goal. Every accepted, non-undone grade is one. */
export const DailyGoal = z
  .number({ error: "Type a number of reviews." })
  .int("Use a whole number of reviews.")
  .min(1, "A goal is at least one review.")
  .max(200, "Keep the goal to 200 reviews or fewer.");
export type DailyGoal = z.infer<typeof DailyGoal>;

export const SettingsPatch = z.object({
  /** The language of the interface and reminders. Meanings follow it. */
  appLanguage: AppLanguage.optional(),
  dailyGoal: DailyGoal.optional(),
});
export type SettingsPatch = z.infer<typeof SettingsPatch>;

/** Takes one attempt back: its count, and the card state it replaced. */
export const UndoInput = z.object({ reviewId: z.string().min(1) });
export type UndoInput = z.infer<typeof UndoInput>;

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

export const TimeZone = z
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

/** A visible page reporting its device zone. Moves the review day only while the mode is automatic. */
export const DeviceTimezoneInput = z.object({ timezone: TimeZone });
export type DeviceTimezoneInput = z.infer<typeof DeviceTimezoneInput>;

/** Settings: follow the device, or keep one zone until the learner returns to automatic. */
export const ReviewTimezoneInput = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("automatic") }),
  z.object({ mode: z.literal("manual"), timezone: TimeZone }),
]);
export type ReviewTimezoneInput = z.infer<typeof ReviewTimezoneInput>;

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
