import type { I18n, MessageDescriptor } from "@lingui/core";
import { msg } from "@lingui/core/macro";
import {
  type CardFilter,
  type DateComparator,
  deserializeState,
  type FieldSource,
  SLIPPING_LAPSES,
  SLIPPING_REVIEWS,
} from "@lymi/core";
import { type StateKey, stateMarks } from "../components/state-mark";
import type { Card, Section } from "./api";
import { type DeckRow, rowState, sectionOf } from "./deck-list";
import { languageName } from "./language-name";

/*
 * The deck list's filter is a list of conditions, one per field, rather than a fixed shape: a
 * new filter is one more entry in `filterFields` and nothing else changes. Fields combine with
 * AND and a field's values with OR, the same rule the API's card search applies, so a set of
 * conditions can be sent to `POST /api/cards/search` through `toCardFilter` where the server
 * can express it.
 */

export type FilterKey =
  | "state"
  | "due"
  | "section"
  | "tags"
  | "language"
  | "source"
  | "written"
  | "missing"
  | "added"
  | "addedBy"
  | "reviewed"
  | "forgotten";

/** One field narrowed to some of its values. */
export interface FilterCondition {
  key: FilterKey;
  values: string[];
}

export type FilterSet = FilterCondition[];

export const noFilters: FilterSet = [];

export interface FilterOption {
  value: string;
  label: string;
  /** A state's mark, drawn in its own colour beside the label. */
  state?: StateKey | undefined;
}

/** What a field needs to list its values and test a row. */
export interface FilterContext {
  now: number;
  sections: readonly Section[];
  /** Every card of the deck, so a field can offer only the values that occur. */
  rows: readonly DeckRow[];
  i18n: I18n;
}

export interface FilterField {
  key: FilterKey;
  label: MessageDescriptor;
  /** `any`: several values may be on and a row matches one of them. `one`: a radio set. */
  pick: "any" | "one";
  /** The values on offer. A field with none is left out of the menu. */
  options: (ctx: FilterContext) => FilterOption[];
  matches: (row: DeckRow, values: readonly string[], ctx: FilterContext) => boolean;
  /**
   * The same condition for the API's card search, or null when the server has no way to say it.
   * Times are sent as timestamps, because the client's periods run by the local calendar day.
   */
  toServer: (values: readonly string[], ctx: FilterContext) => CardFilter | null;
}

const DAY = 86_400_000;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

/** "" as a value means the card has none: no section, no tag, no source. */
export const NONE = "";

const startOfDay = (at: number) => {
  const d = new Date(at);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
};
const endOfDay = (at: number) => startOfDay(at) + DAY;
const iso = (at: number) => new Date(at).toISOString();

const dueAt = (row: DeckRow) => (row.state ? new Date(row.state.due).getTime() : Number.NaN);
const createdAt = (row: DeckRow) => new Date(row.card.createdAt).getTime();
const lastReviewAt = (row: DeckRow) =>
  row.state?.lastReview ? new Date(row.state.lastReview).getTime() : null;

/** The FSRS record behind a state, for its lapse and review counts; null for a card never asked. */
function fsrsOf(row: DeckRow): { reps: number; lapses: number } | null {
  if (!row.state) return null;
  try {
    const card = deserializeState(row.state.fsrs);
    return typeof card.lapses === "number" ? { reps: card.reps, lapses: card.lapses } : null;
  } catch {
    return null;
  }
}

/** Each distinct value across the cards, sorted for the interface language. */
function distinct(values: Iterable<string>, locale: string): string[] {
  const collator = new Intl.Collator(locale, { sensitivity: "base", numeric: true });
  return [...new Set(values)].sort(collator.compare);
}

/** How far back a period reaches, or null for a period the card has no date in. */
function periodStart(period: string, now: number): number | null {
  switch (period) {
    case "today":
      return startOfDay(now);
    case "week":
      return now - WEEK;
    case "month":
      return now - MONTH;
    default:
      return null;
  }
}

const periodLabels: Record<"today" | "week" | "month", MessageDescriptor> = {
  today: msg({ message: "Today", context: "a period of time" }),
  week: msg({ message: "In the last week", context: "a period of time" }),
  month: msg({ message: "In the last month", context: "a period of time" }),
};

