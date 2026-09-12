export const e2eAccounts = [
  "deep-link",
  "core-learning",
  "deck-validation",
  "card-selection",
  "optional-meaning",
  "archived-deck",
  "responsive-creation",
  "review-batching",
];

export const e2eProjects = ["chromium", "webkit"];
export const e2eRetries = [0, 1];

export function e2eEmail(account, project, retry) {
  if (!e2eAccounts.includes(account)) throw new Error(`Unknown E2E account: ${account}`);
  if (!e2eProjects.includes(project)) throw new Error(`Unknown E2E project: ${project}`);
  if (!e2eRetries.includes(retry)) throw new Error(`Unsupported E2E retry: ${retry}`);
  return `e2e-${account}-${project}-r${retry}@lymi.local`;
}

export const e2eAllowedEmails = e2eAccounts.flatMap((account) =>
  e2eProjects.flatMap((project) => e2eRetries.map((retry) => e2eEmail(account, project, retry))),
);
