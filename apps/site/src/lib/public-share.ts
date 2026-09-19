import { env } from "cloudflare:workers";
import { loadPublicDeck, trayHue } from "@lymi/core/catalog";
import { drizzle } from "@lymi/core/db";
import type { APIContext } from "astro";
import { deckShareText } from "../components/deck/deck-meta";
import {
  DECK_CACHE_CONTROL,
  deckContentHash,
  etagMatches,
  MISSING_CACHE_CONTROL,
} from "./deck-page";
import { deckShareSvg } from "./deck-share";
import { pageI18n } from "./i18n";
import type { Locale } from "./routes";
import { renderPng } from "./share-image";

/**
 * The deck's link preview, rendered from the same public projection as its page and cached
 * the same way: the validator moves with the deck's content and the Worker, never with the
 * visitor. A deck that is not published has no image either. ADR 0016.
 */
export async function shareImageResponse(context: APIContext, locale: Locale): Promise<Response> {
  const slug = context.params.slug ?? "";
  const result = await loadPublicDeck(drizzle(env.DB), slug, locale);
  if (result.status !== "published") {
    return new Response(null, {
      status: result.status === "missing" ? 404 : 410,
      headers: { "cache-control": MISSING_CACHE_CONTROL },
    });
  }
  const { deck } = result;
  const etag = `W/"share-${deck.slug}-${deckContentHash(deck)}-${locale}-${env.CF_VERSION_METADATA?.id ?? "dev"}"`;
  const headers = { "cache-control": DECK_CACHE_CONTROL, etag };
  if (etagMatches(context.request.headers.get("if-none-match"), etag)) {
    return new Response(null, { status: 304, headers });
  }
  const text = deckShareText(pageI18n(locale), deck);
  const png = await renderPng(deckShareSvg({ ...text, hue: trayHue(deck.slug) }));
  return new Response(png.slice().buffer, { headers: { ...headers, "content-type": "image/png" } });
}
