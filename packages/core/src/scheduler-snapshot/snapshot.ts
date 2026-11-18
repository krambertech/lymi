import {
  deserializeState,
  emptyState,
  type FsrsCard,
  preview,
  State,
  schedule,
  serializeState,
} from "../fsrs";
import { replayProgress } from "../import-replay";
import { countedRating, type Rating } from "../types";

/** A grade and when it was given, to the second. */
export type GradeAt = [at: string, rating: Rating];

/** One card's life as the scheduler sees it. Every time is fixed, so fuzz draws the same each run. */
export type History = {
  /** When the card was added, or imported. */
  start: string;
  /** The source's log and schedule, for a card that arrives through an import at `start`. */
  imported?: {
    reviews: GradeAt[];
    due?: string;
    memory?: { stability: number; difficulty: number; lastReview: string };
    unstarted?: boolean;
  };
  /** Grades given in Lymi, oldest first. */
  grades: GradeAt[];
  /** When the grade buttons are shown. Before the last grade for a device clock that is behind. */
  previewAt: string;
};

export type StateName = "New" | "Learning" | "Review" | "Relearning";

/** What the learner sees of a card once its history is played: the four buttons and the next due date. */
export type Schedule = {
  state: StateName;
  due: string;
  stability: number;
  difficulty: number;
  forgot: string;
  hard: string;
  good: string;
  easy: string;
};

const DATE_FIELDS = ["due", "forgot", "hard", "good", "easy"] as const;
type DateField = (typeof DATE_FIELDS)[number];

const DECIMALS = 4;

/** To the second: a sub-second shift is clock noise, not a schedule that moved. */
export function iso(date: Date | number): string {
  const ms = typeof date === "number" ? date : date.getTime();
  return new Date(Math.floor(ms / 1000) * 1000).toISOString().replace(".000Z", "Z");
}

