import type { CardInput, CardPatch, DeckInput, NewDeckInput } from "@lymi/core";
import { newId, normaliseTerm } from "@lymi/core";
import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { type AddCardOutcome, ApiError, api, type Card, type Deck } from "./api";
import { flushOutbox as flushGrades } from "./grades";
import { claimQueued } from "./persisted";
import { cacheLookup, localCard, patchCard, rebase, showWrite } from "./write-projections";

/**
 * The learner's card and deck writes, kept on the device until the server has them, so every one
 * made offline lands once the connection returns. Grades have their own outbox in `grades.ts`;
 * a flush sends both in the order they were made. docs/stack.md#offline has the rules.
 */
const KEY = "lymi-writes";

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
  key: string;
  /** When the learner made it, so grades made before it are sent before it. */
  at: number;
  write: Write;
  /** The term or deck name, so a write the server refuses can be named to the learner. */
  label: string;
  attempts?: number;
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

let cache: { raw: string | null; writes: QueuedWrite[] } | null = null;
const listeners = new Set<() => void>();
const noticeListeners = new Set<(notice: Notice) => void>();

function stored(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return cache?.raw ?? null;
  }
}

function read(): QueuedWrite[] {
  const raw = stored();
  if (cache && cache.raw === raw) return cache.writes;
  let entries: unknown[] = [];
  try {
    const parsed: unknown = JSON.parse(raw ?? "[]");
    if (Array.isArray(parsed)) entries = parsed;
  } catch {
    entries = [];
  }
  // An entry this build cannot read is skipped on its own, so it cannot hold up the rest.
  const writes = entries.filter(
    (e): e is QueuedWrite =>
      !!e &&
      typeof e === "object" &&
      typeof (e as QueuedWrite).key === "string" &&
      typeof (e as QueuedWrite).at === "number" &&
      KINDS.has((e as QueuedWrite).write?.kind),
  );
  cache = { raw, writes };
  return writes;
}

function write(next: QueuedWrite[]) {
  const raw = JSON.stringify(next);
  cache = { raw, writes: next };
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    // The query cache is the one large thing in storage and can be fetched again; a write cannot.
    try {
      localStorage.removeItem("lymi-query-cache");
      localStorage.setItem(KEY, raw);
    } catch {
      // Blocked storage keeps the writes for this page's life.
    }
  }
  for (const listener of listeners) listener();
}

const update = (fn: (current: QueuedWrite[]) => QueuedWrite[]) => write(fn(read()));

export const writeStore = {
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
      update((all) => all.filter((e) => e.key !== entry.key));
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
      const value = await send(entry.write);
      update((all) => all.filter((e) => e.key !== entry.key));
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
        break;
      }
      if (status === -1 || transient(status)) {
        const attempts = (entry.attempts ?? 0) + 1;
        const retryAt = Date.now() + backoff(attempts);
        update((all) => all.map((e) => (e.key === entry.key ? { ...e, attempts, retryAt } : e)));
        result.retryAt = Math.min(result.retryAt ?? retryAt, retryAt);
        hold(entry.write);
        continue;
      }
      // Refused outright: it can never land, and neither can anything that needed what it made.
      update((all) => all.filter((e) => e.key !== entry.key));
      settle(entry.key, { error: err as ApiError });
      const made = createdBy(entry.write);
      if (made) dropped.add(made);
      if (!awaited.has(entry.key)) {
        notify({ reason: "refused", label: entry.label, message: (err as ApiError).message });
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
      ? (navigator.locks.request(KEY, task) as Promise<T>)
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
  update((all) => [...all, { key, at: Date.now(), write: w, label }]);
  await flushWrites().finally(() => awaited.delete(key));
  const outcome = settled.get(key);
  settled.delete(key);
  if (!outcome) return { status: "queued" };
  if ("error" in outcome) throw outcome.error;
  return { status: "sent", value: outcome.value as T };
}

let client: QueryClient | null = null;

/** The cache every write shows in at once and every refetch lays the waiting writes over. */
export function bindWriteCache(qc: QueryClient) {
  client = qc;
}

/** Sends what is waiting, fetches, and lays over the result whatever is still waiting. */
export async function fresh<T>(key: QueryKey, fetch: () => Promise<T>): Promise<T> {
  await flushWrites().catch(() => undefined);
  const data = await fetch();
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
