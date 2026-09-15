export type E2EAccount =
  | "deep-link"
  | "core-learning"
  | "deck-validation"
  | "card-selection"
  | "optional-meaning"
  | "more-fields"
  | "archived-deck"
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
  | "deck-page";

export const e2eAccounts: readonly E2EAccount[];
export const e2eProjects: readonly string[];
export const e2eRetries: readonly number[];
export function e2eEmail(account: E2EAccount, project: string, retry: number): string;
export const e2eAllowedEmails: readonly string[];
