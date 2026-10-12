import { shouldPersistQuery } from "@lymi/client/cache";
import type { QueryClient } from "@tanstack/react-query";
import type {
  PersistedClient,
  Persister,
  PersistQueryClientOptions,
} from "@tanstack/react-query-persist-client";
import { AppState } from "react-native";
import { cacheStore, captureStore, todayStore } from "./kept";

const KEY = "queries";
/** At most one write a second, as the web's. */
const THROTTLE = 1000;

/** As long as an unused session lasts, so a learner away for weeks still opens on their cards. */
export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

/**
 * Bump when a screen starts reading a response field a cache from an earlier release may lack. It
 * is not the app's version, because an update fetched online would then empty the next launch offline.
 */
const CACHE_SHAPE = "1";

let pending: PersistedClient | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;

function write() {
  clearTimeout(timer);
  timer = undefined;
  const next = pending;
  pending = null;
  // A cache that cannot be kept is fetched again next time; nothing is lost.
  if (next) {
    try {
      cacheStore.set(KEY, JSON.stringify(next));
    } catch {}
  }
}

// The app can be closed from the background without warning, so the last second is written there.
AppState.addEventListener("change", (state) => {
  if (state === "background") write();
});

const persister: Persister = {
  persistClient(client) {
    pending = client;
    timer ??= setTimeout(write, THROTTLE);
  },
  restoreClient() {
    const raw = cacheStore.getString(KEY);
    if (!raw) return undefined;
    try {
      return JSON.parse(raw) as PersistedClient;
    } catch {
      return undefined;
    }
  },
  removeClient() {
    forgetCache();
  },
};

export const persistOptions: Omit<PersistQueryClientOptions, "queryClient"> = {
  persister,
  maxAge: CACHE_MAX_AGE,
  buster: CACHE_SHAPE,
  dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
};

function forgetCache() {
  clearTimeout(timer);
  timer = undefined;
  pending = null;
  cacheStore.remove(KEY);
}

/**
 * Drops what the phone keeps for whoever was signed in: the cache, Add a word's carried-over choices
 * and the closed rest-day banner. The outboxes stay until `claimWrites` finds a different learner.
 */
export function forgetLearner(qc: QueryClient) {
  qc.clear();
  forgetCache();
  captureStore.clearAll();
  todayStore.clearAll();
}
