import { describe, expect, it } from "vitest";
import { GET } from "../pages/sitemap-pages.xml";
import { changelogSlugs, changelogUpdatePath } from "./changelog-paths";
import { LANGUAGE_PAGE_TAGS, LANGUAGE_PAGES, languageOfPage } from "./language-pages";
import {
  englishOnlyPaths,
  isRuntimePage,
  type LocalizedPage,
  locales,
  localizedContentPages,
  localizedPages,
  localizedPath,
  localizedRuntimePages,
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

const pages = (Object.keys(localizedPages) as LocalizedPage[]).filter(
  (page) => !isRuntimePage(page),
);
const translatedPaths = (locale: string) => pages.map((page) => bare(localizedPath(page, locale)));
const translatedPrefix = new RegExp(`^/(${locales.filter((l) => l !== "en").join("|")})(/|$)`);
const allRoutes = new Set(pageFiles.map(routeOf).filter((route) => route !== "/404"));
const inEveryLocale = (paths: readonly string[]) =>
  new Set(
    locales.flatMap((locale) =>
      paths.map((path) => (locale === "en" ? path : `/${locale}${path}`)),
    ),
  );
const runtimePaths = inEveryLocale(localizedRuntimePages);
const contentPaths = inEveryLocale(localizedContentPages);
/** Rendered per request: a `[param]` route, or a fixed path the runtime list names. */
const isRuntime = (route: string) => route.includes("[") || runtimePaths.has(route);
const routes = new Set([...allRoutes].filter((route) => !isRuntime(route)));

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

  it("has every page rendered per request in every locale, and nothing else dynamic", () => {
    expect([...runtimePaths].filter((path) => !allRoutes.has(path))).toEqual([]);
    const undeclared = [...allRoutes].filter(
      (route) => route.includes("[") && !runtimePaths.has(route) && !contentPaths.has(route),
    );
    expect(undeclared).toEqual([]);
  });

  it("has every page built from content in every locale", () => {
    expect([...contentPaths].filter((path) => !allRoutes.has(path))).toEqual([]);
  });

  it("serves each supported language's page from the language route in every locale", () => {
    for (const tag of LANGUAGE_PAGE_TAGS) {
      const { page } = LANGUAGE_PAGES[tag];
      expect(languageOfPage(page)).toBe(tag);
      expect(isRuntimePage(page)).toBe(true);
      for (const locale of locales) {
        const path = localizedPath(page, locale);
        expect(runtimePaths.has(path.replace(/[^/]+$/, "[language]"))).toBe(true);
        // A file of its own would shadow the shared route.
        expect(allRoutes.has(path)).toBe(false);
      }
    }
    expect(languageOfPage("estonian")).toBeUndefined();
  });

  it("lists every public page in the sitemap", async () => {
    const sitemap = await GET().text();
    const listed = [...sitemap.matchAll(/<loc>https:\/\/lymi\.app(\/[^<]*)<\/loc>/g)].map((match) =>
      bare(match[1] ?? ""),
    );
    const updates = locales.flatMap((locale) =>
      changelogSlugs.map((slug) => changelogUpdatePath(slug, locale)),
    );
    expect(new Set(listed)).toEqual(new Set([...routes, ...updates]));
  });
});
