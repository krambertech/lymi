export const prerender = true;

/** The index: fixed pages from the build, published decks from the database at request time. */
export const SITEMAPS = ["/sitemap-pages.xml", "/sitemap-decks.xml"] as const;

export function GET() {
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...SITEMAPS.map((path) => `  <sitemap><loc>https://lymi.app${path}</loc></sitemap>`),
    "</sitemapindex>",
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
