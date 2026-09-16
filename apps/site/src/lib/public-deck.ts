import { env } from "cloudflare:workers";
import { listPublicDeckSlugs, loadPublicDeck, type PublicDeckOut } from "@lymi/core/catalog";
import { drizzle } from "@lymi/core/db";
import type { AstroGlobal } from "astro";
import { DECK_CACHE_CONTROL, deckEtag, etagMatches, MISSING_CACHE_CONTROL } from "./deck-page";
import type { Locale } from "./routes";

export type DeckPage =
  | { status: 200; locale: Locale; deck: PublicDeckOut }
  | { status: 404 | 410; locale: Locale; slug: string };

const catalogDb = () => drizzle(env.DB);

/**
 * Loads the deck and sets the response's status and cache headers. Nothing here reads a cookie
 * or a session, so one cached copy is right for every visitor. ADR 0016.
 */
export async function resolveDeckPage(
  astro: AstroGlobal,
  locale: Locale,
): Promise<DeckPage | Response> {
  const slug = astro.params.slug ?? "";
  const result = await loadPublicDeck(catalogDb(), slug);
  const headers = astro.response.headers;
  headers.set("content-type", "text/html; charset=utf-8");
  if (result.status !== "published") {
    headers.set("cache-control", MISSING_CACHE_CONTROL);
    const status = result.status === "missing" ? 404 : 410;
    astro.response.status = status;
    return { status, locale, slug };
  }
  const etag = deckEtag({
    slug: result.deck.slug,
    revision: result.deck.revision,
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
  return { status: 200, locale, deck: result.deck };
}

export function publishedDeckSlugs() {
  return listPublicDeckSlugs(catalogDb());
}
