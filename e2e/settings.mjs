export const e2eAccounts = [
  "deep-link",
  "core-learning",
  "deck-validation",
  "card-selection",
  "optional-meaning",
  "more-fields",
  "archived-deck",
  "responsive-creation",
  "long-cards",
  "review-returns",
  "review-queued",
  "review-offline",
  "review-round",
  "review-scope",
  "review-midnight",
  "review-goal",
  "review-goal-small",
  "review-goal-midnight",
  "review-round-below",
  "review-round-crosses",
  "review-deck-out",
  "word-detail",
  "deck-page",
  "language",
  "join-owner",
  "avatar",
  "avatar-other",
  "series",
  "series-archive",
  "series-drag",
  "anki-import",
  "sections",
  "mochi-import",
  "publisher",
  "email-outbox",
  "email-non-operator",
];

export const e2eProjects = ["chromium", "webkit"];
export const e2eRetries = [0, 1];
// Up to `--repeat-each=10`, so a repeat starts from an empty account like a retry does.
export const e2eRepeats = Array.from({ length: 10 }, (_, i) => i);

export function e2eEmail(account, project, retry, repeat) {
  if (!e2eAccounts.includes(account)) throw new Error(`Unknown E2E account: ${account}`);
  if (!e2eProjects.includes(project)) throw new Error(`Unknown E2E project: ${project}`);
  if (!e2eRetries.includes(retry)) throw new Error(`Unsupported E2E retry: ${retry}`);
  if (!e2eRepeats.includes(repeat)) throw new Error(`Unsupported E2E repeat: ${repeat}`);
  return `e2e-${account}-${project}-r${retry}-p${repeat}@lymi.local`;
}

/** Accounts that may publish, so the published-deck journey can publish its own deck. */
export const e2ePublisherEmails = e2eProjects.flatMap((project) =>
  e2eRetries.flatMap((retry) =>
    e2eRepeats.map((repeat) => e2eEmail("publisher", project, retry, repeat)),
  ),
);

/** Accounts that may exercise operator-only routes in browser tests. */
export const e2eOperatorEmails = e2eProjects.flatMap((project) =>
  e2eRetries.flatMap((retry) =>
    e2eRepeats.map((repeat) => e2eEmail("email-outbox", project, retry, repeat)),
  ),
);

export const e2eAllowedEmails = e2eAccounts.flatMap((account) =>
  e2eProjects.flatMap((project) =>
    e2eRetries.flatMap((retry) =>
      e2eRepeats.map((repeat) => e2eEmail(account, project, retry, repeat)),
    ),
  ),
);
