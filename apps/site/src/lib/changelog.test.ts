import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { CHANGELOG_FIGURES } from "./changelog-figures";
import { CHANGELOG_FOLDER } from "./changelog-paths";
import { locales } from "./routes";

const sources = import.meta.glob<string>("../content/changelog/*/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});
const images = new Set(Object.keys(import.meta.glob("../content/changelog/*/*.webp")));

interface Front {
  title?: string;
  summary?: string;
  figure?: string;
  screenshot?: { frame?: string; alt?: string; capture?: unknown };
}

const front = (source: string): Front => parse(source.split(/^---$/m)[1] ?? "") ?? {};
const folders = [...new Set(Object.keys(sources).map((file) => file.split("/").at(-2) ?? ""))];
const read = (folder: string, locale: string) => {
  const source = sources[`../content/changelog/${folder}/${locale}.md`];
  return source === undefined ? undefined : { source, front: front(source) };
};

describe("changelog updates", () => {
  it("are folders named YYYY-MM-DD-slug with distinct slugs", () => {
    expect(folders.filter((folder) => !CHANGELOG_FOLDER.test(folder))).toEqual([]);
    const slugs = folders.map((folder) => CHANGELOG_FOLDER.exec(folder)?.[2]);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("are written in every language", () => {
    const missing = folders.flatMap((folder) =>
      locales.filter((locale) => !read(folder, locale)).map((locale) => `${folder}/${locale}.md`),
    );
    expect(missing).toEqual([]);
  });

  it("show the same figure or screenshot frame in every language, with its words translated", () => {
    for (const folder of folders) {
      const en = read(folder, "en")?.front ?? {};
      if (en.figure) expect(CHANGELOG_FIGURES).toContain(en.figure);
      for (const locale of locales) {
        const { title, summary, figure, screenshot } = read(folder, locale)?.front ?? {};
        expect(title, `${folder}/${locale}`).toBeTruthy();
        expect(summary, `${folder}/${locale}`).toBeTruthy();
        expect(figure, `${folder}/${locale}`).toBe(en.figure);
        expect(screenshot?.frame, `${folder}/${locale}`).toBe(en.screenshot?.frame);
        if (screenshot) expect(screenshot.alt, `${folder}/${locale}`).toBeTruthy();
        if (locale !== "en") expect(screenshot?.capture, `${folder}/${locale}`).toBeUndefined();
      }
    }
  });

  it("have a light and a dark screenshot in every language when they show one", () => {
    const missing = folders.flatMap((folder) =>
      read(folder, "en")?.front.screenshot
        ? locales.flatMap((locale) =>
            ["light", "dark"]
              .map((theme) => `../content/changelog/${folder}/${locale}-${theme}.webp`)
              .filter((file) => !images.has(file)),
          )
        : [],
    );
    expect(missing).toEqual([]);
  });

  it("keep their structure in every language", () => {
    const shape = (source: string) =>
      (source.split(/^---$/m)[2] ?? "")
        .split("\n")
        .map((line) => /^(#{2,3} |- |\d+\. )/.exec(line)?.[1]?.trim())
        .filter(Boolean)
        .join(" ");
    for (const folder of folders) {
      const en = shape(read(folder, "en")?.source ?? "");
      for (const locale of locales) {
        expect(shape(read(folder, locale)?.source ?? ""), `${folder}/${locale}`).toBe(en);
      }
    }
  });
});
