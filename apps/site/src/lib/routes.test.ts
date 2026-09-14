import { describe, expect, it } from "vitest";
import { GET } from "../pages/sitemap.xml";
import {
  englishOnlyPaths,
  type LocalizedPage,
  locales,
  localizedPages,
  localizedPath,
} from "./routes";

// Keys only; the Astro pages are never loaded.
const pageFiles = Object.keys(import.meta.glob("../pages/**/*.astro"));

/** `/uk/` and `/uk/index.astro` both become `/uk`, so a path and its file compare equal. */
const bare = (path: string) => path.replace(/\/$/, "") || "/";
const routeOf = (file: string) =>
  bare(
    file
      .replace(/^\.\.\/pages/, "")
      .replace(/\.astro$/, "")
      .replace(/\/index$/, ""),
  );

const pages = Object.keys(localizedPages) as LocalizedPage[];
const translatedPaths = (locale: string) => pages.map((page) => bare(localizedPath(page, locale)));
const translatedPrefix = new RegExp(`^/(${locales.filter((l) => l !== "en").join("|")})(/|$)`);
const routes = new Set(pageFiles.map(routeOf).filter((route) => route !== "/404"));

describe("public routes", () => {
  it("declares every English page as translated or deliberately English only", () => {
    const english = [...routes].filter((route) => !translatedPrefix.test(route));
    const declared = new Set<string>([...Object.values(localizedPages), ...englishOnlyPaths]);
    expect(english.filter((route) => !declared.has(route))).toEqual([]);
  });

  it("has a page in every locale for each translated page", () => {
    const missing = locales.flatMap((locale) =>
      translatedPaths(locale).filter((path) => !routes.has(path)),
    );
    expect(missing).toEqual([]);
  });

  it("has no translated page without an English original", () => {
    const translated = new Set(locales.flatMap(translatedPaths));
    const orphans = [...routes].filter(
      (route) => translatedPrefix.test(route) && !translated.has(route),
    );
    expect(orphans).toEqual([]);
  });

  it("lists every public page in the sitemap", async () => {
    const sitemap = await GET().text();
    const listed = [...sitemap.matchAll(/<loc>https:\/\/lymi\.app(\/[^<]*)<\/loc>/g)].map((match) =>
      bare(match[1] ?? ""),
    );
    expect(new Set(listed)).toEqual(routes);
  });
});
