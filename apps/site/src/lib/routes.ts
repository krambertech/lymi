import { LANGUAGE_PAGES, type LanguagePageName } from "./language-pages";

/** Each supported language's page, which `/languages/[language]` renders. */
const languagePages = Object.fromEntries(
  Object.values(LANGUAGE_PAGES).map(({ page }) => [page, `/languages/${page}`]),
) as { [Page in LanguagePageName]: `/languages/${Page}` };

/** Public pages every locale gets: English at the path, the others under their own prefix. */
export const localizedPages = {
  landing: "/",
  languages: "/languages",
  estonian: "/languages/estonian",
  chinese: "/languages/chinese",
  ...languagePages,
  assistants: "/ai-assistants",
  teachers: "/teachers",
  medicine: "/medicine",
  certifications: "/certifications",
  tutorLessons: "/tutor-lessons",
  notesToFlashcards: "/notes-to-flashcards",
  exams: "/exams",
  einbuergerungstest: "/exams/einbuergerungstest",
  privacy: "/privacy",
  changelog: "/changelog",
} as const;
export type LocalizedPage = keyof typeof localizedPages;

/** Pages rendered per request from the database, in every locale; `sitemap-decks.xml` lists them. */
export const localizedRuntimePages = [
  "/languages/estonian",
  "/languages/chinese",
  "/languages/[language]",
  "/explore",
  "/explore/[slug]",
  "/explore/[kind]/[name]",
  "/exams",
  "/exams/einbuergerungstest",
  "/exams/[exam]",
] as const;

/** A translated page rendered per request, which the deck sitemap lists rather than the build's. */
export function isRuntimePage(page: LocalizedPage): boolean {
  const path: string = localizedPages[page];
  return (
    Object.hasOwn(languagePages, page) ||
    (localizedRuntimePages as readonly string[]).includes(path)
  );
}

/** Pages built from content, one per item in every locale; `sitemap-pages.xml` lists each. */
export const localizedContentPages = ["/changelog/[slug]"] as const;

export const locales = ["en", "uk", "ru"] as const;
export type Locale = (typeof locales)[number];

/** Terms, support and developer documentation stay in English on purpose. */
export const englishOnlyPaths = [
  "/terms",
  "/support",
  "/docs",
  "/docs/quickstart",
  "/docs/mobile",
  "/docs/cards",
  "/docs/languages",
  "/docs/import-from-anki",
  "/docs/import-from-mochi",
  "/docs/import-from-noji",
  "/docs/import-from-pleco",
  "/docs/export",
  "/docs/scheduling",
  "/docs/mcp",
  "/docs/mcp/claude",
  "/docs/mcp/chatgpt",
  "/docs/mcp/gemini",
  "/docs/mcp/cursor",
  "/docs/mcp/grok",
  "/docs/authentication",
  "/docs/api",
  "/docs/recipes",
] as const;

export function localizedPath(page: LocalizedPage, locale: string): string {
  const path = localizedPages[page];
  if (locale === "en" || !(locales as readonly string[]).includes(locale)) return path;
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
