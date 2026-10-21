import { BEGINNER_DECKS } from "@lymi/client/welcome";
import { EXAM_DECKS, EXAMS, examPath, examsPath } from "../lib/exams";
import {
  CHINESE_PAGE_DECKS,
  ESTONIAN_PAGE_DECKS,
  LANGUAGE_PAGE_TAGS,
  LANGUAGE_PAGES,
} from "../lib/language-pages";
import { shelfPagePaths } from "../lib/public-catalog";
import { publishedDeckSlugs } from "../lib/public-deck";
import { localizedPath } from "../lib/routes";
import { runtimeSitemap } from "../lib/sitemap";

export const prerender = false;

export async function GET() {
  const guides = [
    { path: examsPath, slugs: EXAM_DECKS },
    ...EXAMS.map((exam) => ({
      path: (locale: string) => examPath(exam, locale),
      slugs: exam.decks,
    })),
    ...LANGUAGE_PAGE_TAGS.map((tag) => ({
      path: (locale: string) => localizedPath(LANGUAGE_PAGES[tag].page, locale),
      slugs: BEGINNER_DECKS[tag] ?? [],
    })),
    { path: (locale: string) => localizedPath("estonian", locale), slugs: ESTONIAN_PAGE_DECKS },
    { path: (locale: string) => localizedPath("chinese", locale), slugs: CHINESE_PAGE_DECKS },
  ];
  return new Response(runtimeSitemap(await publishedDeckSlugs(), await shelfPagePaths(), guides), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
