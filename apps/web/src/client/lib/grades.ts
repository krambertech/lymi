import type { GradeInput, ReviewMode } from "@lymi/core";
import { modeKey, modeOf, modeOfStateDirection } from "@lymi/core";
import { ApiError, api } from "./api";
import type { LocalGrade } from "./review-draw";

/** Today's grades from this device, queued or sent, so every scope's draw and a reload see them. */
const KEY = "lymi-outbox";

export interface StoredGrade extends LocalGrade {
  timezone?: string | undefined;
  /** When the server accepted it; absent while the grade is queued. */
  sentAt?: number | undefined;
}

/** A grade queued before modes existed names a legacy direction instead. */
type Legacy = Omit<StoredGrade, "mode"> & { mode?: ReviewMode; direction?: string };

// Parsed once per stored string, so another tab's write is seen and the snapshot stays stable.
let cache: { raw: string | null; grades: StoredGrade[] } | null = null;
const listeners = new Set<() => void>();

function stored(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return cache?.raw ?? null;
  }
}

function read(): StoredGrade[] {
  const raw = stored();
  if (cache && cache.raw === raw) return cache.grades;
  let entries: Legacy[] = [];
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    if (Array.isArray(parsed)) entries = parsed as Legacy[];
  } catch {
    entries = [];
  }
  // One unreadable entry is skipped on its own, so it cannot take the rest of the queue with it.
  const grades = entries.flatMap((g): StoredGrade[] => {
    const at = new Date(g?.reviewedAt ?? Number.NaN);
    if (!g?.cardId || Number.isNaN(at.getTime())) return [];
    const mode = g.mode ?? (g.direction ? modeOf(modeOfStateDirection(g.direction)) : undefined);
    return mode ? [{ ...g, mode, reviewedAt: at.toISOString() }] : [];
  });
  cache = { raw, grades };
  return grades;
}

function write(next: StoredGrade[]) {
  const raw = JSON.stringify(next);
  cache = { raw, grades: next };
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    // A full or blocked storage keeps the grades for this page's life.
  }
  for (const listener of listeners) listener();
}

const same = (a: LocalGrade, b: LocalGrade) =>
  a.cardId === b.cardId && modeKey(a.mode) === modeKey(b.mode) && a.reviewedAt === b.reviewedAt;

export const gradeStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) listener();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
    };
  },
  snapshot: read,
};

/** Grades still waiting to reach the server. */
export function outboxSize(): number {
  return read().filter((g) => g.sentAt === undefined).length;
}

let chain: Promise<unknown> = Promise.resolve();
/** One send at a time, so grades reach the server in the order they were made. */
function serial<T>(task: () => Promise<T>): Promise<T> {
  const run = chain.then(task, task);
  chain = run.catch(() => undefined);
  return run;
}

function input(g: StoredGrade): GradeInput {
  return {
    cardId: g.cardId,
    mode: g.mode,
    rating: g.rating,
    reviewedAt: new Date(g.reviewedAt),
    ...(g.timezone ? { timezone: g.timezone } : {}),
  };
}

type Sent = "sent" | "duplicate" | "offline";

/** Sends a queued grade and records the answer, throwing any failure other than being offline. */
async function send(grade: StoredGrade): Promise<Sent> {
  try {
    const result = await api.grade(input(grade));
    if (result.duplicate) {
      write(read().filter((g) => !same(g, grade)));
      return "duplicate";
    }
    write(read().map((g) => (same(g, grade) ? { ...g, sentAt: Date.now() } : g)));
    return "sent";
  } catch (err) {
    if (err instanceof ApiError && err.status === 0) return "offline";
    throw err;
  }
}

const modeOfGrade = (g: LocalGrade) => `${g.cardId} ${modeKey(g.mode)}`;

interface Flushed {
  sent: number;
  offline: boolean;
  /** Modes with a grade still queued, so a later grade of the same mode waits behind it. */
  held: Set<string>;
  /** Grades the server refused and the outbox dropped. */
  refused: LocalGrade[];
}

async function flushQueued(): Promise<Flushed> {
  const result: Flushed = { sent: 0, offline: false, held: new Set(), refused: [] };
  for (const grade of read().filter((g) => g.sentAt === undefined)) {
    if (result.offline || result.held.has(modeOfGrade(grade))) {
      result.held.add(modeOfGrade(grade));
      continue;
    }
    try {
      const outcome = await send(grade);
      if (outcome === "offline") {
        result.offline = true;
        result.held.add(modeOfGrade(grade));
      } else if (outcome === "sent") result.sent += 1;
    } catch (err) {
      // A refused grade can never land, but one refused for a lapsed session waits for sign-in.
      const refused = err instanceof ApiError && err.status >= 400 && err.status < 500;
      if (refused && err.status !== 401) {
        write(read().filter((g) => !same(g, grade)));
        result.refused.push(grade);
      } else result.held.add(modeOfGrade(grade));
    }
  }
  return result;
}

/** Replays queued grades and resolves with how many reached the server. */
export function flushOutbox(): Promise<number> {
  return serial(async () => (await flushQueued()).sent);
}

export type Recorded = "sent" | "queued" | "duplicate" | "refused";

/** Keeps a grade on the device at once, so the review never waits, then sends it after any queued before it. */
export function recordGrade(grade: LocalGrade & { timezone?: string }): Promise<Recorded> {
  write([...read(), grade]);
  return serial(async (): Promise<Recorded> => {
    const flushed = await flushQueued();
    if (flushed.refused.some((g) => same(g, grade))) return "refused";
    const kept = read().find((g) => same(g, grade));
    // Gone without a refusal means a flush found a later grade of this mode on the server.
    if (!kept) return "duplicate";
    return kept.sentAt === undefined ? "queued" : "sent";
  });
}

/** Drops sent grades from before the fetched day; queued ones stay until they land. */
export function retireGrades(dayStart: string) {
  const start = new Date(dayStart).getTime();
  const current = read();
  const kept = current.filter(
    (g) => g.sentAt === undefined || new Date(g.reviewedAt).getTime() >= start,
  );
  if (kept.length !== current.length) write(kept);
}

/** For tests: forget the in-memory copy so the next read comes from storage. */
export function resetGradeCache() {
  cache = null;
}
