import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import {
  EDITION_STATUSES,
  type EditionCardField,
  LOCALIZATION_PROVENANCES,
  LOCALIZATION_STATUSES,
  REVIEW_MODE_KEYS,
  type ReviewModeKey,
  SECTION_PROGRESSIONS,
} from "../types";
import { user } from "./auth";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
};

/**
 * The canonical revision a localization is based on. It goes up whenever a field an edition
 * translates changes, so a stale edition is found by comparison rather than by reading text.
 */
const revision = {
  revision: integer("revision").notNull().default(1),
};

/**
 * An owner's optional, ordered group of their own decks, reviewed together. Members of a shared
 * deck never see it. Archiving hides the grouping; decks archived with it share its `archived_at`.
 */
export const series = sqliteTable(
  "series",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    ...timestamps,
    ...revision,
  },
  (t) => [index("series_user_idx").on(t.userId, t.archivedAt, t.position)],
);

/** A deck groups cards. It may carry a default language, but language lives on the card. */
export const decks = sqliteTable(
  "decks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    defaultLanguage: text("default_language"),
    /** Which way cards in this deck are asked. A card can override with its own `directions`. */
    directions: text("directions", { enum: ["recognition", "production", "both"] })
      .notNull()
      .default("recognition"),
    /** Order within the deck's series, or within Library for a deck without one. */
    position: integer("position").notNull().default(0),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    ...timestamps,
    /** The owner's series. Kept while the series is archived, so Restore regroups the deck. */
    seriesId: text("series_id").references(() => series.id),
    /** The import that created the deck, if one did. */
    importId: text("import_id"),
    /** The source's own key for the deck, so a later import of the same file reuses it. */
    externalId: text("external_id"),
    /**
     * How each learner's sections open: automatically once the one before is known, when they
     * press Start, or all at once. Only a deck with sections reads it.
     */
    sectionProgression: text("section_progression", { enum: SECTION_PROGRESSIONS })
      .notNull()
      .default("automatic"),
    ...revision,
  },
  (t) => [
    index("decks_user_idx").on(t.userId, t.archivedAt, t.position),
    index("decks_series_idx").on(t.seriesId, t.position),
    index("decks_user_external_idx").on(t.userId, t.externalId),
  ],
);

/**
 * An optional, ordered part of one deck. Every learner of the deck sees it; only the owner
 * changes it. Cards archived with a section share its `archived_at`, so Restore finds them.
 */
export const sections = sqliteTable(
  "sections",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    position: integer("position").notNull().default(0),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    ...timestamps,
    ...revision,
  },
  (t) => [index("sections_deck_idx").on(t.deckId, t.archivedAt, t.position)],
);

/**
 * A learner opened a section: with Start once it was ready, early, or automatically. Rows are never removed, so a
 * section never locks again. Opening a later section writes a row for every section before it.
 */
export const sectionStarts = sqliteTable(
  "section_starts",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** ready: Start on a ready section. early: Start anyway. auto: the deck opened it. */
    how: text("how", { enum: ["ready", "early", "auto"] }).notNull(),
    startedAt: integer("started_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [
    uniqueIndex("section_starts_section_user_idx").on(t.sectionId, t.userId),
    index("section_starts_user_idx").on(t.userId),
  ],
);

/**
 * A card is any piece of content worth remembering. For vocabulary, `term` is the word
 * or phrase and `language` says what it is in. `language` is nullable on purpose:
 * cards without one get no audio and no language-specific AI, and everything else works.
 */
