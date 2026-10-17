import type { GradeInput, ReviewMode } from "@lymi/core";
import { modeKey, modeOf, modeOfStateDirection } from "@lymi/core";
import { ApiError, api } from "./api";
import { waitsToSend } from "./api/request";
import { clientConfig } from "./config";
import { OUTBOX_KEY } from "./queued";
import type { LocalGrade } from "./review-draw";

/** Today's grades from this device, queued or sent, so every scope's draw and a reload see them. */
const KEY = OUTBOX_KEY;

export interface StoredGrade extends LocalGrade {
  timezone?: string | undefined;
  /** When the server accepted it; absent while the grade is queued. */
  sentAt?: number | undefined;
  /** The attempt the server recorded, which Undo names. */
  reviewId?: string | undefined;
  /** The FSRS state the server scheduled, once it accepted the grade. */
  stateAfter?: number | undefined;
}

/** A grade queued before modes existed names a legacy direction instead. */
type Legacy = Omit<StoredGrade, "mode"> & { mode?: ReviewMode; direction?: string };

// Parsed once per stored string, so another tab's write is seen and the snapshot stays stable.
let cache: { raw: string | null; grades: StoredGrade[] } | null = null;
const listeners = new Set<() => void>();

function stored(): string | null {
  const { storage } = clientConfig();
  try {
    return storage.getItem(KEY);
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
  const { storage } = clientConfig();
  const raw = JSON.stringify(next);
  cache = { raw, grades: next };
  try {
    storage.setItem(KEY, raw);
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
    const unsubscribe = clientConfig().storage.subscribe?.((key) => {
      if (key === KEY) listener();
    });
    return () => {
      listeners.delete(listener);
      unsubscribe?.();
    };
  },
  snapshot: read,
};

/** Grades, and grades taken back, still waiting to reach the server. */
export function outboxSize(): number {
  return read().filter((g) => g.sentAt === undefined || g.undone).length;
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
    ...(g.aid ? { aid: g.aid } : {}),
    ...(g.recallMs !== undefined ? { recallMs: g.recallMs } : {}),
    ...(g.gradeMs !== undefined ? { gradeMs: g.gradeMs } : {}),
    ...(g.readingsFaded !== undefined ? { readingsFaded: g.readingsFaded } : {}),
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
    const reviewId = result.reviewId ?? undefined;
    write(
      read().map((g) =>
        same(g, grade) ? { ...g, sentAt: Date.now(), reviewId, stateAfter: result.state } : g,
      ),
    );
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
  /** Grades the server refused and the outbox dropped, with the status it gave. */
  refused: { grade: LocalGrade; status: number }[];
}

async function flushQueued(before?: string): Promise<Flushed> {
  const result: Flushed = { sent: 0, offline: false, held: new Set(), refused: [] };
  const cutoff = before ? new Date(before).getTime() : Number.POSITIVE_INFINITY;
  if ((await settleUndos()) === "offline") result.offline = true;
  for (const grade of read().filter(
    (g) => g.sentAt === undefined && !g.undone && new Date(g.reviewedAt).getTime() < cutoff,
  )) {
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
      // A refused grade can never land, unless the refusal is one to wait out.
      const refused = err instanceof ApiError && err.status >= 400 && err.status < 500;
      if (refused && !waitsToSend(err.status)) {
        write(read().filter((g) => !same(g, grade)));
        result.refused.push({ grade, status: err.status });
      } else result.held.add(modeOfGrade(grade));
    }
  }
  return result;
}

/** Replays queued grades, or those made before `before`, and resolves with how many reached the server. */
export function flushOutbox(before?: string): Promise<number> {
  return serial(async () => (await flushQueued(before)).sent);
}

/** `gone` is a refusal because the card is no longer the learner's to grade. */
export type Recorded = "sent" | "queued" | "duplicate" | "refused" | "gone";

/** Keeps a grade on the device at once, so the review never waits, then sends it after any queued before it. */
export function recordGrade(grade: LocalGrade & { timezone?: string }): Promise<Recorded> {
  write([...read(), grade]);
  return serial(async (): Promise<Recorded> => {
    const flushed = await flushQueued();
    const refused = flushed.refused.find((r) => same(r.grade, grade));
    if (refused) return refused.status === 404 ? "gone" : "refused";
    const kept = read().find((g) => same(g, grade));
    // Gone without a refusal means a flush found a later grade of this mode on the server.
    if (!kept) return "duplicate";
    return kept.sentAt === undefined ? "queued" : "sent";
  });
}

/** How taking a grade back ended: done, waiting to tell the server, or refused so the grade stands. */
export type Undone = "undone" | "pending" | "kept";

/**
 * Tells the server about grades taken back on this device. One never sent is simply dropped; a sent
 * one is undone by its attempt, and one the server will not undo stands again.
 */
async function settleUndos(): Promise<"offline" | undefined> {
  const forget = (grade: StoredGrade) => write(read().filter((g) => !same(g, grade)));
  const stand = (grade: StoredGrade) =>
    write(read().map((g) => (same(g, grade) ? { ...g, undone: undefined } : g)));
  for (const grade of read().filter((g) => g.undone)) {
    if (grade.sentAt === undefined) {
      forget(grade);
      continue;
    }
    // A grade sent before the outbox kept attempts has nothing to name.
    if (!grade.reviewId) {
      stand(grade);
      continue;
    }
    try {
      await api.undoReview(grade.reviewId);
      forget(grade);
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      if (err.status === 0) return "offline";
      // Refused, such as a later grade of the mode from another device; a lapsed session waits.
      if (err.status >= 400 && err.status < 500 && err.status !== 401) stand(grade);
    }
  }
}

/**
 * Takes a grade back. The draw forgets it at once; a grade still queued never leaves the device,
 * and a sent one is undone on the server now or once the connection returns.
 */
export function undoGrade(grade: LocalGrade): Promise<Undone> {
  write(read().map((g) => (same(g, grade) ? { ...g, undone: true } : g)));
  return serial(async (): Promise<Undone> => {
    await settleUndos();
    const kept = read().find((g) => same(g, grade));
    return !kept ? "undone" : kept.undone ? "pending" : "kept";
  });
}

/** Drops sent grades from before the fetched day; queued ones and undos stay until they land. */
export function retireGrades(dayStart: string) {
  const start = new Date(dayStart).getTime();
  const current = read();
  const kept = current.filter(
    (g) => g.sentAt === undefined || g.undone || new Date(g.reviewedAt).getTime() >= start,
  );
  if (kept.length !== current.length) write(kept);
}

/** For tests: forget the in-memory copy so the next read comes from storage. */
export function resetGradeCache() {
  cache = null;
}
