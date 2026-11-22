import { and, eq, inArray, type Table } from "@lymi/core/db";
import { type Db, schema } from "../db";
import type { Statement } from "./batch";

export type CronJob = "purge-card-audio" | "anki-connect-uploads" | "purge-expired-auth";

type TableName = {
  [K in keyof typeof schema]: (typeof schema)[K] extends Table ? K : never;
}[keyof typeof schema];

type ColumnOf<T extends TableName> = keyof (typeof schema)[T]["_"]["columns"];

type Leaving = { userId: string; email: string; now: Date };

type Eraser = (db: Db, leaving: Leaving) => Statement;

type Leaves<T extends TableName> = { columns: readonly ColumnOf<T>[]; because: string };

type Erasure<T extends TableName> =
  | { by: "account" }
  | { by: "cascade"; leaves?: Leaves<T> }
  | { by: "statement"; erase: Eraser }
  | { by: CronJob; erase?: Eraser }
  | { by: "single batch" }
  | { by: "nothing"; leaves: Leaves<T> }
  | { by: "no learner data" };

export const deletionCodeIdentifier = (userId: string) => `delete-account:${userId}`;

export const deletionCodeSends = (userId: string, day: Date) =>
  `delete-account-sends:${userId}:${day.toISOString().slice(0, 10)}`;

const dayBefore = (day: Date) => new Date(day.getTime() - 24 * 60 * 60 * 1000);

export const ERASURE = {
  user: { by: "account" },
  session: { by: "cascade" },
  account: { by: "cascade" },
  verification: {
    by: "purge-expired-auth",
    erase: (db, { userId, now }) =>
      db
        .delete(schema.verification)
        .where(
          inArray(schema.verification.identifier, [
            deletionCodeIdentifier(userId),
            deletionCodeSends(userId, now),
            deletionCodeSends(userId, dayBefore(now)),
          ]),
        ),
  },
  apikey: {
    by: "statement",
    erase: (db, { userId }) =>
      db.delete(schema.apikey).where(eq(schema.apikey.referenceId, userId)),
  },
  jwks: { by: "no learner data" },
  oauthClient: { by: "cascade" },
  oauthResource: { by: "no learner data" },
  oauthClientResource: { by: "cascade" },
  oauthRefreshToken: { by: "cascade" },
  oauthAccessToken: { by: "cascade" },
  oauthConsent: { by: "cascade" },
  oauthClientAssertion: { by: "no learner data" },
  series: { by: "cascade" },
  decks: { by: "cascade" },
  sections: { by: "cascade" },
  sectionStarts: { by: "cascade" },
  cards: { by: "cascade" },
  tags: { by: "cascade" },
  cardTags: { by: "cascade" },
  cardCorrections: {
    by: "statement",
    erase: (db, { userId }) =>
      db.delete(schema.cardCorrections).where(eq(schema.cardCorrections.userId, userId)),
  },
  userSettings: { by: "cascade" },
  learnerOpenings: { by: "cascade" },
  learningEmails: { by: "cascade" },
  analyticsReviewStarts: { by: "cascade" },
  userAvatars: { by: "cascade" },
  pushSubscriptions: { by: "cascade" },
  deckMembers: { by: "cascade" },
  deckInvitations: {
    by: "statement",
    erase: (db, { email }) =>
      db
        .delete(schema.deckInvitations)
        .where(
          and(
            eq(schema.deckInvitations.kind, "named"),
            eq(schema.deckInvitations.email, email.toLowerCase()),
          ),
        ),
  },
  deckPublications: { by: "cascade" },
  deckEditions: { by: "cascade" },
  deckPageViews: { by: "cascade" },
  seriesLocalizations: { by: "cascade" },
  deckLocalizations: { by: "cascade" },
  sectionLocalizations: { by: "cascade" },
  cardLocalizations: { by: "cascade" },
  cardStates: { by: "cascade" },
  importantCards: { by: "cascade" },
  deckPreferences: { by: "cascade" },
  reviews: { by: "cascade" },
  reviewDays: { by: "cascade" },
  reviewUndos: { by: "cascade" },
  cardImages: { by: "cascade" },
  imports: { by: "cascade" },
  exportFiles: { by: "cascade" },
  auditLog: {
    by: "cascade",
    leaves: {
      columns: ["payload"],
      because:
        "Another owner's Activity keeps who was invited to, joined and left their decks, as the privacy policy says",
    },
  },
  accountDeletions: {
    by: "nothing",
    leaves: {
      columns: ["id"],
      because: "The record that an account ended, with counts and nothing that names the person",
    },
  },
  formerDeckCopies: { by: "cascade" },
  deckCopyIds: { by: "single batch" },
  appleRevocations: {
    by: "nothing",
    leaves: {
      columns: ["id"],
      because: "Holds the Apple grant until Apple confirms it revoked, with no address or name",
    },
  },
  cardAudioPurges: { by: "purge-card-audio" },
  betaSignups: {
    by: "statement",
    erase: (db, { email }) =>
      db.delete(schema.betaSignups).where(eq(schema.betaSignups.email, email.toLowerCase())),
  },
  feedback: { by: "cascade" },
  lessonReads: { by: "cascade" },
  contentReports: {
    by: "nothing",
    leaves: {
      columns: ["id", "note", "snapshot", "localDate"],
      because: "A moderation record outlives the account and deck it is about, without their ids",
    },
  },
  sharingSuspensions: { by: "cascade" },
  readwiseConnections: { by: "cascade" },
  readwiseBooks: { by: "cascade" },
} satisfies { [T in TableName]: Erasure<T> };

export function erasureStatements(db: Db, leaving: Leaving): Statement[] {
  return Object.values(ERASURE).flatMap((table) =>
    "erase" in table ? [table.erase(db, leaving)] : [],
  );
}
