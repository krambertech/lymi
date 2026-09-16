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

/** Where a card's enrichment stands. Null once nothing is outstanding. */
export const EnrichmentStatus = z.enum(["working", "failed"]);
export type EnrichmentStatus = z.infer<typeof EnrichmentStatus>;

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

/** How a deck's sections open for each learner. */
export const SECTION_PROGRESSIONS = ["automatic", "manual", "open"] as const;
export const SectionProgression = z.enum(SECTION_PROGRESSIONS).meta({
  id: "SectionProgression",
  description:
    "How each learner's sections open. automatic, the default: the next section opens once every card of the current one has come up and 80% are Known. manual: it becomes ready then, and the learner starts it. open: every section is open. Anyone can start a later section early.",
});
export type SectionProgression = z.infer<typeof SectionProgression>;

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
  sectionProgression: SectionProgression.optional(),
});
export type DeckInput = z.infer<typeof DeckInput>;

/** Lower-case words joined by hyphens, as in `everyday-estonian`. */
export const PUBLICATION_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const PublicationInput = z
  .object({
    slug: z
      .string()
      .min(3)
      .max(80)
      .regex(PUBLICATION_SLUG, "Use lower-case words joined by hyphens, like everyday-estonian.")
      .meta({ description: "The public URL part. Changing it breaks links already shared." }),
    summary: z.string().trim().min(1).max(500).meta({ description: "One or two plain sentences" }),
    level: z
      .enum(["A1", "A2", "B1", "B2", "C1", "C2"])
      .nullable()
      .optional()
      .meta({ description: "CEFR level" }),
    meaningLanguage: LanguageTag.meta({ description: "The language the meanings are written in" }),
    publisher: z.string().trim().min(1).max(80),
    sources: z
      .array(z.object({ title: z.string().trim().min(1).max(200), url: z.url().optional() }))
      .max(20)
      .default([]),
    reviewedAt: z.iso
      .date()
      .nullable()
      .optional()
      .meta({ description: "When a person last checked the whole deck" }),
  })
  .meta({ id: "PublicationInput" });
export type PublicationInput = z.infer<typeof PublicationInput>;

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

const SectionName = z
  .string()
  .trim()
  .min(1, "Give the section a name.")
  .max(80, "Keep the name under 80 characters.");

/** Card ids, each once. */
const CardIds = z
  .array(z.string().min(1))
  .max(500)
  .refine((ids) => new Set(ids).size === ids.length, "List each card once.");

export const SectionInput = z.object({
  name: SectionName,
  cardIds: CardIds.optional().meta({
    description: "Cards of the deck to move into the new section",
  }),
});
export type SectionInput = z.infer<typeof SectionInput>;

export const SectionPatch = z.object({ name: SectionName });
export type SectionPatch = z.infer<typeof SectionPatch>;

export const SectionOrderInput = z.object({
  sectionIds: z
    .array(z.string().min(1))
    .max(500)
    .refine((ids) => new Set(ids).size === ids.length, "List each section once.")
    .meta({ description: "Every active section of the deck, in the new order" }),
});
export type SectionOrderInput = z.infer<typeof SectionOrderInput>;

/** What happens to a section's active cards when it is archived. */
export const SectionArchiveInput = z.object({
  cards: z.enum(["archive", "keep"]).meta({
    description:
      "archive: the cards leave the deck and review with the section. keep: they stay in the deck, without a section.",
  }),
});
export type SectionArchiveInput = z.infer<typeof SectionArchiveInput>;

/** Put many cards of one deck in a section, or take them out of theirs. */
export const CardSectionInput = z.object({
  cardIds: CardIds.min(1, "Choose at least one card."),
  sectionId: z.string().min(1).nullable().meta({
    description: "An active section of the same deck. Null takes the cards out of theirs.",
  }),
});
export type CardSectionInput = z.infer<typeof CardSectionInput>;

/** The notes subset in one sentence, so assistants write it on purpose. `notes.ts` reads it. */
const NOTES_FORMAT =
  "Markdown subset: paragraphs, line breaks, **bold**, *italic*, and bulleted (- item) or numbered (1. item) lists. A single line break stays a line break. Anything else, HTML included, shows as its literal text.";

/**
 * How long each field of a card may be. Enrichment bounds what a model returns by the same
 * numbers, so AI text can never be longer than the edit sheet will let the learner save.
 */
export const CARD_LIMITS = {
  term: 500,
  meaning: 2000,
  pronunciation: 200,
  example: 2000,
  notes: 2000,
  source: 200,
} as const;

export const CardInput = z.object({
  deckId: z.string().min(1, "Choose a deck for it to go in."),
  term: z
    .string()
    .trim()
    .min(1, "Type the term.")
    .max(CARD_LIMITS.term, "Keep the term under 500 characters."),
  meaning: z
    .string()
    .trim()
    .max(CARD_LIMITS.meaning, "Keep the meaning under 2000 characters.")
    .optional(),
  pronunciation: z.string().trim().max(CARD_LIMITS.pronunciation).optional(),
  example: z.string().trim().max(CARD_LIMITS.example).optional(),
  notes: z
    .string()
    .trim()
    .max(CARD_LIMITS.notes)
    .optional()
    .meta({ description: `${NOTES_FORMAT} The limit counts the Markdown source.` }),
  language: LanguageTag.nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  source: z.string().trim().max(CARD_LIMITS.source).optional(),
  directions: Directions.nullable()
    .optional()
    .meta({ description: "Legacy form of `reviewModes`. Null follows the deck." }),
  reviewModes: ReviewModes.nullable()
    .optional()
    .meta({ description: "Overrides the deck's review modes. Null follows the deck." }),
  meaningSource: FieldSource.optional(),
  exampleSource: FieldSource.optional(),
  pronunciationSource: FieldSource.optional(),
  sectionId: z.string().min(1).nullable().optional().meta({
    description:
      "An active section of the card's deck. Null or left out: no section. Moving a card to another deck clears it.",
  }),
});
export type CardInput = z.infer<typeof CardInput>;

/**
 * How long each of a card's text fields may be, read off `CardInput` itself. A form caps and counts
 * from here, so the limit a learner sees can never drift from the one the route refuses.
 */
export const cardLimits = {
  term: CardInput.shape.term.maxLength,
  meaning: CardInput.shape.meaning.unwrap().maxLength,
  pronunciation: CardInput.shape.pronunciation.unwrap().maxLength,
  example: CardInput.shape.example.unwrap().maxLength,
  notes: CardInput.shape.notes.unwrap().maxLength,
  source: CardInput.shape.source.unwrap().maxLength,
} satisfies Record<string, number | null>;

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

/** A page of Activity: where to carry on from, and how many audit rows to read. */
export const ActivityQuery = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type ActivityQuery = z.infer<typeof ActivityQuery>;

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
