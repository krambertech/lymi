import { env, waitUntil } from "cloudflare:workers";
import {
  countDeckPageView,
  listPublicDeckSlugs,
  listRelatedDecks,
  loadPublicDeck,
  type PublicDeckOut,
  type PublicDeckSummary,
} from "@lymi/core/catalog";
import { drizzle } from "@lymi/core/db";
import type { AstroGlobal } from "astro";
import {
  countsAsPageView,
  DECK_CACHE_CONTROL,
  deckContentHash,
  deckEtag,
  etagMatches,
  MISSING_CACHE_CONTROL,
} from "./deck-page";
import type { Locale } from "./routes";

export type DeckPage =
  | { status: 200; locale: Locale; deck: PublicDeckOut; related: PublicDeckSummary[] }
  | { status: 404 | 410; locale: Locale; slug: string };

const catalogDb = () => drizzle(env.DB);

/** More like this fills one row of the page's widest column, which holds four trays. */
const RELATED_ON_PAGE = 4;

/**
 * Loads the deck and sets the response's status and cache headers. The page's locale picks the
 * meaning-language edition, falling back to the original where the deck has no published one.
 * Nothing here reads a cookie or a session, so one cached copy is right for every visitor. ADR 0016.
 */
export async function resolveDeckPage(
  astro: AstroGlobal,
  locale: Locale,
): Promise<DeckPage | Response> {
  const slug = astro.params.slug ?? "";
  const db = catalogDb();
  const result = await loadPublicDeck(db, slug, locale);
  const headers = astro.response.headers;
  headers.set("content-type", "text/html; charset=utf-8");
  if (result.status !== "published") {
    headers.set("cache-control", MISSING_CACHE_CONTROL);
    const status = result.status === "missing" ? 404 : 410;
    astro.response.status = status;
    return { status, locale, slug };
  }
  const related = await listRelatedDecks(db, slug, { language: locale, limit: RELATED_ON_PAGE });
  const etag = deckEtag({
    slug: result.deck.slug,
    content: deckContentHash(result.deck, related),
    locale,
    version: env.CF_VERSION_METADATA?.id,
  });
  headers.set("cache-control", DECK_CACHE_CONTROL);
  headers.set("etag", etag);
  // A revalidation is a returning visitor seeing the page, so a 304 counts as well.
  if (countsAsPageView(astro.request)) waitUntil(countDeckPageView(db, slug, locale));
  if (etagMatches(astro.request.headers.get("if-none-match"), etag)) {
    return new Response(null, {
      status: 304,
      headers: { "cache-control": DECK_CACHE_CONTROL, etag },
    });
  }
  return { status: 200, locale, deck: result.deck, related };
}

export function publishedDeckSlugs() {
  return listPublicDeckSlugs(catalogDb());
}
