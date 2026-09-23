import type { CardInput, CardPatch, DeckInput, NewDeckInput } from "@lymi/core";
import { newId, normaliseTerm } from "@lymi/core";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { type AddCardOutcome, ApiError, api, type Card, type Deck, errorMessage } from "./api";
import { flushOutbox as flushGrades } from "./grades";
import { claimQueued, WRITE_PREFIX } from "./persisted";
import { cacheLookup, localCard, patchCard, rebase, showWrite } from "./write-projections";

/**
 * The learner's card and deck writes, kept on the device until the server has them, so every one
 * made offline lands once the connection returns. Grades have their own outbox in `grades.ts`;
 * a flush sends both in the order they were made. docs/stack.md#offline has the rules.
 */
// One key per queued write, under WRITE_PREFIX, so a tab adding one never rewrites another tab's.
const LOCK = "lymi-writes";
/** Raised when a queued write's shape changes; a build keeps, and does not send, a version it does not know. */
const VERSION = 1;

export type DeckPatch = { [K in keyof DeckInput]?: DeckInput[K] | undefined };

export type Write =
  | { kind: "card.add"; input: CardInput & { id: string } }
  | { kind: "card.update"; id: string; patch: CardPatch }
  | { kind: "card.archive"; id: string }
  | { kind: "card.restore"; id: string }
  | { kind: "deck.create"; input: NewDeckInput & { id: string } }
  | { kind: "deck.update"; id: string; patch: DeckPatch }
  | { kind: "deck.archive"; id: string }
  | { kind: "deck.restore"; id: string };

export interface QueuedWrite {
  v: typeof VERSION;
  key: string;
  /** When the learner made it, so grades made before it are sent before it. */
  at: number;
  write: Write;
  /** The term or deck name, so a write the server refuses can be named to the learner. */
  label: string;
  attempts?: number;
  /** When the server first failed to take it, so a write it never takes is eventually given up. */
  failingSince?: number;
  /** Not sent again before this, after the server failed to take it. */
  retryAt?: number;
}

/** What the server made of a write: every create returns its item, the others what they changed. */
type Result = AddCardOutcome | Card | Deck | { ok: true };

/** A write the learner should hear about because it will not land as they made it. */
export type Notice =
  | { reason: "refused"; label: string; message: string }
  | { reason: "skipped"; label: string; deckName: string };

const KINDS = new Set<Write["kind"]>([
  "card.add",
  "card.update",
  "card.archive",
  "card.restore",
  "deck.create",
  "deck.update",
  "deck.archive",
  "deck.restore",
]);

let cache: QueuedWrite[] | null = null;
const listeners = new Set<() => void>();
const noticeListeners = new Set<(notice: Notice) => void>();

function readable(e: unknown): e is QueuedWrite {
  const entry = e as QueuedWrite | null;
  return (
    !!entry &&
    typeof entry === "object" &&
    entry.v === VERSION &&
    typeof entry.key === "string" &&
    typeof entry.at === "number" &&
    KINDS.has(entry.write?.kind)
  );
}

function read(): QueuedWrite[] {
  if (cache) return cache;
  const writes: QueuedWrite[] = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const name = localStorage.key(i);
      if (!name?.startsWith(WRITE_PREFIX)) continue;
      try {
        const entry: unknown = JSON.parse(localStorage.getItem(name) ?? "null");
        // Unreadable or from another version: left where it is, so it cannot hold up the rest.
        if (readable(entry)) writes.push(entry);
      } catch {}
    }
  } catch {
    return cache ?? [];
  }
  writes.sort((a, b) => a.at - b.at || (a.key < b.key ? -1 : 1));
  cache = writes;
  return writes;
}

function changed() {
  for (const listener of listeners) listener();
}

function put(entry: QueuedWrite) {
  const raw = JSON.stringify(entry);
  const current = read();
  cache = current.some((e) => e.key === entry.key)
    ? current.map((e) => (e.key === entry.key ? entry : e))
    : [...current, entry];
  try {
    localStorage.setItem(WRITE_PREFIX + entry.key, raw);
  } catch {
    // The query cache is the one large thing in storage and can be fetched again; a write cannot.
    try {
      localStorage.removeItem("lymi-query-cache");
      localStorage.setItem(WRITE_PREFIX + entry.key, raw);
    } catch {
      // Blocked storage keeps the write for this page's life.
    }
  }
  changed();
}

function remove(key: string) {
  cache = read().filter((e) => e.key !== key);
  try {
    localStorage.removeItem(WRITE_PREFIX + key);
  } catch {}
  changed();
}

