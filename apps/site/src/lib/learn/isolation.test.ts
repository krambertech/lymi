import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { lessonName } from "../../components/learn/learn-page";
import { LESSON_SLUGS } from "./catalogue";
import { messagesIn, readCatalog } from "./checks/catalog";

const SRC = new URL("../../", import.meta.url);
const files = (readdirSync(SRC, { recursive: true }) as string[]).filter((name) =>
  /\.(?:tsx?|astro)$/.test(name),
);

const LESSON_FILES = /^(?:components|lib)\/learn\//;
const ENTRIES: readonly RegExp[] = [
  /^components\/islands\/(?:LearnHubPage|LearnLessonPage|LearnReload|LessonKitPage)\.tsx$/,
  /^pages\/(?:uk\/|ru\/)?estonian\/learn(?:\.astro|\/\[lesson\]\.astro)$/,
  /^lib\/(?:sitemap|routes\.test)\.ts$/,
];
const IMPORTS_LESSONS = /(?:from|import|import\()\s*["'][^"']*\/learn\/[^"']*["']/;

const read = (name: string) => readFileSync(new URL(name, SRC), "utf8");
const isTest = (name: string) => name.includes(".test.");
const sourceOf = (wanted: (name: string) => boolean) =>
  files
    .filter((name) => !isTest(name) && wanted(name))
    .map(read)
    .join("\n");

describe("the lessons stay off every other page", () => {
  it("only the lessons' own pages import lesson code", () => {
    const leaks = files.filter(
      (name) =>
        !LESSON_FILES.test(name) &&
        !ENTRIES.some((entry) => entry.test(name)) &&
        IMPORTS_LESSONS.test(read(name)),
    );
    expect(leaks).toEqual([]);
  });

  it("the catalog every page loads holds no lesson text", () => {
    const site = readCatalog(new URL("locales/en.po", SRC));
    const ownSource = sourceOf((name) => !LESSON_FILES.test(name));
    const own = new Set(messagesIn(ownSource, site));
    const others = site.filter((entry) => !own.has(entry));
    const leaked = messagesIn(
      sourceOf((name) => LESSON_FILES.test(name)),
      others,
    );
    expect(leaked.map(({ id }) => id)).toEqual([]);
  });

  it("each built lesson has a file and each file a built lesson", () => {
    const names = readdirSync(new URL("components/learn/lessons/", SRC))
      .filter((name) => name.endsWith(".tsx"))
      .map((name) => name.slice(0, -".tsx".length));
    expect(names.sort()).toEqual(LESSON_SLUGS.map(lessonName).sort());
  });
});
