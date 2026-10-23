import type { Section, Sections } from "./api";
import { type DeckRow, rowState } from "./deck-list";

/** One column of a deck's section line: a section, or with an id of "" the cards with no section. */
export interface LineColumn {
  id: string;
  section: Section | null;
  total: number;
  known: number;
  learning: number;
  /** Not open yet, so its cards wait. */
  waiting: boolean;
}

/**
 * A column per section in the deck's order, then one for the cards with no section while there are
 * any. A section's counts are the server's, as its heading's ring reads them.
 */
export function lineColumns(sections: readonly Section[], rows: readonly DeckRow[]): LineColumn[] {
  const columns: LineColumn[] = sections.map((s) => ({
    id: s.id,
    section: s,
    total: s.total,
    known: s.known,
    learning: Math.max(0, s.total - s.known - s.notStarted),
    waiting: s.status !== "open",
  }));
  const listed = new Set(sections.map((s) => s.id));
  const none = rows.filter((r) => !r.card.sectionId || !listed.has(r.card.sectionId));
  if (sections.length > 0 && none.length > 0) {
    let known = 0;
    let learning = 0;
    for (const r of none) {
      const state = rowState(r);
      if (state === "known") known++;
      else if (state === "learning") learning++;
    }
    columns.push({ id: "", section: null, total: none.length, known, learning, waiting: false });
  }
  return columns;
}

/** What opens the next section, in the four states a deck that opens sections in order can be in. */
export type Opening =
  | { kind: "waits"; current: Section; next: Section; left: number }
  | { kind: "coming_up"; current: Section; next: Section; notStarted: number }
  | { kind: "ready"; current: Section; next: Section }
  | { kind: "open"; current: Section };

export function opening(
  sections: readonly Section[],
  progress: Sections["progress"],
): Opening | null {
  if (!progress) return null;
  const current = sections.find((s) => s.id === progress.currentId);
  if (!current) return null;
  const next = sections.find((s) => s.id === progress.nextId);
  if (!next) return { kind: "open", current };
  if (progress.ready) return { kind: "ready", current, next };
  if (current.notStarted > 0 && current.known >= current.knownNeeded)
    return { kind: "coming_up", current, next, notStarted: current.notStarted };
  return { kind: "waits", current, next, left: Math.max(0, current.knownNeeded - current.known) };
}
