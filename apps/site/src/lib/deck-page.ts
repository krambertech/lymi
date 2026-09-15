import type { PublicDeckOut } from "@lymi/core/catalog";
import { type Locale, locales } from "./routes";

const SITE = "https://lymi.app";

/** The cards a visitor can try on the page: the first section's, up to ten, each with a meaning. */
export const TRY_LIMIT = 10;

export type TryCard = { term: string; meaning: string };

export function deckPath(slug: string, locale: Locale): string {
  return locale === "en" ? `/decks/${slug}` : `/${locale}/decks/${slug}`;
}

export function deckPaths(slug: string): Record<Locale, string> {
  return Object.fromEntries(locales.map((locale) => [locale, deckPath(slug, locale)])) as Record<
    Locale,
    string
  >;
}

export function tryCards(deck: PublicDeckOut): { section: string | null; cards: TryCard[] } {
  const first = deck.sections[0];
  const cards = (first?.cards ?? [])
    .filter((card): card is TryCard => Boolean(card.meaning))
    .slice(0, TRY_LIMIT);
  return { section: first?.name ?? null, cards };
}

export interface SectionStep {
  /** 1-based place in the deck's order, or null for cards outside any section. */
  position: number | null;
  name: string | null;
  cards: PublicDeckOut["sections"][number]["cards"];
}

/**
 * The deck as the path a learner walks: named sections in order, then any cards outside one.
 * `inOrder` is false for a deck with no sections, whose cards are one open group.
 */
export function sectionPath(deck: PublicDeckOut): { inOrder: boolean; steps: SectionStep[] } {
  let position = 0;
  const steps = deck.sections.map((section) => ({
    position: section.name === null ? null : ++position,
    name: section.name,
    cards: section.cards,
  }));
  return { inOrder: position > 0, steps };
}

/**
 * A language tag's name in the page's language. Ukrainian and Russian write it lower-case inside
 * a sentence, so `label` capitalises it only where it starts a label on its own.
 */
export function languageName(
  tag: string | null,
  locale: string,
  { label = false }: { label?: boolean } = {},
): string | null {
  if (!tag) return null;
  let name: string;
  try {
    name = new Intl.DisplayNames([locale], { type: "language" }).of(tag) ?? tag;
  } catch {
    return tag;
  }
  return label ? name.charAt(0).toLocaleUpperCase(locale) + name.slice(1) : name;
}

/**
 * Changes whenever what the page shows can change: a publish or withdrawal raises the
 * revision, and a deploy changes the version. It never depends on who is asking.
 */
export function deckEtag(parts: {
  slug: string;
  revision: number;
  locale: Locale;
  version: string | undefined;
}): string {
  return `W/"deck-${parts.slug}-r${parts.revision}-${parts.locale}-${parts.version ?? "dev"}"`;
}

export function etagMatches(ifNoneMatch: string | null, etag: string): boolean {
  if (!ifNoneMatch) return false;
  const bare = (tag: string) => tag.trim().replace(/^W\//, "");
  return ifNoneMatch.split(",").some((tag) => tag.trim() === "*" || bare(tag) === bare(etag));
}

/** Short and public: a publisher's correction reaches visitors within minutes. */
export const DECK_CACHE_CONTROL = "public, max-age=300";
export const MISSING_CACHE_CONTROL = "public, max-age=60";

/** schema.org LearningResource: a vocabulary list with its CEFR level and the language it teaches. */
export function deckStructuredData(deck: PublicDeckOut, locale: Locale) {
  const url = new URL(deckPath(deck.slug, locale), SITE).toString();
  const language = languageName(deck.language, "en");
  return {
    "@context": "https://schema.org",
    "@type": "LearningResource",
    "@id": url,
    url,
    name: deck.name,
    description: deck.summary,
    learningResourceType: "Vocabulary list",
    inLanguage: [...new Set([deck.language, deck.meaningLanguage].filter(Boolean))],
    ...(language && {
      teaches: `${language} vocabulary`,
      about: { "@type": "Language", name: language, alternateName: deck.language },
    }),
    ...(deck.level && {
      educationalLevel: {
        "@type": "DefinedTerm",
        name: deck.level,
        termCode: deck.level,
        inDefinedTermSet:
          "https://www.coe.int/en/web/common-european-framework-reference-languages",
      },
    }),
    publisher: { "@type": "Organization", name: deck.publisher },
    datePublished: deck.publishedAt,
    ...(deck.sources.length > 0 && {
      citation: deck.sources.map((source) => ({
        "@type": "CreativeWork",
        name: source.title,
        ...(source.url && { url: source.url }),
      })),
    }),
    isPartOf: { "@type": "WebSite", name: "Lymi", url: `${SITE}/` },
  };
}

/** Every published deck in each locale, with its alternates so search engines pair them. */
export function deckSitemap(decks: readonly { slug: string; updatedAt: Date }[]): string {
  const alternates = (slug: string) =>
    [
      ...locales.map(
        (locale) =>
          `    <xhtml:link rel="alternate" hreflang="${locale}" href="${SITE}${deckPath(slug, locale)}"/>`,
      ),
      `    <xhtml:link rel="alternate" hreflang="x-default" href="${SITE}${deckPath(slug, "en")}"/>`,
    ].join("\n");
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...decks.flatMap(({ slug, updatedAt }) =>
      locales.map((locale) =>
        [
          "  <url>",
          `    <loc>${SITE}${deckPath(slug, locale)}</loc>`,
          `    <lastmod>${updatedAt.toISOString()}</lastmod>`,
          alternates(slug),
          "  </url>",
        ].join("\n"),
      ),
    ),
    "</urlset>",
    "",
  ].join("\n");
}

/** JSON for a `<script>` element: `<` is escaped so a card cannot close the element. */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}
