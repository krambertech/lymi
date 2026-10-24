import type { Section } from "./api";
import { type DeckFilters, type DeckRow, deckTags, filterRows, type StateKey } from "./deck-list";

/*
 * The deck list's filters as a list of fields, so a menu or a sheet can draw every field the same
 * way and a new filter is one entry here. Fields combine with AND and a field's values with OR,
 * as `filterRows` applies them. Names stay with the app that draws them, since this package has no
 * catalog. docs/design/library-decks-and-cards.md.
 */

export type FilterKey = "state" | "due" | "section" | "tags" | "important";

export interface FilterContext {
  /** Every card of the deck, so a field offers only the values that occur. */
  rows: readonly DeckRow[];
  sections: readonly Section[];
  now: number;
  /** The list's search, which the counts honour so they match what the list shows. */
  query?: string | undefined;
}

export interface FilterField {
  key: FilterKey;
  /** `any`: several values may be on. `one`: at most one. `flag`: on or off, its one value `ON`. */
  pick: "any" | "one" | "flag";
  /** The values on offer, or none when the deck has nothing to choose between. */
  values: (ctx: FilterContext) => string[];
  get: (filters: DeckFilters) => string[];
  set: (filters: DeckFilters, values: string[]) => DeckFilters;
}

/** A flag field's one value. */
export const ON = "on";

export const STATES: readonly StateKey[] = ["new", "learning", "known"];
export const DUES = ["today", "week"] as const;

export const filterFields: readonly FilterField[] = [
  {
    key: "state",
    pick: "any",
    values: () => [...STATES],
    get: (f) => f.states,
    set: (f, values) => ({ ...f, states: values as StateKey[] }),
  },
  {
    key: "due",
    pick: "one",
    values: () => [...DUES],
    get: (f) => (f.due ? [f.due] : []),
    set: (f, [value]) => ({ ...f, due: (value as DeckFilters["due"]) ?? null }),
  },
  {
    key: "section",
    pick: "any",
    // "" is a card with no section, which every sectioned deck can hold.
    values: ({ sections }) => (sections.length ? [...sections.map((s) => s.id), ""] : []),
    get: (f) => f.sections,
    set: (f, values) => ({ ...f, sections: values }),
  },
  {
    key: "tags",
    pick: "any",
    values: ({ rows }) => deckTags(rows).map((tag) => tag.key),
    get: (f) => f.tags,
    set: (f, values) => ({ ...f, tags: values }),
  },
  {
    key: "important",
    pick: "flag",
    values: ({ rows }) => (rows.some((row) => row.card.important) ? [ON] : []),
    get: (f) => (f.important ? [ON] : []),
    set: (f, values) => ({ ...f, important: values.includes(ON) }),
  },
];

const byKey = new Map(filterFields.map((field) => [field.key, field]));

export function filterField(key: FilterKey): FilterField {
  const field = byKey.get(key);
  if (!field) throw new Error(`No filter field ${key}`);
  return field;
}

/** The fields worth offering for these cards, in menu order, each with its values. */
export function availableFields(ctx: FilterContext): { field: FilterField; values: string[] }[] {
  return filterFields.flatMap((field) => {
    const values = field.values(ctx);
    return values.length > 0 ? [{ field, values }] : [];
  });
}

/** The fields that are on, in menu order, each with what is chosen. */
export function activeFields(filters: DeckFilters): { field: FilterField; values: string[] }[] {
  return filterFields.flatMap((field) => {
    const values = field.get(filters);
    return values.length > 0 ? [{ field, values }] : [];
  });
}

/** Turn one value on or off within a field, as its `pick` allows. */
export function toggleValue(
  filters: DeckFilters,
  key: FilterKey,
  value: string,
  on: boolean,
): DeckFilters {
  const field = filterField(key);
  const current = field.get(filters);
  if (field.pick !== "any") return field.set(filters, on ? [value] : []);
  const rest = current.filter((v) => v !== value);
  return field.set(filters, on ? [...rest, value] : rest);
}

/**
 * How many cards the list would show with this field narrowed to one value, or left open when the
 * value is null, and the rest as they are.
 */
export function keeps(
  ctx: FilterContext,
  filters: DeckFilters,
  key: FilterKey,
  value: string | null,
) {
  const narrowed = filterField(key).set(filters, value === null ? [] : [value]);
  return filterRows([...ctx.rows], narrowed, ctx.query ?? "", ctx.now, ctx.sections).length;
}
