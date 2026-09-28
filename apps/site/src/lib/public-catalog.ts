import { env } from "cloudflare:workers";
import {
  hasShelfPage,
  listPublicCatalog,
  type PublicDeckSummary,
  type Shelf,
  type ShelfKind,
  type ShelfRoute,
  shelfAt,
  shelfRoute,
  shelvesOf,
} from "@lymi/core/catalog";
import { drizzle } from "@lymi/core/db";
import type { AstroGlobal } from "astro";
import { DECK_CACHE_CONTROL, etagMatches } from "./deck-page";
import { catalogContentHash, catalogEtag, shelfPath } from "./explore";
import { type Locale, locales } from "./routes";

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

/** Every shelf page there is, each with its address in the locales that have it, for the sitemap. */
export async function shelfPagePaths(): Promise<Partial<Record<Locale, string>>[]> {
  const db = drizzle(env.DB);
  const catalogs = await Promise.all(locales.map((each) => listPublicCatalog(db, each)));
  const byRoute = new Map<string, Partial<Record<Locale, string>>>();
  locales.forEach((each, at) => {
    for (const shelf of shelvesOf(catalogs[at] ?? [])) {
      const route = shelfRoute(shelf);
      if (!route || !hasShelfPage(shelf)) continue;
      const key = `${route.kind}/${route.name}`;
      byRoute.set(key, { ...byRoute.get(key), [each]: shelfPath(route, each) });
    }
  });
  return [...byRoute.values()];
}
