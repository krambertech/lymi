export const prerender = true;

export function GET() {
  return new Response(
    [
      "User-agent: *",
      "Disallow: /api/",
      "Disallow: /download/mac",
      "Disallow: /download/iphone",
      "Disallow: /download/android",
      "",
      "Sitemap: https://lymi.app/sitemap.xml",
      "",
    ].join("\n"),
    { headers: { "content-type": "text/plain; charset=utf-8" } },
  );
}