// Another tab's queue changes arrive as storage events; the next read picks them up.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === null || e.key.startsWith(WRITE_PREFIX)) {
      cache = null;
      changed();
    }
  });
}

export const writeStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  snapshot: read,
};

/** Hears about every write that will not land as the learner made it. */
export function onNotice(listener: (notice: Notice) => void) {
  noticeListeners.add(listener);
  return () => {
    noticeListeners.delete(listener);
  };
}

/** Writes still waiting to reach the server. */
export function pendingWrites(): number {
  return read().length;
}

/**
 * The item a write changes, then the ones it needs to exist. A later write that changes or needs
 * an item a held write changes waits behind it.
 */
export function entitiesOf(w: Write): { own: string; needs: string[] } {
  switch (w.kind) {
    case "card.add":
      return { own: w.input.id, needs: [w.input.deckId, w.input.sectionId ?? ""] };
    case "deck.create":
      return { own: w.input.id, needs: [w.input.seriesId ?? ""] };
    case "card.update":
      return { own: w.id, needs: [w.patch.deckId ?? "", w.patch.sectionId ?? ""] };
    case "deck.update":
      return { own: w.id, needs: [w.patch.seriesId ?? ""] };
    default:
      return { own: w.id, needs: [] };
  }
}

/** The id a create makes, which a refused create takes every later write to it down with it. */
function createdBy(w: Write): string | null {
  return w.kind === "card.add" || w.kind === "deck.create" ? w.input.id : null;
}

function send(w: Write): Promise<Result> {
  switch (w.kind) {
    case "card.add":
      return api.addCard(w.input);
    case "card.update":
      return api.updateCard(w.id, w.patch);
    case "card.archive":
      return api.archiveCard(w.id);
    case "card.restore":
      return api.restoreCard(w.id);
    case "deck.create":
      return api.createDeck(w.input);
    case "deck.update":
      return api.updateDeck(w.id, w.patch);
    case "deck.archive":
      return api.archiveDeck(w.id);
    case "deck.restore":
      return api.restoreDeck(w.id);
  }
}

/** Two seconds, doubling, to five minutes. */
export function backoff(attempts: number): number {
  return Math.min(2000 * 2 ** Math.max(0, attempts - 1), 5 * 60_000);
}

/** A status that says to try again later rather than that the write can never land. */
const transient = (status: number) => status === 408 || status === 429 || status >= 500;

/** How long a write the server keeps failing is tried before it is given up and reported. */
export const GIVE_UP_AFTER = 24 * 60 * 60_000;
/** Tries for a write that fails in a way no status explains, which a retry is unlikely to fix. */
export const UNEXPLAINED_TRIES = 5;
/** A send that has not answered by now is treated as offline, so a stalled connection holds nothing up. */
export const SEND_TIMEOUT = 20_000;
/** When to look again after a send stalled. */
const STALL_RETRY = 30_000;

function sendWithin(w: Write): Promise<Result> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const stalled = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new ApiError(0, "stalled")), SEND_TIMEOUT);
  });
  // A write that lands after its timeout is replayed and recognised, so it lands once.
  return Promise.race([send(w), stalled]).finally(() => clearTimeout(timeout));
}

/** Writes a `submit` is waiting on, and what the flush made of each, read once by that submit. */
const awaited = new Set<string>();
const settled = new Map<string, { value: Result } | { error: ApiError }>();
const settle = (key: string, outcome: { value: Result } | { error: ApiError }) => {
  if (awaited.has(key)) settled.set(key, outcome);
};

export interface Flushed {
  sent: number;
  /** Queued grades that landed on the way. */
  graded: number;
  /** Stopped before the end: offline, or signed out. */
  stopped: boolean;
  /** The soonest a write that failed may be tried again. */
  retryAt: number | null;
}

let claimed = false;

/** Lets the queue flush once it is known to be this learner's; `claimQueued` drops another's. */
export function claimWrites(userId: string) {
  claimQueued(userId);
  cache = null;
  claimed = true;
}

