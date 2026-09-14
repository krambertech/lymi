/** Public pages every locale gets: English at the path, the others under their own prefix. */
export const localizedPages = {
  landing: "/",
  join: "/join",
  languages: "/languages",
  estonian: "/languages/estonian",
  assistants: "/ai-assistants",
  teachers: "/teachers",
} as const;
export type LocalizedPage = keyof typeof localizedPages;

export const locales = ["en", "uk", "ru"] as const;
export type Locale = (typeof locales)[number];

/** Legal text and developer documentation stay in English on purpose. */
export const englishOnlyPaths = [
  "/privacy",
  "/terms",
  "/support",
  "/docs",
  "/docs/quickstart",
  "/docs/cards",
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
