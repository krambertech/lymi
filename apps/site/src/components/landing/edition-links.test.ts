import type { PublicDeckSummary } from "@lymi/core/catalog";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LANGUAGE_PAGE_TAGS, LANGUAGE_PAGES } from "../../lib/language-pages";
import { pageLocales } from "../../lib/routes";
import EstonianPage from "../islands/EstonianPage";
import LanguageView from "../islands/LanguageView";
import { CHINESE_PATH } from "./chinese";
import { ESTONIAN_PATH } from "./estonian";
import { GERMAN_PATH } from "./german";
import { JAPANESE_PATH } from "./japanese";
import { POLISH_PATH } from "./polish";
import { RUSSIAN_PATH } from "./russian";
import { SPANISH_PATH } from "./spanish";
import { UKRAINIAN_PATH } from "./ukrainian";

const deck = (slug: string, locale: string): PublicDeckSummary => ({
  slug,
  name: slug,
  summary: "",
  category: "languages",
  tags: [],
  language: null,
  meaningLanguage: locale,
  cardCount: 10,
  sectionCount: 0,
  card: null,
});

const slugs = [
  CHINESE_PATH,
  ESTONIAN_PATH,
  GERMAN_PATH,
  JAPANESE_PATH,
  POLISH_PATH,
  RUSSIAN_PATH,
  SPANISH_PATH,
  UKRAINIAN_PATH,
].flatMap((path) => path.map((step) => step.slug));

const addLinks = (html: string) =>
  [...html.matchAll(/href="([^"]*\/add\/[^"]*)"/g)].map(([, href]) => new URL(href ?? ""));

const pages = [
  ...LANGUAGE_PAGE_TAGS.map((language) => ({
    page: LANGUAGE_PAGES[language].page,
    View: (props: Parameters<typeof EstonianPage>[0]) =>
      createElement(LanguageView, { language, ...props }),
  })),
  { page: "estonian" as const, View: EstonianPage },
].flatMap(({ page, View }) => pageLocales(page).map((locale) => ({ page, View, locale })));

describe("the links that add a deck from a language page", () => {
  it.each(pages)("/$page in $locale keep the edition it showed", ({ View, locale }) => {
    const decks = slugs.map((slug) => deck(slug, locale));
    const links = addLinks(renderToStaticMarkup(createElement(View, { locale, decks })));
    expect(links.length).toBeGreaterThan(0);
    const edition = locale === "en" ? null : locale;
    expect(links.map((link) => link.searchParams.get("edition"))).toEqual(links.map(() => edition));
  });

  it("leave Start with kana out of the Japanese page when its deck is not published", () => {
    const html = renderToStaticMarkup(
      createElement(LanguageView, { language: "ja", locale: "uk", decks: [] }),
    );
    expect(addLinks(html)).toEqual([]);
  });
});
