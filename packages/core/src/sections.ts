/** The share of a section's cards a learner has to know before the next section is ready. */
export const SECTION_READY_SHARE = 0.8;

/** Known cards a section of `total` cards needs before the next one is ready: 80%, rounded up. */
export function knownNeeded(total: number): number {
  // The epsilon keeps 10 × 0.8 at 8 when floating point lands a hair above it.
  return Math.max(0, Math.ceil(total * SECTION_READY_SHARE - 1e-9));
}

/** One active section, in deck order, as one learner stands in it. */
export interface SectionStanding {
  id: string;
  /** Active cards in the section. */
  total: number;
  /** Cards whose leading state is Review, as the deck's list marks Known. */
  known: number;
  /** Cards with at least one asked state that has left New. */
  started: number;
  /** The learner has a start row for it. */
  opened: boolean;
}

/** Open cards are reviewed; ready and locked cards wait, except any the learner already started. */
export type SectionStatus = "open" | "ready" | "locked";

export interface SectionProgress {
  id: string;
  status: SectionStatus;
  total: number;
  known: number;
  notStarted: number;
  /** Known cards this section needs before the one after it is ready. */
  knownNeeded: number;
}

export interface DeckProgress {
  sections: SectionProgress[];
  /** The last open section with cards: where the learner is. Null when the deck does not gate. */
  currentId: string | null;
  /** The first section with cards after the open ones. Null when every section is open. */
  nextId: string | null;
  /** The next section can be started without Start anyway. */
  ready: boolean;
}

/**
 * Where one learner stands in a deck's sections. Open sections are always a prefix of the deck:
 * everything up to the last section the learner started, or has studied a card in, is open, and
 * the first section with cards is open from the start. Sections without cards never block.
 */
export function deckProgress(sections: SectionStanding[], inOrder: boolean): DeckProgress {
  const base = (s: SectionStanding, status: SectionStatus): SectionProgress => ({
    id: s.id,
    status,
    total: s.total,
    known: s.known,
    notStarted: s.total - s.started,
    knownNeeded: knownNeeded(s.total),
  });
  const firstWithCards = sections.findIndex((s) => s.total > 0);
  if (!inOrder || firstWithCards === -1) {
    return {
      sections: sections.map((s) => base(s, "open")),
      currentId: null,
      nextId: null,
      ready: false,
    };
  }

  let lastOpen = firstWithCards;
  sections.forEach((s, i) => {
    if ((s.opened || s.started > 0) && i > lastOpen) lastOpen = i;
  });
  let currentIndex = firstWithCards;
  for (let i = lastOpen; i >= 0; i--) {
    if ((sections[i]?.total ?? 0) > 0) {
      currentIndex = i;
      break;
    }
  }
  const nextIndex = sections.findIndex((s, i) => i > lastOpen && s.total > 0);
  const current = sections[currentIndex];
  const ready =
    nextIndex !== -1 &&
    current !== undefined &&
    current.started === current.total &&
    current.known >= knownNeeded(current.total);

  return {
    sections: sections.map((s, i) =>
      base(s, i <= lastOpen ? "open" : i === nextIndex && ready ? "ready" : "locked"),
    ),
    currentId: current?.id ?? null,
    nextId: nextIndex === -1 ? null : (sections[nextIndex]?.id ?? null),
    ready,
  };
}

/**
 * The sections starting `targetId` opens: it and every section before it that is not open yet.
 * Empty when it is already open or not in the list.
 */
export function sectionsToStart(progress: DeckProgress, targetId: string): string[] {
  const at = progress.sections.findIndex((s) => s.id === targetId);
  if (at === -1 || progress.sections[at]?.status === "open") return [];
  return progress.sections
    .slice(0, at + 1)
    .filter((s) => s.status !== "open")
    .map((s) => s.id);
}
