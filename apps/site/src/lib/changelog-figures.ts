/** The drawings an update can show in place of a screenshot; `ChangelogFigure` draws each. */
export const CHANGELOG_FIGURES = [
  "review",
  "enrich",
  "import",
  "library",
  "series",
  "join-link",
  "assistant",
  "welcome",
  "voices",
  "activity",
  "hook-peek",
  "hook-write",
  "rest-days",
  "deck-ai",
  "important",
  "tags",
  "import-sources",
  "delete-account",
  "smart-add",
  "review-chosen",
  "furigana",
  "sign-in-apple",
  "command-menu",
] as const;

export type ChangelogFigureName = (typeof CHANGELOG_FIGURES)[number];
