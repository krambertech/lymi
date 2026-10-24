import type { DAILY_GOAL_PRESETS, LearningKind, SupportedTag } from "@lymi/core";
import { type PublicDeckSummary, shelvesOf, subjectOf, taughtLanguage } from "@lymi/core/catalog";

// Welcome's choices, shared by the web and the phone so both ask the same questions with the same
// decks. docs/design/onboarding.md.

export type WelcomeStep = "hello" | "kind" | "language" | "goal" | "start";

/** How a learner without decks gets started when they bring their own. */
export type Own = "lesson" | "import" | "assistant" | "type";

/** Twelve languages as pills; the rest of the catalogue's languages sit behind Another language. */
export const LANGUAGE_PILLS = 12;
/** A start step shows at most four decks: two rows of two. */
export const START_DECKS = 4;
/** Shelves a test deck sits on; every other subject is a subject. */
const TEST_CATEGORIES = ["citizenship", "driving"];
/**
 * Published decks a beginner in a supported language should start with, in the order to take them;
 * the rest of the language's decks follow in Explore's order. docs/proposals/supported-languages.md.
 */
export const BEGINNER_DECKS: Readonly<Record<SupportedTag, readonly string[]>> = {
  ja: [
    "read-japanese-kana",
    "japanese-n5-vocabulary-practice",
    "japanese-n4-vocabulary",
    "travel-japanese",
  ],
  zh: ["chinese-hsk-1-vocabulary", "chinese-hsk-2-vocabulary"],
  uk: [
    "ukrainian-alphabet",
    "ukrainian-a1-vocabulary",
    "ukrainian-a2-vocabulary",
    "core-ukrainian-words",
  ],
  ru: ["russian-alphabet", "russian-a1-vocabulary", "core-russian-words"],
};

/** Minutes are a rough guide: about twenty seconds a review, rounded to a figure that reads as one. */
export const GOAL_MINUTES: Record<(typeof DAILY_GOAL_PRESETS)[number], number> = {
  10: 3,
  25: 8,
  50: 15,
  100: 30,
};

/** A language's decks, those a beginner starts from first and the rest in Explore's order. */
export function languageDecks(catalog: PublicDeckSummary[], language: string | null) {
  const decks = catalog.filter((d) => taughtLanguage(d) === language);
  const first =
    language && Object.hasOwn(BEGINNER_DECKS, language)
      ? BEGINNER_DECKS[language as SupportedTag]
      : [];
  const rank = (slug: string) => {
    const at = first.indexOf(slug);
    return at === -1 ? first.length : at;
  };
  return [...decks].sort((a, b) => rank(a.slug) - rank(b.slug));
}

/** The decks that match the answers: the language's shelf, the test shelves, or the other subjects. */
export function decksFor(
  catalog: PublicDeckSummary[],
  kind: LearningKind | null,
  language: string | null,
) {
  if (kind === "language") return languageDecks(catalog, language);
  if (kind === "test") return catalog.filter((d) => TEST_CATEGORIES.includes(d.category ?? ""));
  if (kind === "subject") {
    return catalog.filter((d) => subjectOf(d) && !TEST_CATEGORIES.includes(d.category ?? ""));
  }
  return [];
}

/** One deck from each of the first shelves, so a learner with nothing matched sees the range. */
export function sampler(catalog: PublicDeckSummary[]) {
  return shelvesOf(catalog)
    .flatMap((shelf) => shelf.decks.slice(0, 1))
    .slice(0, START_DECKS);
}

/** Up to four decks for the start step, and whether bringing one's own comes first. */
export function startDecks(
  catalog: PublicDeckSummary[],
  kind: LearningKind | null,
  language: string | null,
) {
  const matched = decksFor(catalog, kind, language).slice(0, START_DECKS);
  const ownFirst = matched.length === 0;
  return { decks: ownFirst ? sampler(catalog) : matched, ownFirst };
}

/** Languages with decks, most decks first, leaving out the language meanings are written in. */
export function catalogLanguages(catalog: PublicDeckSummary[], meaningLanguage: string) {
  return shelvesOf(catalog).flatMap((shelf) =>
    shelf.language && shelf.language !== meaningLanguage ? [shelf.language] : [],
  );
}
