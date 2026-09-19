import { describe, expect, it } from "vitest";
import { deckPaths } from "./deck-page";
import { explorePaths } from "./explore";
import { pagesSitemap, runtimeSitemap } from "./sitemap";

const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
const entry = (xml: string, path: string) =>
  xml.match(new RegExp(`<url>\\s*<loc>https://lymi\\.app${path}</loc>[\\s\\S]*?</url>`))?.[0] ?? "";

describe("runtimeSitemap", () => {
  it("lists Explore in every locale, pointing at its alternates", () => {
    const xml = runtimeSitemap([]);
    expect(locs(xml)).toEqual([
      "https://lymi.app/explore",
      "https://lymi.app/uk/explore",
      "https://lymi.app/ru/explore",
    ]);
    const explore = entry(xml, "/explore");
    for (const [locale, path] of Object.entries(explorePaths())) {
      expect(explore).toContain(`hreflang="${locale}" href="https://lymi.app${path}"`);
    }
    expect(explore).toContain('hreflang="x-default" href="https://lymi.app/explore"');
    expect(explore).not.toContain("<lastmod>");
  });

  it("lists every locale of each deck with its alternates and last change", () => {
    const xml = runtimeSitemap([
      { slug: "everyday-estonian", updatedAt: new Date(0) },
      { slug: "road-signs", updatedAt: new Date("2026-09-10T00:00:00Z") },
    ]);
    for (const path of Object.values(deckPaths("everyday-estonian"))) {
      expect(xml).toContain(`<loc>https://lymi.app${path}</loc>`);
    }
    expect(xml.match(/<url>/g)).toHaveLength(9);
    const deck = entry(xml, "/uk/explore/everyday-estonian");
    expect(deck).toContain("<lastmod>1970-01-01T00:00:00.000Z</lastmod>");
    expect(deck).toContain(
      'hreflang="x-default" href="https://lymi.app/explore/everyday-estonian"',
    );
    // Explore changed when its newest deck did.
    expect(entry(xml, "/explore")).toContain("<lastmod>2026-09-10T00:00:00.000Z</lastmod>");
  });
});

describe("pagesSitemap", () => {
  it("pairs each translated page with its alternates and leaves English-only pages plain", () => {
    const xml = pagesSitemap();
    const teachers = entry(xml, "/uk/teachers");
    expect(teachers).toContain('hreflang="en" href="https://lymi.app/teachers"');
    expect(teachers).toContain('hreflang="uk" href="https://lymi.app/uk/teachers"');
    expect(teachers).toContain('hreflang="ru" href="https://lymi.app/ru/teachers"');
    expect(teachers).toContain('hreflang="x-default" href="https://lymi.app/teachers"');
    expect(entry(xml, "/uk/")).toContain('hreflang="x-default" href="https://lymi.app/"');
    expect(entry(xml, "/docs/api")).not.toContain("hreflang");
    expect(xml).not.toContain("/explore");
  });
});
