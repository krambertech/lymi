import { publishedDeckSlugs } from "../lib/public-deck";
import { runtimeSitemap } from "../lib/sitemap";

export const prerender = false;

export async function GET() {
  return new Response(runtimeSitemap(await publishedDeckSlugs()), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
