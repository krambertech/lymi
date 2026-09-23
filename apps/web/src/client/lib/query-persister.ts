import type { PersistedClient, Persister } from "@tanstack/react-query-persist-client";

/**
 * The query cache kept across reloads and offline starts, in IndexedDB rather than localStorage:
 * a whole library's cards outgrow localStorage's few megabytes, and a synchronous write of them
 * blocks the page. It is stored as the same JSON the localStorage persister wrote, so dates and
 * every other value come back exactly as a fresh fetch would give them.
 */
export const CACHE_DB = "lymi";
const STORE = "cache";
const KEY = "queries";
/** Where the cache lived before; read once so an upgrade starts warm, then removed. */
const LEGACY_KEY = "lymi-query-cache";
/** At most one write a second, as the localStorage persister did. */
const THROTTLE = 1000;

let opened: Promise<IDBDatabase> | null = null;

function database(): Promise<IDBDatabase> {
  opened ??= new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(CACHE_DB, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => {
      const db = request.result;
      // Another page deleting the database (a test, or a future version) must not wait on this one.
      db.onversionchange = () => {
        db.close();
        opened = null;
      };
      resolve(db);
    };
    request.onerror = () => {
      opened = null;
      reject(request.error);
    };
  });
  return opened;
}

function run<T>(mode: IDBTransactionMode, act: (store: IDBObjectStore) => IDBRequest<T>) {
  return database().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const request = act(db.transaction(STORE, mode).objectStore(STORE));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}

function takeLegacy(): string | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw !== null) localStorage.removeItem(LEGACY_KEY);
    return raw;
  } catch {
    return null;
  }
}

let pending: PersistedClient | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

export const queryPersister: Persister = {
  persistClient(client) {
    pending = client;
    if (timer) return;
    timer = setTimeout(() => {
      timer = undefined;
      const next = pending;
      pending = null;
      // A cache that cannot be kept is fetched again next time; nothing is lost.
      if (next) void run("readwrite", (s) => s.put(JSON.stringify(next), KEY)).catch(() => {});
    }, THROTTLE);
  },
  async restoreClient() {
    const legacy = takeLegacy();
    const raw = await run<string | undefined>("readonly", (s) => s.get(KEY)).catch(() => undefined);
    const text = raw ?? legacy;
    if (!text) return undefined;
    try {
      return JSON.parse(text) as PersistedClient;
    } catch {
      return undefined;
    }
  },
  async removeClient() {
    await clearQueryCache();
  },
};

/** Drops the kept cache, and any write of it still waiting, for whoever signs in next. */
export function clearQueryCache(): Promise<void> {
  clearTimeout(timer);
  timer = undefined;
  pending = null;
  takeLegacy();
  if (typeof indexedDB === "undefined") return Promise.resolve();
  return run("readwrite", (s) => s.delete(KEY)).then(
    () => undefined,
    () => undefined,
  );
}
