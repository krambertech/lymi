/**
 * The API's resources, in reading order. The server tags its OpenAPI operations with these
 * names and the public reference gives each one its own page, so a route tagged with a name
 * missing here fails the OpenAPI test instead of vanishing from the docs.
 */

export interface ApiResource {
  /** The OpenAPI tag. */
  name: string;
  /** The reference page: /docs/api/{slug}. */
  slug: string;
  group: ApiResourceGroup;
  description: string;
}

export const API_RESOURCE_GROUPS = [
  "Content",
  "Review",
  "Sharing and publishing",
  "Moving cards",
  "Account",
] as const;
export type ApiResourceGroup = (typeof API_RESOURCE_GROUPS)[number];

export const API_RESOURCES: ApiResource[] = [
  {
    name: "Decks",
    slug: "decks",
    group: "Content",
    description: "A deck holds cards and sets their defaults.",
  },
  {
    name: "Sections",
    slug: "sections",
    group: "Content",
    description:
      "Optional, ordered parts of one deck that every learner sees. Each learner opens them in order unless the owner turns that off.",
  },
  {
    name: "Series",
    slug: "series",
    group: "Content",
    description:
      "The owner's optional, ordered groups of their own decks, reviewed together. Members of a shared deck never see them.",
  },
  {
    name: "Cards",
    slug: "cards",
    group: "Content",
    description:
      "One term and what the learner knows about it. Adding a term that already exists is skipped, never rejected.",
  },
  {
    name: "Tags",
    slug: "tags",
    group: "Content",
    description:
      "Labels on cards that find and review them across decks. A card's tags are part of the card, and the same name is one tag in every deck you study.",
  },
  {
    name: "Pictures",
    slug: "pictures",
    group: "Content",
    description:
      "A card's one private picture: set from bytes or a public link, described, archived and restored.",
  },
  {
    name: "Languages",
    slug: "languages",
    group: "Content",
    description: "How cards in each language are written. Public and cacheable.",
  },
  {
    name: "Review",
    slug: "review",
    group: "Review",
    description: "What is due, and what it would be scheduled to. Grading is the learner's alone.",
  },
  {
    name: "Sharing",
    slug: "sharing",
    group: "Sharing and publishing",
    description:
      "Who else studies a deck: its members, invitations and join link. Every member keeps their own schedule.",
  },
  {
    name: "Publishing",
    slug: "publishing",
    group: "Sharing and publishing",
    description: "A deck's public page on Explore, and its editions in other meaning languages.",
  },
  {
    name: "Explore",
    slug: "explore",
    group: "Sharing and publishing",
    description:
      "Published decks as the learner browses them in the app, and adding one to Library.",
  },
  {
    name: "Reports",
    slug: "reports",
    group: "Sharing and publishing",
    description:
      "Aggregate results for a publisher's own published decks: adds, first reviews, returning learners and page views. Read-only.",
  },
  {
    name: "Imports",
    slug: "imports",
    group: "Moving cards",
    description:
      "Decks and history from another app's file, sent in parts, previewed, then confirmed.",
  },
  {
    name: "Exports",
    slug: "exports",
    group: "Moving cards",
    description: "A deck or the whole library as an Anki package or a Lymi file.",
  },
  {
    name: "Readwise",
    slug: "readwise",
    group: "Moving cards",
    description: "Highlights from Readwise, pulled into chosen decks every hour.",
  },
  {
    name: "Account",
    slug: "account",
    group: "Account",
    description: "Who the credential belongs to.",
  },
  {
    name: "Settings",
    slug: "settings",
    group: "Account",
    description: "The learner's own preferences.",
  },
  {
    name: "API keys",
    slug: "api-keys",
    group: "Account",
    description: "Session only: no key can list, mint or revoke another key.",
  },
  {
    name: "Connected apps",
    slug: "connected-apps",
    group: "Account",
    description: "Assistants and apps the learner granted access to over OAuth.",
  },
  {
    name: "Activity",
    slug: "activity",
    group: "Account",
    description:
      "Writes by connected apps, API keys and the AI, imports, and the people events of a shared deck, newest first.",
  },
  {
    name: "Reminders",
    slug: "reminders",
    group: "Account",
    description: "The daily review reminder, sent to a browser by Web Push.",
  },
];

export function apiResourceBySlug(slug: string): ApiResource | undefined {
  return API_RESOURCES.find((r) => r.slug === slug);
}
