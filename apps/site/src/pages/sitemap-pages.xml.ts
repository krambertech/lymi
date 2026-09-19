import { pagesSitemap } from "../lib/sitemap";

export const prerender = true;

export function GET() {
  return new Response(pagesSitemap(), {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
}
