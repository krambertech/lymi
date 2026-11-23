/**
 * The copy rules a scan can hold a lesson to: the tell scan and the uk/ru officialese scan from
 * .agents/skills/estonian-lesson/references/copy.md, curly apostrophes, and lessons found by slug.
 * A lesson's messages are the catalog entries whose words its file holds.
 */
import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LESSONS } from "../catalogue";
import { ALLOWED_COPY } from "./allowed-copy";
import { type Entry, messagesIn, readCatalog } from "./catalog";

const CATALOGS = new URL("../../../locales/learn/", import.meta.url);
const readPart = (part: string) => ({
  en: readCatalog(new URL(`${part}/en.po`, CATALOGS)),
  uk: readCatalog(new URL(`${part}/uk.po`, CATALOGS)),
  ru: readCatalog(new URL(`${part}/ru.po`, CATALOGS)),
});
const KIT_CATALOG = readPart("Kit");

const KIT = new URL("../../../components/learn/", import.meta.url);
const LESSON_DIR = new URL("lessons/", KIT);
const FILES = [
  ...readdirSync(LESSON_DIR)
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => ({
      path: `apps/site/src/components/learn/lessons/${name}`,
      url: new URL(name, LESSON_DIR),
      part: name.slice(0, -".tsx".length),
      catalog: readPart(name.slice(0, -".tsx".length)),
    })),
  ...readdirSync(KIT)
    .filter((name) => name.endsWith(".tsx"))
    .map((name) => ({
      path: `apps/site/src/components/learn/${name}`,
      url: new URL(name, KIT),
      part: "Kit",
      catalog: KIT_CATALOG,
    })),
  {
    path: "apps/site/src/lib/learn/catalogue.ts",
    url: new URL("../catalogue.ts", import.meta.url),
    part: "Kit",
    catalog: KIT_CATALOG,
  },
].map((file) => ({ ...file, source: readFileSync(file.url, "utf8") }));

/** The tell scan of copy.md, on whole words. */
const TELLS =
  /(?<!\p{L})(good ear|great|well done|nice|awesome|amazing|perfect|let['’]s|here['’]s|simply|actually|really|basically|essentially|easy|tricky|master|unlock|journey|dive in|most learners|press enter|click)(?!\p{L})/iu;

/** Officialese, praise and the calques reviews caught, in Ukrainian and Russian. */
const OFFICIALESE =
  /(?<![\p{L}’'])(явля(?:ється|ються|ется|ются)|здійсн\p{L}*|осуществ\p{L}*|данн(?:ий|а|е|і|ый|ая|ое|ые|ого|ой|ом|ых|ым|ыми)|в рамках|у рамках|на протязі|слідуюч\p{L}*|приймати участь|молод(?:ець|ец)|чудово|отлично|хороший слух|добрий слух|змінюється з особою|утворюються за чергуванням|образуются по чередованию|про це урок|об этом урок)(?!\p{L})/iu;

const allowed = (rule: string, text: string) =>
  ALLOWED_COPY.some(
    (each) => each.rule === rule && text.toLowerCase().includes(each.text.toLowerCase()),
  );

/** Where a message sits: the first line holding its first words. */
function lineOf(source: string, id: string): number {
  const words =
    id
      .split(/<\/?\d+\/?>|\{[^}]*\}/)
      .find((part) => part.trim().length > 3)
      ?.trim() ?? id;
  const probe = words.split(/\s+/).slice(0, 4).join(" ");
  const at = source.split("\n").findIndex((line) => line.includes(probe));
  return at + 1;
}

describe.each(FILES)("$path", ({ path, source, part, catalog }) => {
  const own = (entries: readonly Entry[]) => messagesIn(source, entries);
  const at = (id: string) => {
    const line = lineOf(source, id);
    return line ? `${path}:${line}` : path;
  };

  it("passes the tell scan", () => {
    const problems = own(catalog.en).flatMap((entry) => {
      const hit = entry.id.match(TELLS)?.[0];
      return hit && !allowed("tell", entry.id)
        ? [
            `${at(entry.id)}: “${hit}” in “${entry.id}”. Rewrite the line to teach, show or say what to do (copy.md#machine-tells), or, if it must stay, add it to apps/site/src/lib/learn/checks/allowed-copy.ts with the reason.`,
          ]
        : [];
    });
    expect(problems, `The tell scan (copy.md#the-tell-scan)\n\n${problems.join("\n\n")}\n`).toEqual(
      [],
    );
  });

  it("uses curly apostrophes", () => {
    const problems = own(catalog.en).flatMap((entry) =>
      entry.id.includes("'")
        ? [
            `${at(entry.id)}: “${entry.id}” has a straight apostrophe. Fix: use ’ (don’t, you’re), then run pnpm i18n:extract; the uk and ru lines stay as they are.`,
          ]
        : [],
    );
    expect(problems, `Curly apostrophes (copy.md, #1239)\n\n${problems.join("\n\n")}\n`).toEqual(
      [],
    );
  });

  it.each(["uk", "ru"] as const)("reads plainly in %s", (locale) => {
    const ids = new Set(own(catalog.en).map((entry) => `${entry.context ?? ""}\u0004${entry.id}`));
    const problems = catalog[locale]
      .filter((entry) => ids.has(`${entry.context ?? ""}\u0004${entry.id}`))
      .flatMap((entry) => {
        const hit = entry.text.match(OFFICIALESE)?.[0];
        const straight = locale === "uk" && /\p{L}'\p{L}/u.test(entry.text);
        if (hit && !allowed(locale, entry.text))
          return [
            `apps/site/src/locales/learn/${part}/${locale}.po: “${hit}” in “${entry.text}” (for “${entry.id}”). Write the plain verb or the natural phrase (copy.md#ukrainian-and-russian), or add it to allowed-copy.ts with the reason.`,
          ];
        if (straight)
          return [
            `apps/site/src/locales/learn/${part}/uk.po: “${entry.text}” has a straight apostrophe. Fix: use ’ (з’являється).`,
          ];
        return [];
      });
    expect(
      problems,
      `Officialese and calques (copy.md#ukrainian-and-russian)\n\n${problems.join("\n\n")}\n`,
    ).toEqual([]);
  });

  it("finds a built lesson by slug and a planned one by an et that exists", () => {
    const problems = source.split("\n").flatMap((line, i) =>
      [...line.matchAll(/\.et\s*===\s*"([^"]+)"/g)].flatMap(([, et]) => {
        const lesson = LESSONS.find((each) => each.et === et);
        if (!lesson)
          return [
            `${path}:${i + 1}: no lesson in catalogue.ts has et "${et}", so the page says “lesson ” with no number. Fix: use the et the catalogue holds.`,
          ];
        if (lesson.slug)
          return [
            `${path}:${i + 1}: lesson ${lesson.n} is built, so find it with lessonBySlug("${lesson.slug}"), not by its et "${et}", which can change.`,
          ];
        return [];
      }),
    );
    expect(
      problems,
      `Lessons by slug (SKILL.md step 3, #1213, #1224)\n\n${problems.join("\n\n")}\n`,
    ).toEqual([]);
  });
});
