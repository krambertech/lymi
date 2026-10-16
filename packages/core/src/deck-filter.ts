import { State } from "ts-fsrs";
import { z } from "zod";
import { type DrawCard, type DrawLogEntry, type Drawn, drawKey } from "./draw";
import { tagKey } from "./terms";

/** How the learner reads an FSRS state: Review is Known, and Relearning is Learning again. */
export type StateKey = "new" | "learning" | "known";
export const STATE_KEYS = ["new", "learning", "known"] as const satisfies readonly StateKey[];

export function stateKey(state: number | null | undefined): StateKey {
  if (state === 2) return "known";
  if (state === 1 || state === 3) return "learning";
  return "new";
}

export interface DeckFilters {
  states: StateKey[];
  due: "today" | "week" | null;
  /** Section ids; "" is a card with no section. */
  sections: string[];
  /** Tag keys, from `tagKey`; a card carrying any of them matches. */
  tags: string[];
}

export const noFilters: DeckFilters = { states: [], due: null, sections: [], tags: [] };

export function activeFilterCount(filters: DeckFilters): number {
  return (
    filters.states.length + (filters.due ? 1 : 0) + filters.sections.length + filters.tags.length
  );
}

/** What the deck page's filter reads of a card and its leading state. */
export interface FilterableRow {
  card: {
    term: string;
    meaning?: string | null | undefined;
    tags: readonly string[];
    sectionId?: string | null | undefined;
  };
  state: { state: number; due: Date | string } | null;
}

const WEEK = 7 * 86_400_000;

const dueAt = (row: FilterableRow) => (row.state ? new Date(row.state.due).getTime() : Number.NaN);

/** The section a card sorts under: its own when that section is listed, otherwise none. */
export const sectionOf = (row: FilterableRow, sections: readonly { id: string }[]): string =>
  row.card.sectionId && sections.some((s) => s.id === row.card.sectionId) ? row.card.sectionId : "";

/**
 * The cards a deck page shows for its filters and search. `dayEnd` closes Due today: the
 * browser's own midnight on the page, the review zone's on the server.
 */
export function filterRows<R extends FilterableRow>(
  rows: readonly R[],
  filters: DeckFilters,
  query: string,
  now: number,
  sections: readonly { id: string }[],
  dayEnd: number,
): R[] {
  const needle = query.trim().toLocaleLowerCase();
  const limit = filters.due === "today" ? dayEnd : now + WEEK;
  return rows.filter((row) => {
    if (
      needle &&
      !row.card.term.toLocaleLowerCase().includes(needle) &&
      !row.card.meaning?.toLocaleLowerCase().includes(needle)
    )
      return false;
    const state = stateKey(row.state?.state);
    if (filters.states.length && !filters.states.includes(state)) return false;
    if (filters.sections.length && !filters.sections.includes(sectionOf(row, sections)))
      return false;
    if (filters.tags.length && !row.card.tags.some((tag) => filters.tags.includes(tagKey(tag))))
      return false;
    if (filters.due) {
      if (state === "new" || !(dueAt(row) < limit)) return false;
    }
    return true;
  });
}

/** A deck page's filters and search as a review carries them. */
export const DeckFilterQuery = z
  .object({
    states: z.array(z.enum(STATE_KEYS)).max(3).default([]),
    due: z.enum(["today", "week"]).nullable().default(null),
    sections: z.array(z.string().max(64)).max(100).default([]),
    tags: z.array(z.string().max(80)).max(100).default([]),
    q: z.string().max(200).default(""),
  })
  .meta({ id: "DeckFilter" });
export type DeckFilterQuery = z.infer<typeof DeckFilterQuery>;

/**
 * Reviewing what a filter shows: each started card not yet reviewed today, once, in its mode due
 * soonest, so due cards come first and the rest follow in the order they would fall due.
 */
export function filterOrder(
  cards: readonly DrawCard[],
  log: readonly DrawLogEntry[],
  shown: ReadonlySet<string>,
): Drawn[] {
  const reviewed = new Set(log.map((entry) => entry.cardId));
  const picked = cards.flatMap((card) => {
    if (!shown.has(card.cardId) || reviewed.has(card.cardId)) return [];
    const [mode] = card.modes
      .filter((m) => m.hasCue && m.state !== State.New)
      .sort((a, b) => a.due.getTime() - b.due.getTime());
    return mode ? [{ cardId: card.cardId, mode }] : [];
  });
  picked.sort(
    (a, b) =>
      a.mode.due.getTime() - b.mode.due.getTime() ||
      drawKey(a.cardId, a.mode.mode).localeCompare(drawKey(b.cardId, b.mode.mode)),
  );
  return picked.map(({ cardId, mode }) => ({ cardId, mode: mode.mode, kind: "review" }));
}