export const cards = sqliteTable(
  "cards",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    term: text("term").notNull(),
    /** `normaliseTerm(term)`. The duplicate rule compares this, per user and language. */
    normalizedTerm: text("normalized_term").notNull().default(""),
    meaning: text("meaning"),
    pronunciation: text("pronunciation"),
    example: text("example"),
    notes: text("notes"),
    language: text("language"),
    tags: text("tags", { mode: "json" }).$type<string[]>().notNull().default(sql`'[]'`),
    /** Where it came from, free text: "Lesson 14", "Il Gattopardo ch. 2", "chat with Marco". */
    source: text("source"),
    /** Overrides the deck's directions for this card. Null means follow the deck. */
    directions: text("directions", { enum: ["recognition", "production", "both"] }),
    meaningSource: text("meaning_source", { enum: ["lesson", "ai", "manual"] }),
    exampleSource: text("example_source", { enum: ["lesson", "ai", "manual"] }),
    pronunciationSource: text("pronunciation_source", { enum: ["lesson", "ai", "manual"] }),
    /** Set while an enrichment job is outstanding, and cleared once it settles. */
    enrichmentStatus: text("enrichment_status", { enum: ["working", "failed"] }),
    /** R2 key of generated pronunciation audio, if any. */
    audioKey: text("audio_key"),
    /** Who added the card. Activity filters on this without parsing the audit log. */
    createdBy: text("created_by", { enum: ["user", "api", "mcp", "ai", "system"] })
      .notNull()
      .default("user"),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    ...timestamps,
    /** The card's own mode list, read only while `directions` overrides the deck (ADR 0014). */
    reviewModeKeys: text("review_modes", { mode: "json" }).$type<ReviewModeKey[]>(),
    /** Opaque token of the last picture change, so a slow write cannot overwrite a newer one. */
    imageVersion: text("image_version"),
    /** The import that added the card. A later import that updates it leaves this alone. */
    importId: text("import_id"),
    /** The source's own id for the card, so importing the same file again updates it. */
    externalId: text("external_id"),
    /** A section of the card's own deck. Kept while the section is archived, so Restore regroups the card. */
    sectionId: text("section_id").references(() => sections.id),
    ...revision,
  },
  (t) => [
    index("cards_deck_idx").on(t.deckId, t.archivedAt),
    index("cards_user_external_idx").on(t.userId, t.externalId),
    index("cards_import_idx").on(t.importId, t.archivedAt),
    index("cards_section_idx").on(t.sectionId),
    index("cards_user_term_idx").on(t.userId, t.term),
    index("cards_user_lang_norm_idx").on(t.userId, t.language, t.normalizedTerm),
  ],
);

/** Per-learner settings. One row per user, created on first read. */
export const userSettings = sqliteTable("user_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  /** The language of the interface and reminders. Null until the learner has chosen. */
  appLanguage: text("app_language"),
  /** The language meanings are written in. Written from the app language, never on its own. */
  meaningLanguage: text("meaning_language").notNull().default("en"),
  /** Recall attempts that satisfy a learner-local day's streak goal. 50 is the suggestion. */
  dailyGoal: integer("daily_goal").notNull().default(50),
  /** When the learner chose the goal. Null until they do, so the first review can ask. */
  dailyGoalChosenAt: integer("daily_goal_chosen_at", { mode: "timestamp_ms" }),
  /** IANA zone that decides where a review day begins. Null until a visible page reports one. */
  reviewTimezone: text("review_timezone"),
  /** Automatic follows the foregrounded device; manual keeps the zone chosen in Settings. */
  reviewTimezoneMode: text("review_timezone_mode", { enum: ["automatic", "manual"] })
    .notNull()
    .default("automatic"),
  /** When a visible page last moved the automatic zone. */
  reviewTimezoneUpdatedAt: integer("review_timezone_updated_at", { mode: "timestamp_ms" }),
  ...timestamps,
});

/**
 * The learner's photo. The Google fallback and the learner's own upload live in separate
 * columns so neither can overwrite the other; the upload wins while it exists. Keys are
 * opaque R2 object names and versions are the opaque tokens delivery URLs carry.
 */
export const userAvatars = sqliteTable("user_avatars", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  customKey: text("custom_key"),
  customVersion: text("custom_version"),
  /** Bumped by every learner write, so a write started from an older state is refused. */
  customRevision: integer("custom_revision").notNull().default(0),
  googleKey: text("google_key"),
  googleVersion: text("google_version"),
  /** When the fetch behind `googleKey` began. An older fetch that finishes later is dropped. */
  googleFetchedAt: integer("google_fetched_at", { mode: "timestamp_ms" }),
  ...timestamps,
});