async function flushQueued(): Promise<Flushed> {
  const result: Flushed = { sent: 0, graded: 0, stopped: false, retryAt: null };
  if (!claimed) return { ...result, stopped: true };
  const held = new Set<string>();
  const dropped = new Set<string>();
  const hold = (w: Write) => held.add(entitiesOf(w).own);
  for (const entry of read()) {
    const { own, needs } = entitiesOf(entry.write);
    const ids = [own, ...needs.filter(Boolean)];
    if (ids.some((id) => dropped.has(id))) {
      remove(entry.key);
      settle(entry.key, { error: new ApiError(404, "gone") });
      continue;
    }
    if (entry.retryAt && entry.retryAt > Date.now()) {
      result.retryAt = Math.min(result.retryAt ?? entry.retryAt, entry.retryAt);
      hold(entry.write);
      continue;
    }
    if (ids.some((id) => held.has(id))) {
      hold(entry.write);
      continue;
    }
    // Grades made before this write go first, so the server sees one timeline.
    result.graded += await flushGrades(new Date(entry.at).toISOString()).catch(() => 0);
    try {
      const value = await sendWithin(entry.write);
      remove(entry.key);
      settle(entry.key, { value });
      result.sent += 1;
      if (entry.write.kind === "card.add" && "status" in value && value.status === "skipped") {
        dropped.add(entry.write.input.id);
        if (!awaited.has(entry.key)) {
          notify({ reason: "skipped", label: entry.label, deckName: value.deckName });
        }
      }
    } catch (err) {
      const status = err instanceof ApiError ? err.status : -1;
      // Offline, or a session that lapsed: nothing else can land until that changes.
      if (status === 0 || status === 401) {
        result.stopped = true;
        if (status === 0) result.retryAt = Date.now() + STALL_RETRY;
        break;
      }
      const now = Date.now();
      const attempts = (entry.attempts ?? 0) + 1;
      const failingSince = entry.failingSince ?? now;
      const retrying =
        status === -1
          ? attempts < UNEXPLAINED_TRIES
          : transient(status) && now - failingSince < GIVE_UP_AFTER;
      if (retrying) {
        const retryAt = now + backoff(attempts);
        put({ ...entry, attempts, failingSince, retryAt });
        result.retryAt = Math.min(result.retryAt ?? retryAt, retryAt);
        hold(entry.write);
        continue;
      }
      // Refused, or failing past the point of trying: it will not land, and neither will anything
      // that needed what it made.
      const error = err instanceof ApiError ? err : new ApiError(-1, errorMessage(err));
      remove(entry.key);
      settle(entry.key, { error });
      const made = createdBy(entry.write);
      if (made) dropped.add(made);
      if (!awaited.has(entry.key)) {
        notify({ reason: "refused", label: entry.label, message: error.message });
      }
    }
  }
  if (!result.stopped) result.graded += await flushGrades().catch(() => 0);
  return result;
}

function notify(notice: Notice) {
  for (const listener of noticeListeners) listener(notice);
}

let chain: Promise<unknown> = Promise.resolve();
let timer: ReturnType<typeof setTimeout> | undefined;

/** One flush at a time in this tab, and in every tab where the browser can lock across them. */
function serial<T>(task: () => Promise<T>): Promise<T> {
  const locked = () =>
    typeof navigator !== "undefined" && navigator.locks
      ? (navigator.locks.request(LOCK, task) as Promise<T>)
      : task();
  const run = chain.then(locked, locked);
  chain = run.catch(() => undefined);
  return run;
}

/**
 * Sends every queued write and grade the server can take now, in order, and resolves with how
 * many writes landed. A write that failed on the server's side is tried again after a backoff.
 */
export function flushWrites(): Promise<Flushed> {
  return serial(flushQueued).then((flushed) => {
    clearTimeout(timer);
    if (flushed.retryAt !== null) {
      timer = setTimeout(() => void flushWrites(), Math.max(0, flushed.retryAt - Date.now()));
    }
    return flushed;
  });
}

export type Written<T> = { status: "sent"; value: T } | { status: "queued" };

/** Keeps a write on the device at once, then sends it after everything queued before it. */
export async function submit<T extends Result>(w: Write, label: string): Promise<Written<T>> {
  const key = newId();
  awaited.add(key);
  put({ v: VERSION, key, at: Date.now(), write: w, label });
  await flushWrites().finally(() => awaited.delete(key));
  const outcome = settled.get(key);
  settled.delete(key);
  if (!outcome) return { status: "queued" };
  if ("error" in outcome) throw outcome.error;
  return { status: "sent", value: outcome.value as T };
}

let client: QueryClient | null = null;
/** The longest a list waits on queued writes before it fetches anyway; the rebase covers the rest. */
const READ_WAIT = 2000;

/** The cache every write shows in at once and every refetch lays the waiting writes over. */
export function bindWriteCache(qc: QueryClient) {
  client = qc;
}

/** Whether a deck or card was made on this device and has not reached the server yet. */
export function madeHere(id: string): boolean {
  return read().some(({ write }) => createdBy(write) === id);
}

/**
 * Sends what is waiting, fetches, and lays over the result whatever is still waiting. `local` is
 * what a deck made here and not yet on the server holds, which the server would answer with 404.
 */
