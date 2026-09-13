import { sql } from "drizzle-orm";
import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { user } from "./auth";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" })
    .notNull()
    .default(sql`(unixepoch() * 1000)`),
};

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
    position: integer("position").notNull().default(0),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [index("decks_user_idx").on(t.userId, t.archivedAt, t.position)],
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
    /** R2 key of generated pronunciation audio, if any. */
    audioKey: text("audio_key"),
    /** Who added the card. Activity filters on this without parsing the audit log. */
    createdBy: text("created_by", { enum: ["user", "api", "mcp", "ai", "system"] })
      .notNull()
      .default("user"),
    archivedAt: integer("archived_at", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [
    index("cards_deck_idx").on(t.deckId, t.archivedAt),
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
  },
  (t) => [
    uniqueIndex("deck_members_deck_user_idx").on(t.deckId, t.userId),
    index("deck_members_user_idx").on(t.userId, t.removedAt),
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
    direction: text("direction", { enum: ["recognition", "production"] }).notNull(),
    due: integer("due", { mode: "timestamp_ms" }).notNull(),
    /** 0 New, 1 Learning, 2 Review, 3 Relearning */
    state: integer("state").notNull().default(0),
    fsrs: text("fsrs").notNull(),
    lastReview: integer("last_review", { mode: "timestamp_ms" }),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("card_states_card_user_dir_idx").on(t.cardId, t.userId, t.direction),
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
    direction: text("direction", { enum: ["recognition", "production"] }).notNull(),
    rating: integer("rating").notNull(),
    /** FSRS state before this review. */
    state: integer("state").notNull(),
    elapsedDays: integer("elapsed_days").notNull(),
    scheduledDays: integer("scheduled_days").notNull(),
    /** FSRS memory model after this review, so stats never have to replay history. */
    stabilityAfter: real("stability_after").notNull(),
    difficultyAfter: real("difficulty_after").notNull(),
    reviewedAt: integer("reviewed_at", { mode: "timestamp_ms" }).notNull(),
    source: text("source", { enum: ["web", "api", "mcp"] })
      .notNull()
      .default("web"),
    /** The learner-local day this attempt counts toward, fixed when it lands. Null before goals. */
    reviewDayId: text("review_day_id").references(() => reviewDays.id, { onDelete: "cascade" }),
    /** The card state this grade replaced, as JSON, so Undo can put it back. Null before undo. */
    stateBefore: text("state_before"),
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

/** Every write, by whoever made it. This is what makes API and MCP changes visible in the product. */
export const auditLog = sqliteTable(
  "audit_log",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    actor: text("actor", { enum: ["user", "api", "mcp", "ai", "system"] }).notNull(),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    payload: text("payload", { mode: "json" }),
    createdAt: integer("created_at", { mode: "timestamp_ms" })
      .notNull()
      .default(sql`(unixepoch() * 1000)`),
  },
  (t) => [index("audit_user_idx").on(t.userId, t.createdAt)],
);

export type Deck = typeof decks.$inferSelect;
export type Card = typeof cards.$inferSelect;
export type DeckMember = typeof deckMembers.$inferSelect;
export type CardState = typeof cardStates.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type UserSettings = typeof userSettings.$inferSelect;
export type ReviewDay = typeof reviewDays.$inferSelect;
export type PushSubscription = typeof pushSubscriptions.$inferSelect;
export type AuditEntry = typeof auditLog.$inferSelect;

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
