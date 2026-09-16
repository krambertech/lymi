export type E2EAccount =
  | "deep-link"
  | "core-learning"
  | "deck-validation"
  | "card-selection"
  | "optional-meaning"
  | "more-fields"
  | "archived-deck"
  | "archived-page"
  | "responsive-creation"
  | "review-returns"
  | "review-queued"
  | "review-offline"
  | "review-round"
  | "review-scope"
  | "review-midnight"
  | "review-goal"
  | "review-goal-small"
  | "review-goal-midnight"
  | "review-round-below"
  | "review-round-crosses"
  | "review-deck-out"
  | "word-detail"
  | "language"
  | "join-owner"
  | "avatar"
  | "avatar-other"
  | "deck-page"
  | "long-cards"
  | "series"
  | "series-archive"
  | "series-drag"
  | "anki-import"
  | "sections"
  | "mochi-import"
  | "export"
  | "publisher"
  | "email-outbox"
  | "email-non-operator"
  | "password-account"
  | "password-reset";

export const e2eAccounts: readonly E2EAccount[];
export const e2eProjects: readonly string[];
export const e2eRetries: readonly number[];
export const e2eRepeats: readonly number[];
export function e2eEmail(
  account: E2EAccount,
  project: string,
  retry: number,
  repeat: number,
): string;
export function e2eInboxEmail(
  account: E2EAccount,
  project: string,
  retry: number,
  repeat: number,
): string;
export const e2eAllowedEmails: readonly string[];
export const e2eOperatorEmails: readonly string[];
export const e2ePublisherEmails: readonly string[];
