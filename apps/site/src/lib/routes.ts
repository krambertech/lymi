/** Public pages every locale gets: English at the path, the others under their own prefix. */
export const localizedPages = {
  landing: "/",
  languages: "/languages",
  estonian: "/languages/estonian",
  assistants: "/ai-assistants",
  teachers: "/teachers",
  privacy: "/privacy",
} as const;
export type LocalizedPage = keyof typeof localizedPages;

/** Pages rendered per request from the database, in every locale; the runtime sitemap lists them. */
export const localizedRuntimePages = ["/explore", "/explore/[slug]"] as const;

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
  "/docs/import-from-anki",
  "/docs/import-from-mochi",
  "/docs/export",
  "/docs/scheduling",
  "/docs/mcp",
  "/docs/mcp/claude",
  "/docs/mcp/chatgpt",
  "/docs/mcp/gemini",
  "/docs/authentication",
  "/docs/api",
  "/docs/recipes",
] as const;

export function localizedPath(page: LocalizedPage, locale: string): string {
  const path = localizedPages[page];
  if (locale === "en" || !(locales as readonly string[]).includes(locale)) return path;
  return path === "/" ? `/${locale}/` : `/${locale}${path}`;
}

export const sitemapPaths = [
  ...locales.flatMap((locale) =>
    (Object.keys(localizedPages) as LocalizedPage[]).map((page) => localizedPath(page, locale)),
  ),
  ...englishOnlyPaths,
];
