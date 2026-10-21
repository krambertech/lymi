import { env } from "cloudflare:workers";
import { languageDecks } from "@lymi/client/welcome";
import type { SupportedTag } from "@lymi/core";
import {
  hasShelfPage,
  type PublicDeckSummary,
  type Shelf,
  type ShelfKind,
  type ShelfRoute,
  shelfAt,
  shelfRoute,
  shelvesOf,
} from "@lymi/core/catalog";
import { listPublicCatalog, listPublicDeckSlugs } from "@lymi/core/catalog/server";
import { drizzle } from "@lymi/core/db";
import type { AstroGlobal } from "astro";
import { DECK_CACHE_CONTROL, etagMatches } from "./deck-page";
import { EXAM_DECKS, type ListedExam, listedExams } from "./exams";
import { catalogContentHash, catalogEtag, shelfPath } from "./explore";
import { LANGUAGE_PAGES } from "./language-pages";
import { type Locale, locales } from "./routes";
import type { SitemapShelf } from "./sitemap";

export interface ExplorePage {
  locale: Locale;
  decks: PublicDeckSummary[];
}

/**
 * Loads the published decks this locale's readers can use and sets the response's cache headers.
 * Nothing here reads a cookie or a session, so one cached copy per locale is right for every
 * visitor, and the validator changes only when the catalogue's own content does. ADR 0016.
 */
export async function resolveExplorePage(
  astro: AstroGlobal,
  locale: Locale,
): Promise<ExplorePage | Response> {
  const decks = await listPublicCatalog(drizzle(env.DB), locale);
  const headers = astro.response.headers;
  headers.set("content-type", "text/html; charset=utf-8");
  const etag = catalogEtag({
    content: catalogContentHash(decks),
    locale,
    version: env.CF_VERSION_METADATA?.id,
  });
  headers.set("cache-control", DECK_CACHE_CONTROL);
  headers.set("etag", etag);
  if (etagMatches(astro.request.headers.get("if-none-match"), etag)) {
    return new Response(null, {
      status: 304,
      headers: { "cache-control": DECK_CACHE_CONTROL, etag },
    });
  }
  return { locale, decks };
}

export interface ShelfPage {
  locale: Locale;
  shelf: Shelf;
  route: ShelfRoute;
  /** The shelf's page in each locale where its readers have enough decks for one. */
  alternates: Partial<Record<Locale, string>>;
  /** The other shelves of the same kind that have a page, for the links at the page's end. */
  others: { shelf: Shelf; route: ShelfRoute }[];
}

const SHELF_KINDS: readonly string[] = ["languages", "subjects"] satisfies ShelfKind[];

/**
 * One shelf of this locale's Explore as a page, or null when the address names no shelf with a
 * page here. Every locale's catalogue is read so the page can name its translations, and the
 * validator folds in all of them, since a new deck elsewhere can add or take away one.
 */
export async function resolveShelfPage(
  astro: AstroGlobal,
  locale: Locale,
): Promise<ShelfPage | Response | null> {
  const kind = astro.params.kind ?? "";
  const name = astro.params.name ?? "";
  if (!SHELF_KINDS.includes(kind)) return null;
  const route = { kind: kind as ShelfKind, name };
  const db = drizzle(env.DB);
  const catalogs = await Promise.all(locales.map((each) => listPublicCatalog(db, each)));
  const shelvesIn = Object.fromEntries(
    locales.map((each, at) => [each, shelvesOf(catalogs[at] ?? [])]),
  ) as Record<Locale, Shelf[]>;
  const shelf = shelfAt(shelvesIn[locale], route);
  if (!shelf) return null;

  const alternates = Object.fromEntries(
    locales
      .filter((each) => shelfAt(shelvesIn[each], route))
      .map((each) => [each, shelfPath(route, each)]),
  ) as Partial<Record<Locale, string>>;
  const others = shelvesIn[locale].flatMap((other) => {
    const at = shelfRoute(other);
    return other !== shelf && at?.kind === route.kind && hasShelfPage(other)
      ? [{ shelf: other, route: at }]
      : [];
  });

  const headers = astro.response.headers;
  headers.set("content-type", "text/html; charset=utf-8");
  const etag = catalogEtag({
    content: catalogContentHash(catalogs.flat()),
    locale,
    version: env.CF_VERSION_METADATA?.id,
    page: `shelf-${route.kind}-${route.name}`,
  });
  headers.set("cache-control", DECK_CACHE_CONTROL);
  headers.set("etag", etag);
  if (etagMatches(astro.request.headers.get("if-none-match"), etag)) {
    return new Response(null, {
      status: 304,
      headers: { "cache-control": DECK_CACHE_CONTROL, etag },
    });
  }
  return { locale, shelf, route, alternates, others };
}