/** One row per browser installation that explicitly opted into a daily review reminder. */
export const pushSubscriptions = sqliteTable(
  "push_subscriptions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Capability URL supplied by the browser. Treat as a secret and never return it. */
    endpoint: text("endpoint").notNull(),
    p256dh: text("p256dh").notNull(),
    auth: text("auth").notNull(),
    expirationTime: integer("expiration_time", { mode: "timestamp_ms" }),
    reminderTime: text("reminder_time").notNull().default("19:00"),
    timezone: text("timezone").notNull(),
    /** Local YYYY-MM-DD in `timezone`; this is the cron idempotency claim. */
    lastSentLocalDate: text("last_sent_local_date"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("push_subscriptions_endpoint_idx").on(t.endpoint),
    index("push_subscriptions_user_idx").on(t.userId),
  ],
);

/**
 * Who may study a deck besides its owner, and what they may do in it. The owner is
 * `decks.user_id` and has no row here. Leaving or being removed keeps the row and sets
 * `removed_at`; `removed_by = 'owner'` blocks the join link until a named invitation.
 * Roles beyond `learner` are stored for later and not yet granted anywhere. ADR 0011.
 */
export const deckMembers = sqliteTable(
  "deck_members",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "editor", "contributor", "learner"] })
      .notNull()
      .default("learner"),
    /** The invitation that let them in, once invitations exist. */
    invitationId: text("invitation_id"),
    joinedAt: integer("joined_at", { mode: "timestamp_ms" }).notNull(),
    removedAt: integer("removed_at", { mode: "timestamp_ms" }),
    removedBy: text("removed_by", { enum: ["owner", "self"] }),
    ...timestamps,
    /**
     * The edition this learner added, fixed when they joined. Null on an ordinary shared deck and
     * on a published deck added in its original language. The app language never moves it. ADR 0015.
     */
    meaningLanguage: text("meaning_language"),
  },
  (t) => [
    uniqueIndex("deck_members_deck_user_idx").on(t.deckId, t.userId),
    index("deck_members_user_idx").on(t.userId, t.removedAt),
  ],
);

/**
 * How people reach a shared deck. V0 has only the join link: `token` is its unguessable URL
 * part, at most one per deck is unrevoked, and revocation is permanent, so turning the link
 * on again makes a new row and a new URL. Named Google-email invitations join later. ADR 0011.
 */
export const deckInvitations = sqliteTable(
  "deck_invitations",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["link"] })
      .notNull()
      .default("link"),
    /** A capability: never log it, audit it or put it in an error message. */
    token: text("token").notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("deck_invitations_token_idx").on(t.token),
    uniqueIndex("deck_invitations_active_link_idx")
      .on(t.deckId)
      .where(sql`kind = 'link' and revoked_at is null`),
  ],
);

/**
 * A deck anyone can add from its public page. The deck stays one live deck with many learners;
 * this row holds only what the public page may show. Withdrawing keeps members studying. ADR 0015.
 */
export const deckPublications = sqliteTable(
  "deck_publications",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    /** The public URL part: `lymi.app/decks/<slug>` and `my.lymi.app/add/<slug>`. */
    slug: text("slug").notNull(),
    status: text("status", { enum: ["published", "withdrawn"] }).notNull(),
    summary: text("summary").notNull(),
    /** A CEFR level such as A1, or null when the deck has none. */
    level: text("level"),
    /** The original edition: the language the deck's own fields are written in. */
    meaningLanguage: text("meaning_language").notNull(),
    /**
     * Card fields every edition must carry before it can be published. A language deck localizes
     * the meaning side only; a deck whose terms are not in a language being learned adds `term`.
     */
    editionFields: text("edition_fields", { mode: "json" })
      .$type<EditionCardField[]>()
      .notNull()
      .default(sql`'["meaning"]'`),
    publisher: text("publisher").notNull(),
    sources: text("sources", { mode: "json" })
      .$type<{ title: string; url?: string | undefined }[]>()
      .notNull(),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }),
    /** Goes up on every publish, so public caches key on it. */
    revision: integer("revision").notNull().default(1),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }).notNull(),
    withdrawnAt: integer("withdrawn_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("deck_publications_deck_idx").on(t.deckId),
    uniqueIndex("deck_publications_slug_idx").on(t.slug),
  ],
);

