import { stripReadings, TAG_LIMITS, tagKey } from "@lymi/core";
import type { Card, CardState, Section } from "./api";

/** How the learner reads an FSRS state: Review is Known, and Relearning is Learning again. */
export type StateKey = "new" | "learning" | "known";

export function stateKey(state: number | null | undefined): StateKey {
  if (state === 2) return "known";
  if (state === 1 || state === 3) return "learning";
  return "new";
}

export type DeckRow = { card: Card; state: CardState | null };

export type DeckSort = "section" | "due" | "added" | "az";

/** Where a card stands in its schedule, as the When it's back headings name it. */
export type DueBucket = "now" | "week" | "later" | "new";

export interface DeckFilters {
  states: StateKey[];
  due: "today" | "week" | null;
  /** Section ids; "" is a card with no section. */
  sections: string[];
  /** Tag keys, from `tagKey`; a card carrying any of them matches. */
  tags: string[];
}

export const noFilters: DeckFilters = { states: [], due: null, sections: [], tags: [] };

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

/**
 * What Review takes from chosen cards, as the server counts them: each started card not reviewed
 * today, soonest due first, and whether it is due before the day ends.
 */
export function chosenReview(
  rows: readonly DeckRow[],
  chosen: ReadonlySet<string>,
  now: number,
): { id: string; due: boolean }[] {
  const dayStart = startOfDay(now).getTime();
  const dayEnd = endOfDay(now);
  return rows
    .filter(
      (row) =>
        chosen.has(row.card.id) &&
        rowState(row) !== "new" &&
        !(row.state?.lastReview && new Date(row.state.lastReview).getTime() >= dayStart),
    )
    .map((row) => ({ id: row.card.id, at: dueAt(row) || 0 }))
    .sort((a, b) => a.at - b.at)
    .map(({ id, at }) => ({ id, due: at < dayEnd }));
}

export function activeFilterCount(filters: DeckFilters): number {
  return (
    filters.states.length + (filters.due ? 1 : 0) + filters.sections.length + filters.tags.length
  );
}

