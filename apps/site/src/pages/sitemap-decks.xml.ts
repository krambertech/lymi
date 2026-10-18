import { BEGINNER_DECKS } from "@lymi/client/welcome";
import { EXAM_DECKS, EXAMS, examPath, examsPath } from "../lib/exams";
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
    { path: (locale: string) => localizedPath("japanese", locale), slugs: BEGINNER_DECKS.ja ?? [] },
  ];
  return new Response(runtimeSitemap(await publishedDeckSlugs(), await shelfPagePaths(), guides), {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