export async function fresh<T>(
  key: QueryKey,
  fetch: () => Promise<T>,
  local?: { deckId: string; empty: T },
): Promise<T> {
  // Waits a moment for what is queued to land first, but never lets a slow send hold up a read.
  await Promise.race([
    flushWrites().catch(() => undefined),
    new Promise((resolve) => setTimeout(resolve, READ_WAIT)),
  ]);
  const data = local && madeHere(local.deckId) ? local.empty : await fetch();
  const pending = read();
  return client && pending.length ? rebase(key, data, pending, cacheLookup(client)) : data;
}

async function make<T extends Result>(w: Write, label?: string): Promise<Written<T>> {
  const lookup = client ? cacheLookup(client) : null;
  const named =
    label ?? ("id" in w ? (lookup?.card(w.id)?.term ?? lookup?.deck(w.id)?.name ?? "") : "");
  if (client) showWrite(client, w);
  const written = await submit<T>(w, named).catch((err: unknown) => {
    forget();
    throw err;
  });
  const value = written.status === "sent" ? written.value : null;
  if (value && "status" in value && value.status === "skipped") forget();
  return written;
}

/** Refetches the lists a write was shown in, once it turned out it will not land as shown. */
function forget() {
  void client?.invalidateQueries({ queryKey: ["decks"] });
  void client?.invalidateQueries({ queryKey: ["cards"] });
}

/** A card already on the device with the same term, which the server would skip the add for. */
function localDuplicate(input: CardInput): { card: Card; deckName: string } | null {
  if (!client) return null;
  const key = normaliseTerm(input.term);
  const lookup = cacheLookup(client);
  const language =
    input.language === undefined
      ? (lookup.deck(input.deckId)?.defaultLanguage ?? null)
      : input.language;
  for (const [, rows] of client.getQueriesData<{ card: Card }[]>({ queryKey: ["decks"] })) {
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      const card = row?.card;
      if (card?.normalizedTerm === key && card.language === language && !card.archivedAt) {
        return { card, deckName: lookup.deck(card.deckId)?.name ?? "" };
      }
    }
  }
  return null;
}

const offline = () => typeof navigator !== "undefined" && navigator.onLine === false;

/**
 * The learner's card and deck writes. Each shows at once, and resolves with the server's answer
 * when it lands now, or with `queued` and what the screen already shows when it will land later.
 * A refusal still throws, as the plain API would.
 */
export const writes = {
  async addCard(input: CardInput): Promise<{ outcome: AddCardOutcome; queued: boolean }> {
    // Offline, the cache is the best word on duplicates until the server has the final one.
    const duplicate = offline() ? localDuplicate(input) : null;
    if (duplicate) {
      const outcome = {
        status: "skipped" as const,
        term: input.term,
        existing: duplicate.card,
        deckName: duplicate.deckName,
      };
      return { outcome, queued: false };
    }
    const w = { kind: "card.add" as const, input: { ...input, id: input.id ?? newId() } };
    const lookup = client ? cacheLookup(client) : null;
    const card = lookup ? localCard(w, lookup) : null;
    const written = await make<AddCardOutcome>(w, input.term);
    if (written.status === "sent") return { outcome: written.value, queued: false };
    if (!card) throw new ApiError(0, "No cache to hold the card");
    return { outcome: { status: "added", card }, queued: true };
  },
  async updateCard(card: Card, patch: CardPatch): Promise<{ card: Card; queued: boolean }> {
    const written = await make<Card>({ kind: "card.update", id: card.id, patch }, card.term);
    if (written.status === "sent") return { card: written.value, queued: false };
    return { card: patchCard(card, patch), queued: true };
  },
  async createDeck(input: NewDeckInput): Promise<{ id: string; queued: boolean }> {
    const w = { kind: "deck.create" as const, input: { ...input, id: input.id ?? newId() } };
    const written = await make<Deck>(w, input.name);
    return { id: w.input.id, queued: written.status === "queued" };
  },
  updateDeck: (id: string, patch: DeckPatch) => queued(make({ kind: "deck.update", id, patch })),
  archiveCard: (id: string) => queued(make({ kind: "card.archive", id })),
  restoreCard: (id: string) => queued(make({ kind: "card.restore", id })),
  archiveDeck: (id: string) => queued(make({ kind: "deck.archive", id })),
  restoreDeck: (id: string) => queued(make({ kind: "deck.restore", id })),
};

async function queued(written: Promise<Written<Result>>): Promise<{ queued: boolean }> {
  return { queued: (await written).status === "queued" };
}

/** For tests: forget the in-memory copy so the next read comes from storage. */
export function resetWriteCache() {
  cache = null;
  client = null;
  claimed = false;
  awaited.clear();
  settled.clear();
  clearTimeout(timer);
}