/**
 * One meaning-language edition of a published deck. The original edition has no row: it is the
 * deck's own fields. An edition is published only while every localization it needs is approved
 * and current, and withdrawing it leaves the learners who pinned it studying. ADR 0015.
 */
export const deckEditions = sqliteTable(
  "deck_editions",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    /** The meaning language this edition is written in, never the deck's original. */
    language: text("language").notNull(),
    status: text("status", { enum: EDITION_STATUSES }).notNull().default("draft"),
    /** Goes up on every publish and every withdrawal, so the owner can see it moved. */
    revision: integer("revision").notNull().default(0),
    publishedAt: integer("published_at", { mode: "timestamp_ms" }),
    withdrawnAt: integer("withdrawn_at", { mode: "timestamp_ms" }),
    /** The person who published it. Nothing publishes an edition on its own. */
    publishedBy: text("published_by").references(() => user.id),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("deck_editions_deck_language_idx").on(t.deckId, t.language),
    index("deck_editions_language_idx").on(t.language, t.status),
  ],
);

/**
 * What every localization row records besides its text: who wrote it, how far it has got, and
 * the canonical revision it was written from, which is what makes a stale edition findable.
 */
const localization = {
  language: text("language").notNull(),
  provenance: text("provenance", { enum: LOCALIZATION_PROVENANCES }).notNull(),
  status: text("status", { enum: LOCALIZATION_STATUSES }).notNull().default("draft"),
  /** The entity's `revision` when this text was written. Lower than the entity's now means stale. */
  sourceRevision: integer("source_revision").notNull(),
  /** The person who signed it off. Only a person does, whatever the provenance. */
  approvedBy: text("approved_by").references(() => user.id),
  approvedAt: integer("approved_at", { mode: "timestamp_ms" }),
  ...timestamps,
};

/** A series' name in one edition. Fields left null keep the canonical text. */
export const seriesLocalizations = sqliteTable(
  "series_localizations",
  {
    id: text("id").primaryKey(),
    seriesId: text("series_id")
      .notNull()
      .references(() => series.id, { onDelete: "cascade" }),
    name: text("name"),
    ...localization,
  },
  (t) => [uniqueIndex("series_localizations_idx").on(t.seriesId, t.language)],
);

/** A deck's name, description and public summary in one edition. */
export const deckLocalizations = sqliteTable(
  "deck_localizations",
  {
    id: text("id").primaryKey(),
    deckId: text("deck_id")
      .notNull()
      .references(() => decks.id, { onDelete: "cascade" }),
    name: text("name"),
    description: text("description"),
    /** The publication's summary in this language; the public page shows it. */
    summary: text("summary"),
    ...localization,
  },
  (t) => [uniqueIndex("deck_localizations_idx").on(t.deckId, t.language)],
);

/** A section's name in one edition. */
export const sectionLocalizations = sqliteTable(
  "section_localizations",
  {
    id: text("id").primaryKey(),
    sectionId: text("section_id")
      .notNull()
      .references(() => sections.id, { onDelete: "cascade" }),
    name: text("name"),
    ...localization,
  },
  (t) => [uniqueIndex("section_localizations_idx").on(t.sectionId, t.language)],
);

/**
 * A card's text in one edition. A localized `term` replaces what the card asks, so `importEdition`
 * takes one only from a publication whose `edition_fields` names `term`; the card's language, tags,
 * picture, audio and modes are never localized.
 */
