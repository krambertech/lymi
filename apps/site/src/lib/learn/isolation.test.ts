import { readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { leakedLessonChunks } from "../../../lesson-isolation.mjs";
import { LESSON_SLUGS, lessonName } from "./catalogue";

const chunk = (
  fileName: string,
  moduleIds: string[],
  imports: string[] = [],
  entry: string | null = null,
) => ({
  type: "chunk" as const,
  fileName,
  moduleIds,
  imports,
  isEntry: !!entry,
  facadeModuleId: entry,
});

const site = "/repo/apps/site/src";
const bundle = (homeImports: string[]) => ({
  "home.js": chunk(
    "home.js",
    [`${site}/components/islands/LandingPage.tsx`],
    homeImports,
    `${site}/components/islands/LandingPage.tsx`,
  ),
  "shared.js": chunk("shared.js", [`${site}/components/Button.tsx`], []),
  "deep.js": chunk("deep.js", [`${site}/components/Explore.tsx`], ["lesson.js"]),
  "lesson.js": chunk("lesson.js", [`${site}/components/learn/Quiz.tsx`]),
  "uk.js": chunk("uk.js", [`${site}/locales/learn/Meeldima/uk.po`]),
  "learn.js": chunk(
    "learn.js",
    [`${site}/components/islands/LearnLessonPage.tsx`],
    ["lesson.js"],
    `${site}/components/islands/LearnLessonPage.tsx`,
  ),
});

describe("the lessons stay off every other page", () => {
  it("lets a page load what it shares with the lessons", () => {
    expect(leakedLessonChunks(bundle(["shared.js"]))).toEqual([]);
  });

  it("finds lesson code and lesson catalogs, however deep the import", () => {
    for (const chunkName of ["lesson.js", "deep.js", "uk.js"])
      expect(leakedLessonChunks(bundle([chunkName])), chunkName).toHaveLength(1);
  });

  it("each built lesson has a file and each file a built lesson", () => {
    const names = readdirSync(new URL("../../components/learn/lessons/", import.meta.url))
      .filter((name) => name.endsWith(".tsx"))
      .map((name) => name.slice(0, -".tsx".length));
    expect(names.sort()).toEqual(LESSON_SLUGS.map(lessonName).sort());
  });

  it("keeps each drill bank beside the lesson it belongs to, as data without JSX", () => {
    const banks = readdirSync(new URL("../../components/learn/lessons/", import.meta.url)).filter(
      (name) => name.includes(".drills."),
    );
    const lessons = new Set(LESSON_SLUGS.map((slug) => `${lessonName(slug)}.drills.ts`));
    expect(banks.filter((name) => !lessons.has(name))).toEqual([]);
  });
});
