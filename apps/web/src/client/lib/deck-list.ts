import { type StateKey, stateKey } from "../components/state-mark";
import type { Card, CardState } from "./api";

export type DeckRow = { card: Card; state: CardState | null };

export type DeckSort = "lesson" | "due" | "added" | "az";

/** Where a card stands in its schedule, as the When it's back headings name it. */
export type DueBucket = "now" | "week" | "later" | "new";

export interface DeckFilters {
  states: StateKey[];
  due: "today" | "week" | null;
  /** Lesson names from each card's `source`; "" is a card with no lesson. */
  lessons: string[];
}

export const noFilters: DeckFilters = { states: [], due: null, lessons: [] };

export type DeckGroup =
  | { kind: "all"; key: string; rows: DeckRow[] }
  | { kind: "lesson"; key: string; lesson: string; rows: DeckRow[] }
  | { kind: "due"; key: string; bucket: DueBucket; rows: DeckRow[] }
  | { kind: "day"; key: string; day: Date; rows: DeckRow[] };

const DAY = 86_400_000;
const WEEK = 7 * DAY;

export const rowState = (row: DeckRow): StateKey => stateKey(row.state?.state);

const createdAt = (row: DeckRow) => new Date(row.card.createdAt).getTime();
const dueAt = (row: DeckRow) => (row.state ? new Date(row.state.due).getTime() : Number.NaN);

function endOfDay(now: number): number {
  const d = new Date(now);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime();
}

function startOfDay(at: number): Date {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function dueBucket(row: DeckRow, now: number): DueBucket {
  if (rowState(row) === "new") return "new";
  const due = dueAt(row);
  if (due <= now) return "now";
  return due - now <= WEEK ? "week" : "later";
}

export function activeFilterCount(filters: DeckFilters): number {
  return filters.states.length + (filters.due ? 1 : 0) + filters.lessons.length;
}

/** Lessons in the order the Lesson sort shows them: newest first, then cards with no lesson. */
export function lessonsOf(rows: DeckRow[]): string[] {
  const newest = new Map<string, number>();
  for (const row of rows) {
    const key = row.card.source ?? "";
    newest.set(key, Math.max(newest.get(key) ?? 0, createdAt(row)));
  }
  return [...newest.entries()]
    .sort(([a, at], [b, bt]) => (a === "" ? 1 : b === "" ? -1 : bt - at))
    .map(([key]) => key);
}

export function filterRows(
  rows: DeckRow[],
  filters: DeckFilters,
  query: string,
  now: number,
): DeckRow[] {
  const needle = query.trim().toLocaleLowerCase();
  const limit = filters.due === "today" ? endOfDay(now) : now + WEEK;
  return rows.filter((row) => {
    if (
      needle &&
      !row.card.term.toLocaleLowerCase().includes(needle) &&
      !row.card.meaning?.toLocaleLowerCase().includes(needle)
    )
      return false;
    if (filters.states.length && !filters.states.includes(rowState(row))) return false;
    if (filters.lessons.length && !filters.lessons.includes(row.card.source ?? "")) return false;
    if (filters.due) {
      if (rowState(row) === "new" || !(dueAt(row) < limit)) return false;
    }
    return true;
  });
}

export function groupRows(
  rows: DeckRow[],
  sort: DeckSort,
  now: number,
  locale: string,
): DeckGroup[] {
  if (sort === "az") {
    const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
    const sorted = [...rows].sort((a, b) => collator.compare(a.card.term, b.card.term));
    return sorted.length ? [{ kind: "all", key: "all", rows: sorted }] : [];
  }

  if (sort === "due") {
    const order: DueBucket[] = ["now", "week", "later", "new"];
    const byBucket = new Map<DueBucket, DeckRow[]>();
    for (const row of rows) {
      const bucket = dueBucket(row, now);
      byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), row]);
    }
    return order.flatMap((bucket) => {
      const group = byBucket.get(bucket);
      if (!group) return [];
      const sorted = [...group].sort((a, b) =>
        bucket === "new" ? createdAt(a) - createdAt(b) : dueAt(a) - dueAt(b),
      );
      return [{ kind: "due" as const, key: bucket, bucket, rows: sorted }];
    });
  }

  if (sort === "added") {
    const byDay = new Map<number, DeckRow[]>();
    for (const row of [...rows].sort((a, b) => createdAt(b) - createdAt(a))) {
      const day = startOfDay(createdAt(row)).getTime();
      byDay.set(day, [...(byDay.get(day) ?? []), row]);
    }
    return [...byDay.entries()].map(([day, group]) => ({
      kind: "day" as const,
      key: String(day),
      day: new Date(day),
      rows: group,
    }));
  }

  return lessonsOf(rows).map((lesson) => ({
    kind: "lesson" as const,
    key: `lesson:${lesson}`,
    lesson,
    rows: rows.filter((row) => (row.card.source ?? "") === lesson),
  }));
}

/** A term that lists its forms, "õppima · õppida · õpin", as the word and the forms after it. */
export function splitForms(term: string): { word: string; forms: string | null } {
  const at = term.indexOf(" · ");
  if (at <= 0) return { word: term, forms: null };
  return { word: term.slice(0, at), forms: term.slice(at + 3) };
}
