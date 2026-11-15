import { outboxDehydrateOptions } from "@lymi/client/cache";
import type { QueryClient } from "@tanstack/react-query";
import type {
  PersistedClient,
  Persister,
  PersistQueryClientOptions,
} from "@tanstack/react-query-persist-client";
import { AppState } from "react-native";
import { API_URL } from "../auth/client";
import { cacheStore, captureStore, todayStore } from "./kept";
import { queryStore } from "./query-store";

/** At most one write a second, as the web's. */
const THROTTLE = 1000;

/** As long as an unused session lasts, so a learner away for weeks still opens on their cards. */
export const CACHE_MAX_AGE = 1000 * 60 * 60 * 24 * 30;

/**
 * Bump when a screen starts reading a response field a cache from an earlier release may lack. It
 * is not the app's version, because an update fetched online would then empty the next launch offline.
 * `pnpm check:cache-shape` fails until this decision is recorded for every change to the frozen responses.
 */
const CACHE_SHAPE = "2";

let pending: PersistedClient | null = null;
let timer: ReturnType<typeof setTimeout> | undefined;
const stored = queryStore(cacheStore);

function write() {
  clearTimeout(timer);
  timer = undefined;
  const next = pending;
  pending = null;
  // A cache that cannot be kept is fetched again next time; nothing is lost.
  if (!next) return;
  try {
    stored.write(next);
  } catch {}
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
    try {
      return stored.restore();
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
  // A cache from another Worker, such as production's in a local build, is never restored.
  buster: `${CACHE_SHAPE} ${API_URL}`,
  dehydrateOptions: outboxDehydrateOptions,
};

/**
 * Keeps the cache for the learner now signed in, and forgets it, with the rest of what was kept
 * for them, when it was another learner's: the same rule `claimWrites` applies to the outboxes.
 */
export function claimCache(learnerId: string, qc: QueryClient) {
  const owner = cacheStore.getString(OWNER_KEY);
  if (owner && owner !== learnerId) forgetLearner(qc);
  cacheStore.set(OWNER_KEY, learnerId);
}

const OWNER_KEY = "owner";

function forgetCache() {
  clearTimeout(timer);
  timer = undefined;
  pending = null;
  stored.forget();
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
