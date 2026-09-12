export type E2EAccount =
  | "core-learning"
  | "deck-validation"
  | "card-selection"
  | "optional-meaning"
  | "archived-deck"
  | "responsive-creation"
  | "review-batching"
  | "word-detail";

export const e2eAccounts: readonly E2EAccount[];
export const e2eProjects: readonly string[];
export const e2eRetries: readonly number[];
export function e2eEmail(account: E2EAccount, project: string, retry: number): string;
export const e2eAllowedEmails: readonly string[];