const sourceLabels: Record<FieldSource, MessageDescriptor> = {
  ai: msg({ message: "AI", context: "who wrote a field" }),
  lesson: msg({ message: "The lesson", context: "who wrote a field" }),
  manual: msg({ message: "You", context: "who wrote a field" }),
};

const actorLabels: Record<Card["createdBy"], MessageDescriptor> = {
  user: msg({ message: "You", context: "who added a card" }),
  api: msg({ message: "The API", context: "who added a card" }),
  mcp: msg({ message: "A connected app", context: "who added a card" }),
  ai: msg({ message: "AI", context: "who added a card" }),
  system: msg({ message: "Lymi", context: "who added a card" }),
};

const sourceFields = ["meaningSource", "exampleSource", "pronunciationSource"] as const;

/** A filter on one period, sent as `gte` from its start; "never" is the field being empty. */
function periodComparator(period: string, now: number): DateComparator | null {
  if (period === "never") return { null: true };
  const start = periodStart(period, now);
  return start === null ? null : { gte: iso(start) };
}

export const filterFields: readonly FilterField[] = [
  {
    key: "state",
    label: msg`State`,
    pick: "any",
    options: ({ i18n }) =>
      (["new", "learning", "known"] as const).map((state) => ({
        value: state,
        label: i18n._(stateMarks[state].groupLabel),
        state,
      })),
    matches: (row, values) => values.includes(rowState(row)),
    // FSRS state is not a field of the API's search.
    toServer: () => null,
  },
  {
    key: "due",
    label: msg`Due`,
    pick: "one",
    options: ({ i18n }) => [
      { value: "now", label: i18n._(msg({ message: "Now", context: "when a card is due" })) },
      { value: "today", label: i18n._(msg({ message: "Today", context: "when a card is due" })) },
      {
        value: "week",
        label: i18n._(msg({ message: "This week", context: "when a card is due" })),
      },
    ],
    matches: (row, [value], { now }) => {
      if (rowState(row) === "new") return false;
      const limit = value === "now" ? now : value === "today" ? endOfDay(now) : now + WEEK;
      return value === "now" ? dueAt(row) <= limit : dueAt(row) < limit;
    },
    toServer: ([value], { now }) => ({
      dueAt:
        value === "now"
          ? { lte: iso(now) }
          : { lt: iso(value === "today" ? endOfDay(now) : now + WEEK) },
    }),
  },
  {
    key: "section",
    label: msg`Section`,
    pick: "any",
    options: ({ sections, i18n }) =>
      sections.length === 0
        ? []
        : [
            ...sections.map((s) => ({ value: s.id, label: s.name })),
            { value: NONE, label: i18n._(msg`No section`) },
          ],
    matches: (row, values, { sections }) => values.includes(sectionOf(row, sections)),
    toServer: (values) => {
      const ids = values.filter((v) => v !== NONE);
      // A card with no section and one in a section is an OR across two comparators.
      if (ids.length > 0 && values.includes(NONE)) return null;
      return { sectionId: ids.length > 0 ? { in: ids } : { null: true } };
    },
  },
  {
    key: "tags",
    label: msg`Tags`,
    pick: "any",
    options: ({ rows, i18n }) => {
      const tags = distinct(
        rows.flatMap((row) => row.card.tags),
        i18n.locale,
      );
      if (tags.length === 0) return [];
      const options = tags.map((tag) => ({ value: tag, label: tag }));
      if (rows.some((row) => row.card.tags.length === 0))
        options.push({ value: NONE, label: i18n._(msg`No tags`) });
      return options;
    },
    matches: (row, values) =>
      row.card.tags.length === 0
        ? values.includes(NONE)
        : row.card.tags.some((tag) => values.includes(tag)),
    toServer: (values) => {
      const tags = values.filter((v) => v !== NONE);
      if (tags.length > 0 && values.includes(NONE)) return null;
      return { tags: { some: tags.length > 0 ? { in: tags } : { null: true } } };
    },
  },
  {
    key: "language",
    label: msg`Language`,
    pick: "any",
    options: ({ rows, i18n }) => {
      const codes = distinct(
        rows.flatMap((row) => (row.card.language ? [row.card.language] : [])),
        i18n.locale,
      );
      // One language is the deck's; there is nothing to choose between.
      if (codes.length < 2) return [];
      return codes.map((code) => ({ value: code, label: languageName(code) }));
    },
    matches: (row, values) => !!row.card.language && values.includes(row.card.language),
    toServer: (values) => ({ language: { in: [...values] } }),
  },
  {
    key: "source",
    label: msg({ message: "Source", context: "where a card came from, such as a lesson" }),
    pick: "any",
    options: ({ rows, i18n }) => {
      const sources = distinct(
        rows.flatMap((row) => (row.card.source ? [row.card.source] : [])),
        i18n.locale,
      );
      if (sources.length === 0) return [];
      const options = sources.map((source) => ({ value: source, label: source }));
      if (rows.some((row) => !row.card.source))
        options.push({ value: NONE, label: i18n._(msg`No source`) });
      return options;
    },
    matches: (row, values) => values.includes(row.card.source ?? NONE),
    toServer: (values) => {
      const sources = values.filter((v) => v !== NONE);
      if (sources.length > 0 && values.includes(NONE)) return null;
      return { source: sources.length > 0 ? { in: sources } : { null: true } };
    },
  },
  {
    key: "written",
    label: msg`Written by`,
    pick: "any",
    options: ({ rows, i18n }) => {
      const present = new Set(
        rows.flatMap((row) => sourceFields.flatMap((f) => row.card[f] ?? [])),
      );
      return (["ai", "lesson", "manual"] as const)
        .filter((source) => present.has(source))
        .map((source) => ({ value: source, label: i18n._(sourceLabels[source]) }));
    },
    matches: (row, values) =>
      sourceFields.some((f) => !!row.card[f] && values.includes(row.card[f] as string)),
    // "Any field the AI wrote" is an OR across three fields, which the server combines with AND.
    toServer: () => null,
  },
  {
    key: "missing",
    label: msg`Missing`,
    pick: "any",
    options: ({ i18n }) => [
      { value: "meaning", label: i18n._(msg`Meaning`) },
      { value: "example", label: i18n._(msg`Example`) },
      { value: "pronunciation", label: i18n._(msg`Pronunciation`) },
      { value: "picture", label: i18n._(msg`Picture`) },
    ],
    matches: (row, values) =>
      values.some((value) =>
        value === "picture" ? !row.card.image : !row.card[value as "meaning"],
      ),
    toServer: (values) => {
      if (values.length !== 1 || values[0] === "picture") return null;
      return { [values[0] as "meaning"]: { null: true } };
    },
  },
  {
    key: "added",
    label: msg`Added`,
    pick: "one",
    options: ({ i18n }) => [
      ...(["today", "week", "month"] as const).map((period) => ({
        value: period,
        label: i18n._(periodLabels[period]),
      })),
      { value: "older", label: i18n._(msg`More than a month ago`) },
    ],
    matches: (row, [value], { now }) => {
      const start = periodStart(value ?? "", now);
      return start === null ? createdAt(row) < now - MONTH : createdAt(row) >= start;
    },
    toServer: ([value], { now }) => {
      const createdAt =
        value === "older" ? { lt: iso(now - MONTH) } : periodComparator(value ?? "", now);
      return createdAt && { createdAt };
    },
  },
  {
    key: "addedBy",
    label: msg`Added by`,
    pick: "any",
    options: ({ rows, i18n }) => {
      const actors = new Set(rows.map((row) => row.card.createdBy));
      // Every card by the learner's own hand is the ordinary deck; nothing to tell apart.
      if (actors.size < 2) return [];
      return (["user", "mcp", "api", "ai", "system"] as const)
        .filter((actor) => actors.has(actor))
        .map((actor) => ({ value: actor, label: i18n._(actorLabels[actor]) }));
    },
    matches: (row, values) => values.includes(row.card.createdBy),
    // Who added a card is Activity's field, not the search's.
    toServer: () => null,
  },
  {
    key: "reviewed",
    label: msg`Last reviewed`,
    pick: "one",
    options: ({ i18n }) => [
      ...(["today", "week", "month"] as const).map((period) => ({
        value: period,
        label: i18n._(periodLabels[period]),
      })),
      { value: "never", label: i18n._(msg`Never`) },
    ],
    matches: (row, [value], { now }) => {
      const at = lastReviewAt(row);
      if (value === "never") return at === null;
      const start = periodStart(value ?? "", now);
      return at !== null && start !== null && at >= start;
    },
    toServer: ([value], { now }) => ({
      reviews: { lastReviewedAt: periodComparator(value ?? "", now) ?? undefined },
    }),
  },
  {
    key: "forgotten",
    label: msg`Forgotten`,
    pick: "one",
    options: ({ i18n }) => [
      { value: "ever", label: i18n._(msg`At least once`) },
      { value: "often", label: i18n._(msg`Often`) },
      { value: "never", label: i18n._(msg`Never`) },
    ],
    matches: (row, [value]) => {
      const fsrs = fsrsOf(row);
      const lapses = fsrs?.lapses ?? 0;
      if (value === "never") return lapses === 0;
      if (value === "ever") return lapses > 0;
      return !!fsrs && lapses >= SLIPPING_LAPSES && fsrs.reps >= SLIPPING_REVIEWS;
    },
    toServer: ([value]) => ({
      reviews:
        value === "often"
          ? { slipping: { eq: true } }
          : { lapses: value === "never" ? { eq: 0 } : { gte: 1 } },
    }),
  },
];

