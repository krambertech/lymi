import { sitemapPaths } from "../lib/routes";

export const prerender = true;

export function GET() {
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapPaths.map((path) => `  <url><loc>https://lymi.app${path}</loc></url>`),
    "</urlset>",
    "",
  ].join("\n");
  return new Response(body, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