/** Every shelf page there is, with its address in the locales that have it and its decks, for the sitemap. */
export async function shelfPagePaths(): Promise<SitemapShelf[]> {
  const db = drizzle(env.DB);
  const catalogs = await Promise.all(locales.map((each) => listPublicCatalog(db, each)));
  const byRoute = new Map<string, { paths: Partial<Record<Locale, string>>; slugs: Set<string> }>();
  locales.forEach((each, at) => {
    for (const shelf of shelvesOf(catalogs[at] ?? [])) {
      const route = shelfRoute(shelf);
      if (!route || !hasShelfPage(shelf)) continue;
      const key = `${route.kind}/${route.name}`;
      const entry = byRoute.get(key) ?? { paths: {}, slugs: new Set<string>() };
      entry.paths[each] = shelfPath(route, each);
      for (const deck of shelf.decks) entry.slugs.add(deck.slug);
      byRoute.set(key, entry);
    }
  });
  return [...byRoute.values()].map(({ paths, slugs }) => ({ paths, slugs: [...slugs] }));
}

export interface ExamsPage {
  locale: Locale;
  exams: ListedExam[];
  /** When each listed deck last changed, so a page can say how current its questions are. */
  updated: Record<string, string>;
}

/**
 * The exams this locale's catalogue covers, with their decks, for the exam hub and an exam's own
 * page. Cached like Explore, and validated on the decks it shows.
 */
export async function resolveExamsPage(
  astro: AstroGlobal,
  locale: Locale,
  page: string,
): Promise<ExamsPage | Response> {
  const db = drizzle(env.DB);
  const [catalogue, slugs] = await Promise.all([
    listPublicCatalog(db, locale),
    listPublicDeckSlugs(db),
  ]);
  const exams = listedExams(catalogue);
  const updated = Object.fromEntries(
    slugs
      .filter((deck) => EXAM_DECKS.includes(deck.slug))
      .map((deck) => [deck.slug, deck.updatedAt.toISOString()]),
  );
  const headers = astro.response.headers;
  headers.set("content-type", "text/html; charset=utf-8");
  const etag = catalogEtag({
    content: catalogContentHash(
      exams.flatMap((exam) => exam.decks),
      updated,
    ),
    locale,
    version: env.CF_VERSION_METADATA?.id,
    page,
  });
  headers.set("cache-control", DECK_CACHE_CONTROL);
  headers.set("etag", etag);
  if (etagMatches(astro.request.headers.get("if-none-match"), etag)) {
    return new Response(null, {
      status: 304,
      headers: { "cache-control": DECK_CACHE_CONTROL, etag },
    });
  }
  return { locale, exams, updated };
}

export interface LanguageDecksPage {
  locale: Locale;
  language: SupportedTag;
  /** The language's decks, those a beginner starts from first, as Welcome offers them. */
  decks: PublicDeckSummary[];
}

/** Decks taught in `language`, read and cached like Explore; `page` keeps the validator apart. */
async function resolveTaughtDecks(
  astro: AstroGlobal,
  locale: Locale,
  language: string,
  page: string,
): Promise<PublicDeckSummary[] | Response> {
  const decks = languageDecks(await listPublicCatalog(drizzle(env.DB), locale), language);
  const headers = astro.response.headers;
  headers.set("content-type", "text/html; charset=utf-8");
  const etag = catalogEtag({
    content: catalogContentHash(decks),
    locale,
    version: env.CF_VERSION_METADATA?.id,
    page,
  });
  headers.set("cache-control", DECK_CACHE_CONTROL);
  headers.set("etag", etag);
  if (etagMatches(astro.request.headers.get("if-none-match"), etag)) {
    return new Response(null, {
      status: 304,
      headers: { "cache-control": DECK_CACHE_CONTROL, etag },
    });
  }
  return decks;
}

/**
 * A language page's decks in this locale, read and cached like Explore, so the page shows only
 * decks that are published now.
 */
export async function resolveLanguageDecks(
  astro: AstroGlobal,
  locale: Locale,
  language: SupportedTag,
): Promise<LanguageDecksPage | Response> {
  const decks = await resolveTaughtDecks(astro, locale, language, LANGUAGE_PAGES[language].page);
  return decks instanceof Response ? decks : { locale, language, decks };
}

/** The Chinese page's decks, which keeps its own route until Chinese joins `LANGUAGE_PAGES`. */
export async function resolveChineseDecks(
  astro: AstroGlobal,
  locale: Locale,
): Promise<{ locale: Locale; decks: PublicDeckSummary[] } | Response> {
  const decks = await resolveTaughtDecks(astro, locale, "zh", "chinese");
  return decks instanceof Response ? decks : { locale, decks };
}

/** The Estonian page's decks, which keeps its own route until Estonian joins `LANGUAGE_PAGES`. */
export async function resolveEstonianDecks(
  astro: AstroGlobal,
  locale: Locale,
): Promise<{ locale: Locale; decks: PublicDeckSummary[] } | Response> {
  const decks = await resolveTaughtDecks(astro, locale, "et", "estonian");
  return decks instanceof Response ? decks : { locale, decks };
}
