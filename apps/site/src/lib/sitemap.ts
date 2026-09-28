import { readableIn } from "@lymi/core/catalog";
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
  /** The same page in each locale listed; English doubles as x-default where it is one. */
  alternates?: Partial<Record<Locale, string>> | undefined;
}

function url({ path, lastmod, alternates }: SitemapUrl): string {
  const lines = ["  <url>", `    <loc>${SITE}${path}</loc>`];
  if (lastmod) lines.push(`    <lastmod>${lastmod.toISOString()}</lastmod>`);
  if (alternates) {
    for (const locale of locales) {
      const href = alternates[locale];
      if (href)
        lines.push(`    <xhtml:link rel="alternate" hreflang="${locale}" href="${SITE}${href}"/>`);
    }
    if (alternates.en) {
      lines.push(
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${alternates.en}"/>`,
      );
    }
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

/** Each of these locales of one page, each pointing at the others. */
function localized(
  pathOf: (locale: Locale) => string,
  lastmod?: Date,
  listed: readonly Locale[] = locales,
): SitemapUrl[] {
  const alternates = Object.fromEntries(listed.map((locale) => [locale, pathOf(locale)]));
  return listed.map((locale) => ({ path: pathOf(locale), lastmod, alternates }));
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

interface SitemapDeck {
  slug: string;
  updatedAt: Date;
  meaningLanguage: string;
  editions: readonly string[];
}

/**
 * The pages rendered per request: Explore in every locale, then every published deck in the
 * locales whose Explore lists it. Explore changed when its newest deck did.
 */
export function runtimeSitemap(decks: readonly SitemapDeck[]): string {
  const latest = decks.reduce<Date | undefined>(
    (max, deck) => (!max || deck.updatedAt > max ? deck.updatedAt : max),
    undefined,
  );
  return urlset([
    ...localized(explorePath, latest),
    ...decks.flatMap((deck) =>
      localized(
        (locale) => deckPath(deck.slug, locale),
        deck.updatedAt,
        locales.filter((locale) => readableIn(deck, locale)),
      ),
    ),
  ]);
}
