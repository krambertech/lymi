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
  "japanese-card",
  "pinyin",
  "filter-fields",
  "highlight-card",
  "cantonese-tamil",
  "example",
  "mac",
  "pitch-accent",
] as const;

/** Figures drawn at the tray's own 660 by 412 and running to its edges, rather than standing in it. */
export const CHANGELOG_SCENES: readonly string[] = ["mac"];

export type ChangelogFigureName = (typeof CHANGELOG_FIGURES)[number];