export const cardLocalizations = sqliteTable(
  "card_localizations",
  {
    id: text("id").primaryKey(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    term: text("term"),
    meaning: text("meaning"),
    pronunciation: text("pronunciation"),
    example: text("example"),
    notes: text("notes"),
    ...localization,
  },
  (t) => [
    uniqueIndex("card_localizations_idx").on(t.cardId, t.language),
    index("card_localizations_language_idx").on(t.language, t.status),
  ],
);

/**
 * FSRS state per learner per card per direction. The full ts-fsrs Card lives in `fsrs` as
 * JSON so the library can evolve without a migration; `due` and `state` are copied out for
 * queries. A shared deck's card has one row per member, so progress is never shared.
 */
export const cardStates = sqliteTable(
  "card_states",
  {
    id: text("id").primaryKey(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Legacy identity: recognition or production for text modes, the mode key for picture modes. */
    direction: text("direction").notNull(),
    due: integer("due", { mode: "timestamp_ms" }).notNull(),
    /** 0 New, 1 Learning, 2 Review, 3 Relearning */
    state: integer("state").notNull().default(0),
    fsrs: text("fsrs").notNull(),
    lastReview: integer("last_review", { mode: "timestamp_ms" }),
    ...timestamps,
    /** Canonical review mode. Null only on rows an older Worker wrote; read through `stateMode`. ADR 0014. */
    mode: text("mode", { enum: REVIEW_MODE_KEYS }),
  },
  (t) => [
    uniqueIndex("card_states_card_user_dir_idx").on(t.cardId, t.userId, t.direction),
    uniqueIndex("card_states_card_user_mode_idx").on(t.cardId, t.userId, t.mode),
    index("card_states_due_idx").on(t.userId, t.due),
  ],
);

/** Append-only review history. Never updated, never deleted. */
export const reviews = sqliteTable(
  "reviews",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    cardStateId: text("card_state_id")
      .notNull()
      .references(() => cardStates.id, { onDelete: "cascade" }),
    /** Legacy identity, as on `card_states.direction`. */
    direction: text("direction").notNull(),
    rating: integer("rating").notNull(),
    /** FSRS state before this review. */
    state: integer("state").notNull(),
    elapsedDays: integer("elapsed_days").notNull(),
    scheduledDays: integer("scheduled_days").notNull(),
    /** FSRS memory model after this review, so stats never have to replay history. */
    stabilityAfter: real("stability_after").notNull(),
    difficultyAfter: real("difficulty_after").notNull(),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }).notNull(),
    /** `import` is a recall from another app's log: it has no review day and never counts toward a goal. */
    source: text("source", { enum: ["web", "api", "mcp", "import"] })
      .notNull()
      .default("web"),
    /** The learner-local day this attempt counts toward, fixed when it lands. Null before goals. */
    reviewDayId: text("review_day_id").references(() => reviewDays.id, { onDelete: "cascade" }),
    /** The card state this grade replaced, as JSON, so Undo can put it back. Null before undo. */
    stateBefore: text("state_before"),
    /** Canonical review mode. Null only on rows an older Worker wrote. ADR 0014. */
    mode: text("mode", { enum: REVIEW_MODE_KEYS }),
  },
  (t) => [
    index("reviews_card_idx").on(t.cardId, t.reviewedAt),
    index("reviews_day_idx").on(t.reviewDayId),
  ],
);

/**
 * One learner-local date's streak goal. Attempts are counted from `reviews` less
 * `review_undos`, never stored here; this row keeps what the day was measured against and
 * what it came to. Pre-goal history has no row and keeps its old meaning: a reviewed day.
 */
export const reviewDays = sqliteTable(
  "review_days",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** Local YYYY-MM-DD in `timezone`. */
    date: text("date").notNull(),
    /** The goal when the day opened; it follows goal changes only while the day is open. */
    goal: integer("goal").notNull(),
    timezone: text("timezone").notNull(),
    /** The server found nothing eligible before any attempt, which protects the streak. */
    zeroDueConfirmedAt: integer("zero_due_confirmed_at", { mode: "timestamp_ms" }),
    outcome: text("outcome", { enum: ["open", "goal_met", "exhausted", "nothing_due"] })
      .notNull()
      .default("open"),
    ...timestamps,
  },
  (t) => [uniqueIndex("review_days_user_date_idx").on(t.userId, t.date)],
);

