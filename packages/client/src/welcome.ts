import type { ConfiguredTag, DAILY_GOAL_PRESETS, LearningKind, SupportedTag } from "@lymi/core";
import { type PublicDeckSummary, shelvesOf, subjectOf, taughtLanguage } from "@lymi/core/catalog";

export type WelcomeStep = "hello" | "kind" | "language" | "goal" | "start";

export type Own = "lesson" | "import" | "assistant" | "type";

export const LANGUAGE_PILLS = 12;
export const START_DECKS = 4;
const TEST_CATEGORIES = ["citizenship", "driving"];
export type BeginnerLanguage = SupportedTag | ConfiguredTag;

export const BEGINNER_DECKS: Readonly<
  Record<SupportedTag, readonly string[]> & Partial<Record<ConfiguredTag, readonly string[]>>
> = {
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
  pl: ["polish-a1-vocabulary", "polish-a2-vocabulary", "core-polish-words"],
};

export const GOAL_MINUTES: Record<(typeof DAILY_GOAL_PRESETS)[number], number> = {
  10: 3,
  25: 8,
  50: 15,
  100: 30,
};

export function languageDecks(catalog: PublicDeckSummary[], language: string | null) {
  const decks = catalog.filter((d) => taughtLanguage(d) === language);
  const first =
    (language && Object.hasOwn(BEGINNER_DECKS, language)
      ? BEGINNER_DECKS[language as BeginnerLanguage]
      : undefined) ?? [];
  const rank = (slug: string) => {
    const at = first.indexOf(slug);
    return at === -1 ? first.length : at;
  };
  return [...decks].sort((a, b) => rank(a.slug) - rank(b.slug));
}

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

export function sampler(catalog: PublicDeckSummary[]) {
  return shelvesOf(catalog)
    .flatMap((shelf) => shelf.decks.slice(0, 1))
    .slice(0, START_DECKS);
}

export function startDecks(
  catalog: PublicDeckSummary[],
  kind: LearningKind | null,
  language: string | null,
) {
  const matched = decksFor(catalog, kind, language).slice(0, START_DECKS);
  const ownFirst = matched.length === 0;
  return { decks: ownFirst ? sampler(catalog) : matched, ownFirst };
}

export function catalogLanguages(catalog: PublicDeckSummary[], meaningLanguage: string) {
  return shelvesOf(catalog).flatMap((shelf) =>
    shelf.language && shelf.language !== meaningLanguage ? [shelf.language] : [],
  );
}
