import type { DAILY_GOAL_PRESETS, LearningKind } from "@lymi/core";
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

/** Minutes are a rough guide: about twenty seconds a review, rounded to a figure that reads as one. */
export const GOAL_MINUTES: Record<(typeof DAILY_GOAL_PRESETS)[number], number> = {
  10: 3,
  25: 8,
  50: 15,
  100: 30,
};

/** The steps a learner's own answers take them through: the language only after A language. */
export function welcomePath(kind: LearningKind | null): WelcomeStep[] {
  return kind === "language" ? ["kind", "language", "goal", "start"] : ["kind", "goal", "start"];
}

/** The decks that match the answers: the language's shelf, the test shelves, or the other subjects. */
export function decksFor(
  catalog: PublicDeckSummary[],
  kind: LearningKind | null,
  language: string | null,
) {
  if (kind === "language") return catalog.filter((d) => taughtLanguage(d) === language);
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
