import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lessonName } from "../../components/learn/learn-page";
import { LESSON_SLUGS } from "./catalogue";
import { readCatalog } from "./checks/catalog";

const SRC = new URL("../../", import.meta.url);
const files = (readdirSync(SRC, { recursive: true }) as string[]).filter((name) =>
  /\.(?:tsx?|astro)$/.test(name),
);

const LESSON_FILES = /^(?:components|lib)\/learn\//;
const ENTRIES: readonly RegExp[] = [
  /^components\/islands\/(?:LearnHubPage|LearnLessonPage|LessonKitPage)\.tsx$/,
  /^pages\/(?:uk\/|ru\/)?estonian\/learn(?:\.astro|\/\[lesson\]\.astro)$/,
  /^lib\/(?:sitemap|routes\.test)\.ts$/,
];
const IMPORTS_LESSONS = /from "[^"]*\/learn\/[^"]*"|import\("[^"]*\/learn\/[^"]*"\)/;

describe("the lessons stay off every other page", () => {
  it("only the lessons' own pages import lesson code", () => {
    const leaks = files.filter(
      (name) =>
        !LESSON_FILES.test(name) &&
        !ENTRIES.some((entry) => entry.test(name)) &&
        IMPORTS_LESSONS.test(readFileSync(new URL(name, SRC), "utf8")),
    );
    expect(leaks).toEqual([]);
  });

  it("the catalog every page loads holds no lesson text", () => {
    const site = new Set(
      readCatalog(new URL("locales/en.po", SRC)).map(({ id, context }) => `${context}/${id}`),
    );
    const lessonSources = files
      .filter((name) => LESSON_FILES.test(name) && !name.includes(".test."))
      .map((name) => readFileSync(new URL(name, SRC), "utf8"))
      .join("\n");
    const parts = readdirSync(new URL("locales/learn/", SRC));
    const shared = parts
      .flatMap((part) => readCatalog(new URL(`locales/learn/${part}/en.po`, SRC)))
      .filter(({ id, context }) => site.has(`${context}/${id}`));
    const elsewhere = files
      .filter((name) => !LESSON_FILES.test(name) && !name.includes(".test."))
      .map((name) => readFileSync(new URL(name, SRC), "utf8"))
      .join("\n");
    const leaked = shared
      .map(({ id }) => id.split(/<\/?\d+\/?>|\{/)[0]?.trim() ?? "")
      .filter((words) => words.length > 12)
      .filter((words) => lessonSources.includes(words) && !elsewhere.includes(words));
    expect(leaked).toEqual([]);
  });

  it("each built lesson has a file and each file a built lesson", () => {
    const names = readdirSync(new URL("components/learn/lessons/", SRC))
      .filter((name) => name.endsWith(".tsx"))
      .map((name) => name.slice(0, -".tsx".length));
    expect(names.sort()).toEqual(LESSON_SLUGS.map(lessonName).sort());
  });
});