const byKey = new Map(filterFields.map((field) => [field.key, field]));

export function filterField(key: FilterKey): FilterField {
  const field = byKey.get(key);
  if (!field) throw new Error(`No filter field ${key}`);
  return field;
}

/** The fields worth offering for these cards, in menu order, each with its values. */
export function availableFields(
  ctx: FilterContext,
): { field: FilterField; options: FilterOption[] }[] {
  return filterFields.flatMap((field) => {
    const options = field.options(ctx);
    return options.length > 0 ? [{ field, options }] : [];
  });
}

export const conditionOf = (set: FilterSet, key: FilterKey): FilterCondition | undefined =>
  set.find((c) => c.key === key);

/** The set with one field's values replaced; no values removes the field. Order is kept. */
export function withValues(set: FilterSet, key: FilterKey, values: string[]): FilterSet {
  const rest = set.filter((c) => c.key !== key);
  if (values.length === 0) return rest;
  const at = set.findIndex((c) => c.key === key);
  const next: FilterCondition = { key, values };
  return at < 0 ? [...rest, next] : [...set.slice(0, at), next, ...set.slice(at + 1)];
}

/** Turn one value on or off within a field, as its `pick` allows. */
export function toggleValue(set: FilterSet, key: FilterKey, value: string, on: boolean): FilterSet {
  const current = conditionOf(set, key)?.values ?? [];
  if (filterField(key).pick === "one") return withValues(set, key, on ? [value] : []);
  return withValues(
    set,
    key,
    on ? [...current.filter((v) => v !== value), value] : current.filter((v) => v !== value),
  );
}

