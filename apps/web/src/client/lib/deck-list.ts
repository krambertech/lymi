import { type StateKey, stateKey } from "../components/state-mark";
import type { Card, CardState, Section } from "./api";

export type DeckRow = { card: Card; state: CardState | null };

export type DeckSort = "section" | "due" | "added" | "az";

/** Where a card stands in its schedule, as the When it's back headings name it. */
export type DueBucket = "now" | "week" | "later" | "new";

export interface DeckFilters {
  states: StateKey[];
  due: "today" | "week" | null;
  /** Section ids; "" is a card with no section. */
  sections: string[];
}

export const noFilters: DeckFilters = { states: [], due: null, sections: [] };

export type DeckGroup =
  | { kind: "all"; key: string; rows: DeckRow[] }
  | { kind: "section"; key: string; section: Section | null; rows: DeckRow[] }
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

/** In review today: a card with a schedule that comes due before the day ends. */
export const dueToday = (row: DeckRow, now: number): boolean =>
  !!row.state && dueAt(row) < endOfDay(now);

export function activeFilterCount(filters: DeckFilters): number {
  return filters.states.length + (filters.due ? 1 : 0) + filters.sections.length;
}

/** The section a card sorts under: its own when that section is listed, otherwise none. */
export const sectionOf = (row: DeckRow, sections: readonly Section[]): string =>
  row.card.sectionId && sections.some((s) => s.id === row.card.sectionId) ? row.card.sectionId : "";

export function filterRows(
  rows: DeckRow[],
  filters: DeckFilters,
  query: string,
  now: number,
  sections: readonly Section[] = [],
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
    if (filters.sections.length && !filters.sections.includes(sectionOf(row, sections)))
      return false;
    if (filters.due) {
      if (rowState(row) === "new" || !(dueAt(row) < limit)) return false;
    }
    return true;
  });
}

/**
 * The list's groups. The Section sort shows every section in order, each with its cards oldest
 * first as a lesson was added, then the cards without one; `withEmpty` keeps a section with no
 * cards, so the owner has somewhere to drop them.
 */
export function groupRows(
  rows: DeckRow[],
  sort: DeckSort,
  now: number,
  locale: string,
  sections: readonly Section[] = [],
  withEmpty = false,
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

  const bySection = new Map<string, DeckRow[]>();
  for (const row of [...rows].sort((a, b) => createdAt(a) - createdAt(b))) {
    const key = sectionOf(row, sections);
    bySection.set(key, [...(bySection.get(key) ?? []), row]);
  }
  const groups: DeckGroup[] = sections.flatMap((section) => {
    const group = bySection.get(section.id) ?? [];
    if (group.length === 0 && !withEmpty) return [];
    return [{ kind: "section" as const, key: `section:${section.id}`, section, rows: group }];
  });
  const loose = bySection.get("") ?? [];
  if (loose.length > 0) {
    // A deck without sections is one list, newest first, as it was before sections existed.
    if (sections.length === 0) {
      return [{ kind: "all", key: "all", rows: [...loose].reverse() }];
    }
    groups.push({ kind: "section", key: "section:", section: null, rows: loose });
  }
  return groups;
}

/** A term that lists its forms, "õppima · õppida · õpin", as the word and the forms after it. */
export function splitForms(term: string): { word: string; forms: string | null } {
  const at = term.indexOf(" · ");
  if (at <= 0) return { word: term, forms: null };
  return { word: term.slice(0, at), forms: term.slice(at + 3) };
}
