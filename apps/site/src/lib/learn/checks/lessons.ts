import { readdirSync, readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { vi } from "vitest";
import LearnLessonPage, { LESSON_VIEWS } from "../../../components/islands/LearnLessonPage";
import { type Element, parse } from "./html";
import { type Recording, recording, resetRecording } from "./record";

export const LOCALES = ["en", "uk", "ru"] as const;
export type CheckLocale = (typeof LOCALES)[number];
export type Slug = keyof typeof LESSON_VIEWS;
export const SLUGS = Object.keys(LESSON_VIEWS) as Slug[];

const LESSON_DIR = new URL("../../../components/learn/lessons/", import.meta.url);
/** Repository-relative, so a failure names a path an editor opens. */
export const LESSON_PATH = "apps/site/src/components/learn/lessons";

/** Each lesson file by the `SLUG` it declares. */
export const LESSON_FILES: Readonly<Record<string, { file: string; source: string }>> =
  Object.fromEntries(
    readdirSync(LESSON_DIR)
      .filter((name) => name.endsWith(".tsx"))
      .flatMap((name) => {
        const source = readFileSync(new URL(name, LESSON_DIR), "utf8");
        const slug = source.match(/^const SLUG = "([^"]+)"/m)?.[1];
        return slug ? [[slug, { file: `${LESSON_PATH}/${name}`, source }]] : [];
      }),
  );

/** `file:line` of the first line holding `needle` in a lesson's file, or the file alone. */
export function where(slug: string, ...needles: readonly string[]): string {
  const lesson = LESSON_FILES[slug];
  if (!lesson) return `the lesson ${slug}`;
  const lines = lesson.source.split("\n");
  for (const needle of needles) {
    if (!needle) continue;
    const at = lines.findIndex((line) => line.includes(needle));
    if (at >= 0) return `${lesson.file}:${at + 1}`;
  }
  return lesson.file;
}

const KIT_DIR = new URL("../../../components/learn/", import.meta.url);
const KIT_FILES = readdirSync(KIT_DIR)
  .filter((name) => name.endsWith(".tsx"))
  .map((name) => ({
    file: `apps/site/src/components/learn/${name}`,
    source: readFileSync(new URL(name, KIT_DIR), "utf8"),
  }));

/**
 * Where an aria-label comes from: the line whose `t\`…\`` starts the way the label does, in the
 * lesson's own file first, then in the kit.
 */
export function labelSource(slug: string, label: string): string {
  const lesson = LESSON_FILES[slug];
  const files = [...(lesson ? [lesson] : []), ...KIT_FILES];
  let best: { at: string; length: number } | null = null;
  for (const { file, source } of files)
    source.split("\n").forEach((line, i) => {
      for (const match of line.matchAll(/aria-label=\{[^}]*?t`([^`$]*)/g)) {
        const prefix = match[1] ?? "";
        if (prefix && label.startsWith(prefix) && prefix.length > (best?.length ?? 0))
          best = { at: `${file}:${i + 1}`, length: prefix.length };
      }
    });
  return (best as { at: string } | null)?.at ?? where(slug, "aria-label={label}", "aria-label");
}

export interface Rendered {
  slug: Slug;
  locale: CheckLocale;
  html: string;
  tree: Element;
  recording: Recording;
}

/**
 * Renders a lesson page the way Astro does on the server. `random` and `now` pin `Math.random` and
 * the clock, so two renders with different values show whether anything random or dated reaches
 * the server's HTML.
 */
export function renderLesson(
  slug: Slug,
  locale: CheckLocale,
  { random = 0.5, now = new Date("2026-11-23T10:00:00Z") }: { random?: number; now?: Date } = {},
): Rendered {
  resetRecording();
  vi.useFakeTimers({ now, toFake: ["Date"] });
  const spy = vi.spyOn(Math, "random").mockReturnValue(random);
  try {
    const html = renderToString(createElement(LearnLessonPage, { locale, slug }));
    return {
      slug,
      locale,
      html,
      tree: parse(html, locale),
      recording: {
        parts: [...recording.parts],
        words: [...recording.words],
        clips: [...recording.clips],
        view: recording.view,
      },
    };
  } finally {
    spy.mockRestore();
    vi.useRealTimers();
  }
}

const cache = new Map<string, Rendered>();

/** The lesson rendered once per locale with the default pins. */
export function rendered(slug: Slug, locale: CheckLocale): Rendered {
  const key = `${slug}/${locale}`;
  let page = cache.get(key);
  if (!page) {
    page = renderLesson(slug, locale);
    cache.set(key, page);
  }
  return page;
}
