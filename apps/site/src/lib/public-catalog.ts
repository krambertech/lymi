import { env } from "cloudflare:workers";
import { listPublicCatalog, type PublicDeckSummary } from "@lymi/core/catalog";
import { drizzle } from "@lymi/core/db";
import type { AstroGlobal } from "astro";
import { DECK_CACHE_CONTROL, etagMatches } from "./deck-page";
import { catalogContentHash, catalogEtag } from "./explore";
import type { Locale } from "./routes";

export interface ExplorePage {
  locale: Locale;
  decks: PublicDeckSummary[];
}

/**
 * Loads every published deck for Explore and sets the response's cache headers. Nothing here
 * reads a cookie or a session, so one cached copy per locale is right for every visitor, and the
 * validator changes only when the catalogue's own content does. ADR 0016.
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
