import { type StateKey, stateKey } from "../components/state-mark";
import type { Card, CardState, Section } from "./api";

export type DeckRow = { card: Card; state: CardState | null };

export type DeckSort = "section" | "due" | "added" | "az";

/** Where a card stands in its schedule, as the When it's back headings name it. */
export type DueBucket = "now" | "week" | "later" | "new";

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

/** The section a card sorts under: its own when that section is listed, otherwise none. */
export const sectionOf = (row: DeckRow, sections: readonly Section[]): string =>
  row.card.sectionId && sections.some((s) => s.id === row.card.sectionId) ? row.card.sectionId : "";

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
