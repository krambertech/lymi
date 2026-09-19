import { deckPath } from "./deck-page";
import { explorePath } from "./explore";
import {
  englishOnlyPaths,
  type Locale,
  type LocalizedPage,
  locales,
  localizedPages,
  localizedPath,
} from "./routes";

const SITE = "https://lymi.app";

interface SitemapUrl {
  path: string;
  lastmod?: Date | undefined;
  /** The same page in each locale; English doubles as x-default. */
  alternates?: Record<Locale, string> | undefined;
}

function url({ path, lastmod, alternates }: SitemapUrl): string {
  const lines = ["  <url>", `    <loc>${SITE}${path}</loc>`];
  if (lastmod) lines.push(`    <lastmod>${lastmod.toISOString()}</lastmod>`);
  if (alternates) {
    for (const locale of locales) {
      lines.push(
        `    <xhtml:link rel="alternate" hreflang="${locale}" href="${SITE}${alternates[locale]}"/>`,
      );
    }
    lines.push(
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${alternates.en}"/>`,
    );
  }
  lines.push("  </url>");
  return lines.join("\n");
}

function urlset(urls: readonly SitemapUrl[]): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls.map(url),
    "</urlset>",
    "",
  ].join("\n");
}

/** Every locale of one page, each pointing at the others. */
function localized(pathOf: (locale: Locale) => string, lastmod?: Date): SitemapUrl[] {
  const alternates = Object.fromEntries(
    locales.map((locale) => [locale, pathOf(locale)]),
  ) as Record<Locale, string>;
  return locales.map((locale) => ({ path: pathOf(locale), lastmod, alternates }));
}

/** The fixed pages from the build: the translated ones in every locale, then the English-only ones. */
export function pagesSitemap(): string {
  return urlset([
    ...(Object.keys(localizedPages) as LocalizedPage[]).flatMap((page) =>
      localized((locale) => localizedPath(page, locale)),
    ),
    ...englishOnlyPaths.map((path) => ({ path })),
  ]);
}

/**
 * The pages rendered per request: Explore, then every published deck, each in every locale.
 * Explore changed when its newest deck did.
 */
export function runtimeSitemap(decks: readonly { slug: string; updatedAt: Date }[]): string {
  const latest = decks.reduce<Date | undefined>(
    (max, deck) => (!max || deck.updatedAt > max ? deck.updatedAt : max),
    undefined,
  );
  return urlset([
    ...localized(explorePath, latest),
    ...decks.flatMap(({ slug, updatedAt }) =>
      localized((locale) => deckPath(slug, locale), updatedAt),
    ),
  ]);
}
