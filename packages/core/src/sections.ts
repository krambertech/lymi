export const SECTION_READY_SHARE = 0.8;

export function knownNeeded(total: number): number {
  return Math.max(0, Math.ceil(total * SECTION_READY_SHARE - 1e-9));
}

export interface SectionStanding {
  id: string;
  total: number;
  known: number;
  started: number;
  opened: boolean;
}

export type SectionStatus = "open" | "ready" | "locked";

export interface SectionProgress {
  id: string;
  status: SectionStatus;
  total: number;
  known: number;
  notStarted: number;
  knownNeeded: number;
}

export interface DeckProgress {
  sections: SectionProgress[];
  currentId: string | null;
  nextId: string | null;
  ready: boolean;
}

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
      base(
        s,
        i <= lastOpen || s.total === 0 ? "open" : i === nextIndex && ready ? "ready" : "locked",
      ),
    ),
    currentId: current?.id ?? null,
    nextId: nextIndex === -1 ? null : (sections[nextIndex]?.id ?? null),
    ready,
  };
}

export function sectionsToStart(progress: DeckProgress, targetId: string): string[] {
  const at = progress.sections.findIndex((s) => s.id === targetId);
  if (at === -1 || progress.sections[at]?.status === "open") return [];
  return progress.sections
    .slice(0, at + 1)
    .filter((s) => s.status !== "open")
    .map((s) => s.id);
}
