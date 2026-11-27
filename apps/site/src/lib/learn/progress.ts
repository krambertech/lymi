import { browserStore, isRecord } from "./browser-store";

/**
 * A visitor's progress through the Estonian lessons, kept in this browser only: the lessons they
 * started or finished, and the sections of each they have done. No account is needed.
 */
export interface Progress {
  lessons: Record<string, { state: "started" | "done" }>;
  sections: Record<string, readonly string[]>;
}

const EMPTY: Progress = { lessons: {}, sections: {} };

/** Keeps only what has the right shape, so a hand-edited or older value can't crash a lesson. */
export function cleanProgress(raw: Record<string, unknown>): Progress {
  const lessons: Progress["lessons"] = {};
  for (const [slug, entry] of Object.entries(isRecord(raw.lessons) ? raw.lessons : {}))
    if (isRecord(entry) && (entry.state === "started" || entry.state === "done"))
      lessons[slug] = { state: entry.state };
  const sections: Record<string, readonly string[]> = {};
  for (const [slug, list] of Object.entries(isRecord(raw.sections) ? raw.sections : {}))
    if (Array.isArray(list)) sections[slug] = list.filter((id) => typeof id === "string");
  return { lessons, sections };
}

export const progressStore = browserStore<Progress>({
  key: "lymi-estonian-lessons",
  version: 1,
  empty: EMPTY,
  clean: cleanProgress,
});

/** Marks a lesson started, unless it is already started or done. */
export function startLesson(slug: string, storage?: Storage | null): void {
  progressStore.update(
    (progress) =>
      progress.lessons[slug]
        ? progress
        : { ...progress, lessons: { ...progress.lessons, [slug]: { state: "started" } } },
    storage,
  );
}

/** Records a finished section; the last of a lesson's sections finishes the lesson. */
export function finishSection(
  slug: string,
  section: string,
  allSections: readonly string[],
  storage?: Storage | null,
): { lessonFinished: boolean } {
  let lessonFinished = false;
  progressStore.update((progress) => {
    const done = progress.sections[slug] ?? [];
    const sections = done.includes(section) ? done : [...done, section];
    lessonFinished =
      progress.lessons[slug]?.state !== "done" && allSections.every((s) => sections.includes(s));
    if (sections === done && !lessonFinished) return progress;
    return {
      lessons: lessonFinished
        ? { ...progress.lessons, [slug]: { state: "done" } }
        : progress.lessons,
      sections: { ...progress.sections, [slug]: sections },
    };
  }, storage);
  return { lessonFinished };
}

/** The visitor's progress; empty while the page renders on the server. */
export const useProgress = progressStore.use;