/** Filters without the tags and sections the deck no longer has, and the same filters when it still has them all. */
export function liveFilters(
  filters: DeckFilters,
  tagKeys: ReadonlySet<string>,
  sectionIds: ReadonlySet<string>,
): DeckFilters {
  const tags = filters.tags.filter((key) => tagKeys.has(key));
  // "" is No section, which every deck has.
  const sections = filters.sections.filter((id) => id === "" || sectionIds.has(id));
  return tags.length === filters.tags.length && sections.length === filters.sections.length
    ? filters
    : { ...filters, tags, sections };
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
    if (filters.tags.length && !row.card.tags.some((tag) => filters.tags.includes(tagKey(tag))))
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

/** The tags on these cards, most used first, each under its key with the spelling seen first. */
export function deckTags(rows: readonly DeckRow[]): { key: string; name: string; cards: number }[] {
  const byKey = new Map<string, { key: string; name: string; cards: number }>();
  for (const row of rows)
    for (const name of row.card.tags) {
      const key = tagKey(name);
      const seen = byKey.get(key);
      if (seen) seen.cards += 1;
      else byKey.set(key, { key, name, cards: 1 });
    }
  return [...byKey.values()].sort((a, b) => b.cards - a.cards || a.name.localeCompare(b.name));
}

/**
 * A card's tags with some taken off and some put on, matched by key. An added tag goes last, and
 * one past the twenty a card holds is left off; `full` says so.
 */
export function retag(
  tags: readonly string[],
  add: readonly string[],
  remove: readonly string[],
): { tags: string[]; full: boolean } {
  const gone = new Set(remove.map(tagKey));
  const next = tags.filter((tag) => !gone.has(tagKey(tag)));
  const keys = new Set(next.map(tagKey));
  let full = false;
  for (const tag of add) {
    const key = tagKey(tag);
    if (keys.has(key) || gone.has(key)) continue;
    if (next.length >= TAG_LIMITS.count) {
      full = true;
      continue;
    }
    keys.add(key);
    next.push(tag);
  }
  return { tags: next, full };
}

/** Where a tag ends up on chosen cards: on every one, off every one, or left as it is. */
export type TagChoice = "all" | "none" | "mixed";

export interface TagPickerInput {
  /** The chosen cards' tags, each list one card's. */
  cards: readonly (readonly string[])[];
  /** Tags made in the picker, in the order they were made, which is the order they go on. */
  created: readonly string[];
  /** Tags in use elsewhere, offered after the ones the cards carry. */
  suggestions: readonly { name: string }[];
  /** The learner's ticks so far, by tag key. */
  choices: ReadonlyMap<string, TagChoice>;
  query: string;
}

/**
 * Tags… for chosen cards, as the web's dialog and the phone's sheet both draw it: the tags the
 * cards carry, most carried first, then new and suggested ones, each ticked on every card, on some
 * or on none, and the change a save makes.
 */
export function tagPicker({ cards, created, suggestions, choices, query }: TagPickerInput) {
  const total = cards.length;
  const carried = new Map<string, { name: string; count: number }>();
  for (const tags of cards)
    for (const name of tags) {
      const seen = carried.get(tagKey(name));
      if (seen) seen.count += 1;
      else carried.set(tagKey(name), { name, count: 1 });
    }
  const offered = [
    ...[...carried.values()].sort((a, b) => b.count - a.count).map((tag) => tag.name),
    ...created,
    ...suggestions.map((tag) => tag.name),
  ].filter((name, i, all) => all.findIndex((other) => tagKey(other) === tagKey(name)) === i);
  const typed = query.trim().slice(0, TAG_LIMITS.length);
  const needle = tagKey(typed);
  // The name typed first, then names that start with it, then any that hold it, each kept in order.
  const rank = (name: string) => {
    const key = tagKey(name);
    return key === needle ? 0 : key.startsWith(needle) ? 1 : key.includes(needle) ? 2 : 3;
  };
  const shown = typed
    ? offered.filter((name) => rank(name) < 3).sort((a, b) => rank(a) - rank(b))
    : offered;
  const fresh = !!typed && !offered.some((name) => tagKey(name) === needle);
  /** What Return takes: the tag typed, or the one tag the letters found. */
  const pick =
    shown[0] !== undefined && (rank(shown[0]) === 0 || shown.length === 1) ? shown[0] : undefined;

  const count = (name: string) => carried.get(tagKey(name))?.count ?? 0;
  const start = (name: string): TagChoice => {
    const n = count(name);
    return n === 0 ? "none" : n === total ? "all" : "mixed";
  };
  const choiceOf = (name: string) => choices.get(tagKey(name)) ?? start(name);
  /** A tag on some cards goes on all of them first, then off all, then back as it was. */
  const next = (name: string): TagChoice => {
    const now = choiceOf(name);
    if (now === "all") return "none";
    if (now === "mixed") return "all";
    return start(name) === "mixed" ? "mixed" : "all";
  };
  /** How many of the chosen cards carry the tag once saved. */
  const after = (name: string) => {
    const choice = choiceOf(name);
    return choice === "all" ? total : choice === "none" ? 0 : count(name);
  };
  const add = offered.filter((name) => choiceOf(name) === "all" && start(name) !== "all");
  const remove = offered.filter((name) => choiceOf(name) === "none" && start(name) !== "none");
  return { total, shown, typed, fresh, pick, choiceOf, next, after, change: { add, remove } };
}

/**
 * The edits that make a tag change on rows, leaving out a card it would not change; `undo` puts
 * each card's tags back, and `full` counts cards already holding twenty, which a new tag skips.
 */
export function tagEdits(
  rows: readonly DeckRow[],
  change: { add: readonly string[]; remove: readonly string[] },
) {
  const edits: { cardId: string; tags: string[] }[] = [];
  const undo: { cardId: string; tags: string[] }[] = [];
  let full = 0;
  for (const row of rows) {
    const next = retag(row.card.tags, change.add, change.remove);
    if (next.full) full += 1;
    if (next.tags.join("\n") === row.card.tags.join("\n")) continue;
    edits.push({ cardId: row.card.id, tags: next.tags });
    undo.push({ cardId: row.card.id, tags: [...row.card.tags] });
  }
  return { edits, undo, full };
}

/** A term that lists its forms, "õppima · õppida · õpin", as the word and the forms after it. */
export function splitForms(term: string): { word: string; forms: string | null } {
  const at = term.indexOf(" · ");
  if (at <= 0) return { word: term, forms: null };
  return { word: term.slice(0, at), forms: term.slice(at + 3) };
}

/** A deck's word, meaning, status and next review as CSV, with a BOM so spreadsheets read it as UTF-8. */
export function deckCsv(rows: readonly DeckRow[]): string {
  const esc = (v: string | null | undefined) => `"${(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    [
      "term",
      "meaning",
      "pronunciation",
      "example",
      "notes",
      "language",
      "source",
      "state",
      "due",
    ].join(","),
    ...rows.map(({ card, state }) =>
      [
        esc(card.term),
        esc(card.meaning),
        esc(card.pronunciation),
        esc(card.example && stripReadings(card.example)),
        esc(card.notes),
        esc(card.language),
        esc(card.source),
        String(state?.state ?? 0),
        state ? new Date(state.due).toISOString() : "",
      ].join(","),
    ),
  ];
  return `﻿${lines.join("\n")}`;
}

/** The name a deck's CSV saves as: "Verbi irregolari" is `verbi-irregolari.csv`. */
export function deckCsvName(deckName: string): string {
  return `${deckName.replace(/[^\p{L}\p{N}]+/gu, "-").toLowerCase()}.csv`;
}