export function matchesFilters(row: DeckRow, set: FilterSet, ctx: FilterContext): boolean {
  return set.every((c) => filterField(c.key).matches(row, c.values, ctx));
}

/**
 * The set as the API's card search takes it, and the fields it cannot say. A search with the
 * filter and those fields applied on the returned page gives the same rows the list shows.
 */
export function toCardFilter(
  set: FilterSet,
  ctx: FilterContext,
): { filter: CardFilter; unsupported: FilterKey[] } {
  const filter: CardFilter = {};
  const unsupported: FilterKey[] = [];
  for (const c of set) {
    const part = filterField(c.key).toServer(c.values, ctx);
    if (!part) {
      unsupported.push(c.key);
      continue;
    }
    const { reviews, ...rest } = part;
    Object.assign(filter, rest);
    // Two review conditions share the one `reviews` object.
    if (reviews) filter.reviews = { ...filter.reviews, ...reviews };
  }
  return { filter, unsupported };
}

/** The rows the list shows: those matching the search text and every condition. */
export function filterRows(
  rows: DeckRow[],
  set: FilterSet,
  query: string,
  ctx: FilterContext,
): DeckRow[] {
  const needle = query.trim().toLocaleLowerCase();
  return rows.filter((row) => {
    if (
      needle &&
      !row.card.term.toLocaleLowerCase().includes(needle) &&
      !row.card.meaning?.toLocaleLowerCase().includes(needle)
    )
      return false;
    return matchesFilters(row, set, ctx);
  });
}
