import { useSyncExternalStore } from "react";

/**
 * A visitor's progress through the Estonian lessons, kept in this browser only: the lessons they
 * started or finished, and the sections of each they have done. No account is needed.
 */
export interface Progress {
  lessons: Record<string, { state: "started" | "done" }>;
  sections: Record<string, readonly string[]>;
}

const KEY = "lymi-estonian-lessons";
const EMPTY: Progress = { lessons: {}, sections: {} };

function storage(): Storage | null {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

/** The stored format; a value written in another format reads as no progress. */
const VERSION = 1;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Keeps only what has the right shape, so a hand-edited or older value can't crash a lesson. */
export function cleanProgress(raw: unknown): Progress {
  if (!isRecord(raw) || raw.v !== VERSION) return EMPTY;
  const lessons: Progress["lessons"] = {};
  for (const [slug, entry] of Object.entries(isRecord(raw.lessons) ? raw.lessons : {}))
    if (isRecord(entry) && (entry.state === "started" || entry.state === "done"))
      lessons[slug] = { state: entry.state };
  const sections: Record<string, readonly string[]> = {};
  for (const [slug, list] of Object.entries(isRecord(raw.sections) ? raw.sections : {}))
    if (Array.isArray(list)) sections[slug] = list.filter((id) => typeof id === "string");
  return { lessons, sections };
}

export function readProgress(store: Storage | null = storage()): Progress {
  try {
    return cleanProgress(JSON.parse(store?.getItem(KEY) ?? "null"));
  } catch {
    return EMPTY;
  }
}

const listeners = new Set<() => void>();
let snapshot: Progress | null = null;
/** A write that failed (a private window, full storage) means storage no longer holds this page's progress. */
let writeFailed = false;

function write(next: Progress, store: Storage | null = storage()): void {
  try {
    store?.setItem(KEY, JSON.stringify({ v: VERSION, ...next }));
  } catch {
    writeFailed = true;
    // A private window or full storage keeps progress for this page only.
  }
  snapshot = next;
  for (const listener of listeners) listener();
}

const current = () => (snapshot ??= readProgress());

/** Marks a lesson started, unless it is already started or done. */
export function startLesson(slug: string, store?: Storage | null): void {
  // Read storage again, so another tab's progress isn't overwritten; without storage, keep this page's.
  const progress =
    store !== undefined
      ? readProgress(store)
      : storage() && !writeFailed
        ? readProgress()
        : current();
  if (progress.lessons[slug]) return;
  write({ ...progress, lessons: { ...progress.lessons, [slug]: { state: "started" } } }, store);
}

/** Records a finished section; the last of a lesson's sections finishes the lesson. */
export function finishSection(
  slug: string,
  section: string,
  allSections: readonly string[],
  store?: Storage | null,
): { lessonFinished: boolean } {
  // Read storage again, so another tab's progress isn't overwritten; without storage, keep this page's.
  const progress =
    store !== undefined
      ? readProgress(store)
      : storage() && !writeFailed
        ? readProgress()
        : current();
  const done = progress.sections[slug] ?? [];
  if (done.includes(section)) return { lessonFinished: false };
  const sections = [...done, section];
  const finishes =
    progress.lessons[slug]?.state !== "done" && allSections.every((s) => sections.includes(s));
  write(
    {
      lessons: finishes ? { ...progress.lessons, [slug]: { state: "done" } } : progress.lessons,
      sections: { ...progress.sections, [slug]: sections },
    },
    store,
  );
  return { lessonFinished: finishes };
}

export function clearProgress(store?: Storage | null): void {
  write(EMPTY, store);
}

const fromOtherTab = (event: StorageEvent) => {
  if (event.key !== KEY) return;
  snapshot = readProgress();
  for (const listener of listeners) listener();
};

function subscribe(listener: () => void): () => void {
  if (listeners.size === 0) addEventListener("storage", fromOtherTab);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) removeEventListener("storage", fromOtherTab);
  };
}

/** The visitor's progress; empty while the page renders on the server. */
export function useProgress(): Progress {
  return useSyncExternalStore(subscribe, current, () => EMPTY);
}