/** An attempt taken back with Undo. The review row stays; this removes it from every count. */
export const reviewUndos = sqliteTable("review_undos", {
  reviewId: text("review_id")
    .primaryKey()
    .references(() => reviews.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  undoneAt: integer("undone_at", { mode: "timestamp_ms" }).notNull(),
});

/** A card's picture, at most one active per card; the storage rules are in docs/data-model.md. */
export const cardImages = sqliteTable(
  "card_images",
  {
    id: text("id").primaryKey(),
    cardId: text("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    /** The card's owner, whoever made the change. */
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),
    contentType: text("content_type").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    byteSize: integer("byte_size").notNull(),
    /** What the picture shows without naming the answer; picture modes wait for one. */
    description: text("description"),
    sourceKind: text("source_kind", { enum: ["upload", "url"] }).notNull(),
    /** Host of an imported link, never the full URL, which may carry credentials. */
    sourceHost: text("source_host"),
    status: text("status", { enum: ["active", "archived", "replaced"] })
      .notNull()
      .default("active"),
    createdBy: text("created_by", { enum: ["user", "api", "mcp", "ai", "system"] }).notNull(),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("card_images_active_idx").on(t.cardId).where(sql`status = 'active'`),
    index("card_images_card_idx").on(t.cardId, t.createdAt),
  ],
);

/**
 * One file brought in from another app. The row carries the preview and the result; the
 * file itself lives in R2 only until the import finishes or fails. Archiving the import
 * archives every card it added, stamped with the import's own `archived_at` so restore
 * brings back exactly those.
 */
export const imports = sqliteTable(
  "imports",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    source: text("source", { enum: ["anki", "mochi", "lymi"] }).notNull(),
    /** The learner's file name. Private: never logged, audited or put in an error. */
    fileName: text("file_name").notNull(),
    byteSize: integer("byte_size").notNull(),
    status: text("status", {
      enum: ["uploading", "inspecting", "ready", "importing", "done", "failed", "cancelled"],
    })
      .notNull()
      .default("uploading"),
    failure: text("failure", {
      enum: [
        "unrecognized",
        "damaged",
        "too_large",
        "empty",
        "upload_incomplete",
        "expired",
        "internal",
      ],
    }),
    /** R2 key of the upload; null once the object is deleted. */
    objectKey: text("object_key"),
    /** R2 multipart upload id while parts are arriving. */
    uploadId: text("upload_id"),
    /** Parts that have landed, as `{ partNumber, etag }` JSON. */
    parts: text("parts", { mode: "json" }).$type<{ partNumber: number; etag: string }[]>(),
    /** What the file holds, from the adapter. */
    summary: text("summary", { mode: "json" }).$type<unknown>(),
    /** How many stored note chunks the inspection wrote to R2. */
    chunks: integer("chunks").notNull().default(0),
    /** The learner's language and field choices. */
    choices: text("choices", { mode: "json" }).$type<unknown>(),
    /** Counts of what was written, shown in Activity. */
    counts: text("counts", { mode: "json" }).$type<unknown>(),
    /** Chunks written so far, for progress. */
    written: integer("written").notNull().default(0),
    createdBy: text("created_by", { enum: ["user", "api", "mcp", "ai", "system"] }).notNull(),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [index("imports_user_idx").on(t.userId, t.createdAt)],
);

/**
 * One file written for the learner to take out: a deck or the whole library. The file lives in
 * R2 as numbered segments that the download route joins, and is deleted when its window ends.
 */
export const exportFiles = sqliteTable(
  "exports",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    format: text("format", { enum: ["lymi", "anki"] }).notNull(),
    /** The deck exported, or null for the library. Not a foreign key, so the row outlives the deck. */
    deckId: text("deck_id"),
    /** The name the file downloads as, from the deck's name. Never logged. */
    fileName: text("file_name").notNull(),
    status: text("status", { enum: ["exporting", "done", "failed", "expired"] })
      .notNull()
      .default("exporting"),
    failure: text("failure", { enum: ["too_large", "internal"] }),
    /** R2 key prefix of the file's segments; null once they are deleted. */
    objectKey: text("object_key"),
    /** How many segments make up the file, in order. */
    segments: integer("segments").notNull().default(0),
    byteSize: integer("byte_size"),
    counts: text("counts", { mode: "json" }).$type<unknown>(),
    createdBy: text("created_by", { enum: ["user", "api", "mcp", "ai", "system"] }).notNull(),
    finishedAt: integer("finished_at", { mode: "timestamp_ms" }),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [
    index("exports_user_idx").on(t.userId, t.createdAt),
    index("exports_status_idx").on(t.status, t.updatedAt),
  ],
);

/** Every write, by whoever made it. This is what makes API and MCP changes visible in the product. */
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actor: text("actor", { enum: ["user", "api", "mcp", "ai", "system"] }).notNull(),
    /** The OAuth client or API key behind an `api` or `mcp` write, so Activity can name it. */
    actorClient: text("actor_client"),
    /** Its name as it stood at the write, so revoking a key does not erase it from the log. */
    actorClientName: text("actor_client_name"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    payload: text("payload", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [
    index("audit_user_idx").on(t.userId, t.createdAt),
    // Activity reads everything but the grades, which outnumber the rest many times over.
    index("audit_activity_idx").on(t.userId, t.createdAt).where(sql`entity <> 'review'`),
  ],
);

export type Series = typeof series.$inferSelect;
export type Deck = typeof decks.$inferSelect;
export type Section = typeof sections.$inferSelect;
export type SectionStart = typeof sectionStarts.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type DeckMember = typeof deckMembers.$inferSelect;
export type DeckInvitation = typeof deckInvitations.$inferSelect;
export type DeckPublication = typeof deckPublications.$inferSelect;
export type DeckEdition = typeof deckEditions.$inferSelect;
export type SeriesLocalization = typeof seriesLocalizations.$inferSelect;
export type DeckLocalization = typeof deckLocalizations.$inferSelect;
export type SectionLocalization = typeof sectionLocalizations.$inferSelect;
export type CardLocalization = typeof cardLocalizations.$inferSelect;
export type CardState = typeof cardStates.$inferSelect;
export type CardImage = typeof cardImages.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type UserAvatar = typeof userAvatars.$inferSelect;
export type ReviewDay = typeof reviewDays.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;
export type Import = typeof imports.$inferSelect;
export type Export = typeof exportFiles.$inferSelect;

/**
 * Someone who asked to be told when Lymi opens up. Deliberately unconnected to `user`:
 * joining the list is an expression of interest, not an account, and it grants no access.
 * Nothing here is a learner's data, so these writes are not in the audit log.
 */
export const betaSignups = sqliteTable(
  "beta_signups",
  {
    id: text("id").primaryKey(),
    /** Lower-cased and trimmed, so one person cannot fill the list by varying the case. */
    email: text("email").notNull(),
    /** Which part of the site the address came from, for reading the list later. */
    source: text("source").notNull().default("landing"),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [uniqueIndex("beta_signups_email_idx").on(t.email)],
);

export type BetaSignup = typeof betaSignups.$inferSelect;

/**
 * A note a learner sent from the learner menu. The row is written before the message is sent, so
 * what they typed survives a failed send, and its local date carries the per-day cap.
 */
export const feedback = sqliteTable(
  "feedback",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ["bug", "idea", "other"] }).notNull(),
    /** What the learner typed, as typed. Private: never logged or audited. */
    message: text("message").notNull(),
    /** The path they were on, the build they were running, and the browser they wrote from. */
    screen: text("screen").notNull(),
    appVersion: text("app_version").notNull(),
    browser: text("browser").notNull(),
    /** Their app language, so a reply can be written in it. */
    language: text("language").notNull(),
    /** The learner-local date the note was written, which the daily cap counts. */
    localDate: text("local_date").notNull(),
    delivery: text("delivery", { enum: ["provider", "outbox", "failed"] }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("feedback_user_day_idx").on(t.userId, t.localDate)],
);

export type Feedback = typeof feedback.$inferSelect;