/** The server's day is the learner's; UTC keeps the snapshot the same on every machine. */
function sameDay(a: Date | undefined, b: Date): boolean {
  return !!a && a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

/** Read back from storage, as the server reads a card before grading or previewing it. */
function stored(card: FsrsCard): FsrsCard {
  return deserializeState(serializeState(card));
}

function round(value: number): number {
  return Math.round(value * 10 ** DECIMALS) / 10 ** DECIMALS;
}

export function scheduleOf(history: History): Schedule {
  const start = new Date(history.start);
  const source = history.imported;
  let card = source
    ? replayProgress(
        {
          mode: "term_to_meaning",
          reviews: source.reviews.map(([at, rating]) => ({ at: new Date(at), rating })),
          due: source.due ? new Date(source.due) : undefined,
          memory: source.memory && {
            ...source.memory,
            lastReview: new Date(source.memory.lastReview),
          },
          unstarted: source.unstarted,
        },
        start,
      ).state
    : emptyState(start);
  for (const [at, rating] of history.grades) {
    const now = new Date(at);
    // The server keeps a grade at or before the last one as a duplicate, without scheduling it.
    if (card.last_review && now <= card.last_review) continue;
    card = schedule(stored(card), countedRating(rating, sameDay(card.last_review, now)), now).card;
  }
  const buttons = preview(stored(card), new Date(history.previewAt));
  return {
    state: State[card.state] as StateName,
    due: iso(card.due),
    stability: round(card.stability),
    difficulty: round(card.difficulty),
    forgot: iso(buttons[1]),
    hard: iso(buttons[2]),
    good: iso(buttons[3]),
    easy: iso(buttons[4]),
  };
}

export function schedulesOf(histories: Record<string, History>): Record<string, Schedule> {
  return Object.fromEntries(Object.entries(histories).map(([id, h]) => [id, scheduleOf(h)]));
}

/** One card per line, so a diff of the file lists each card that moved. */
export function toJson(entries: Record<string, unknown>): string {
  const lines = Object.entries(entries).map(
    ([id, value]) => `  ${JSON.stringify(id)}: ${JSON.stringify(value)}`,
  );
  return `{\n${lines.join(",\n")}\n}\n`;
}

type Shift = { id: string; ms: number };

export type Differences = {
  total: number;
  moved: string[];
  added: string[];
  removed: string[];
  dates: Record<DateField, Shift[]>;
  states: { id: string; from: StateName; to: StateName }[];
  stability: { id: string; from: number; to: number }[];
  difficulty: { id: string; change: number }[];
};

/** Both sides are rounded, so a last-digit flip is not a change. */
const TOLERANCE = 2 * 10 ** -DECIMALS;

export function differences(
  expected: Record<string, Schedule>,
  actual: Record<string, Schedule>,
): Differences {
  const result: Differences = {
    total: Object.keys(actual).length,
    moved: [],
    added: Object.keys(actual).filter((id) => !(id in expected)),
    removed: Object.keys(expected).filter((id) => !(id in actual)),
    dates: { due: [], forgot: [], hard: [], good: [], easy: [] },
    states: [],
    stability: [],
    difficulty: [],
  };
  for (const [id, now] of Object.entries(actual)) {
    const before = expected[id];
    if (!before) continue;
    let moved = false;
    for (const field of DATE_FIELDS) {
      const ms = Date.parse(now[field]) - Date.parse(before[field]);
      if (ms === 0) continue;
      result.dates[field].push({ id, ms });
      moved = true;
    }
    if (now.state !== before.state) {
      result.states.push({ id, from: before.state, to: now.state });
      moved = true;
    }
    if (Math.abs(now.stability - before.stability) > TOLERANCE) {
      result.stability.push({ id, from: before.stability, to: now.stability });
      moved = true;
    }
    if (Math.abs(now.difficulty - before.difficulty) > TOLERANCE) {
      result.difficulty.push({ id, change: now.difficulty - before.difficulty });
      moved = true;
    }
    if (moved) result.moved.push(id);
  }
  return result;
}

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

function signed(value: string, negative: boolean): string {
  return `${negative ? "-" : "+"}${value}`;
}

export function formatShift(ms: number): string {
  const abs = Math.abs(ms);
  if (abs < HOUR_MS) return signed(`${Math.round(abs / MINUTE_MS)} min`, ms < 0);
  if (abs < DAY_MS) return signed(`${Number((abs / HOUR_MS).toFixed(1))} h`, ms < 0);
  return signed(`${Number((abs / DAY_MS).toFixed(1))} d`, ms < 0);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

function largest<T>(items: T[], size: (item: T) => number): T | undefined {
  return items.reduce<T | undefined>(
    (best, item) => (best === undefined || size(item) > size(best) ? item : best),
    undefined,
  );
}

/** The kind of history, from its id: `steady-012` is a steady learner's card. */
function kindOf(id: string): string {
  return id.replace(/-\d+$/, "");
}

const LABELS: Record<DateField, string> = {
  due: "due",
  forgot: "Forgot",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

/** A readable account of what moved, or an empty string when nothing did. */
export function summarize(diff: Differences): string {
  if (diff.moved.length + diff.added.length + diff.removed.length === 0) return "";
  const lines: string[] = [];
  if (diff.moved.length > 0) {
    const kinds = new Map<string, number>();
    for (const id of diff.moved) kinds.set(kindOf(id), (kinds.get(kindOf(id)) ?? 0) + 1);
    const byKind = [...kinds].map(([kind, n]) => `${kind} ${n}`).join(", ");
    lines.push(`The scheduler moved ${diff.moved.length} of ${diff.total} cards (${byKind}).`, "");
    lines.push(
      `  ${"".padEnd(10)}${"moved".padStart(6)}${"later".padStart(7)}${"earlier".padStart(9)}${"median".padStart(11)}   largest`,
    );
    for (const field of DATE_FIELDS) {
      const shifts = diff.dates[field];
      const later = shifts.filter((s) => s.ms > 0).length;
      const top = largest(shifts, (s) => Math.abs(s.ms));
      const typical = shifts.length
        ? formatShift(median(shifts.map((s) => Math.abs(s.ms)))).slice(1)
        : "";
      lines.push(
        `  ${LABELS[field].padEnd(10)}${String(shifts.length).padStart(6)}${String(later).padStart(7)}${String(shifts.length - later).padStart(9)}${typical.padStart(11)}   ${top ? `${formatShift(top.ms)} ${top.id}` : ""}`.trimEnd(),
      );
    }
    // A new card has stability 0, so a card leaving New has no ratio and counts as the largest move.
    const stab = largest(diff.stability, (s) =>
      s.from > 0 && s.to > 0 ? Math.abs(Math.log(s.to / s.from)) : Number.POSITIVE_INFINITY,
    );
    if (stab) {
      const change =
        stab.from > 0 && stab.to > 0
          ? `x${(stab.to / stab.from).toFixed(3)}`
          : `${stab.from} -> ${stab.to}`;
      lines.push(
        `  ${"stability".padEnd(10)}${String(diff.stability.length).padStart(6)}   largest ${change} ${stab.id}`,
      );
    }
    const diffc = largest(diff.difficulty, (d) => Math.abs(d.change));
    if (diffc) {
      lines.push(
        `  ${"difficulty".padEnd(10)}${String(diff.difficulty.length).padStart(6)}   largest ${diffc.change > 0 ? "+" : ""}${diffc.change.toFixed(4)} ${diffc.id}`,
      );
    }
    if (diff.states.length > 0) {
      const changes = new Map<string, string[]>();
      for (const s of diff.states) {
        const key = `${s.from} -> ${s.to}`;
        changes.set(key, [...(changes.get(key) ?? []), s.id]);
      }
      for (const [change, ids] of changes) {
        const shown = ids.slice(0, 5).join(", ") + (ids.length > 5 ? ", ..." : "");
        lines.push(`  state ${change}: ${ids.length} (${shown})`);
      }
    }
    lines.push("");
  }
  if (diff.added.length > 0) lines.push(`Not in the snapshot yet: ${diff.added.join(", ")}`);
  if (diff.removed.length > 0)
    lines.push(`In the snapshot but no longer a history: ${diff.removed.join(", ")}`);
  lines.push(
    "If the change is intended, run `pnpm --filter @lymi/core schedules` and commit",
    "src/scheduler-snapshot/schedules.json, so the pull request shows every card that moved.",
  );
  return lines.join("\n");
}
