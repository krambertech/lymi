import { deckSitemap } from "../lib/deck-page";
import { publishedDeckSlugs } from "../lib/public-deck";

export const prerender = false;

export async function GET() {
  return new Response(deckSitemap(await publishedDeckSlugs()), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
