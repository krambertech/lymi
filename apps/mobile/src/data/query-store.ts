import { asLastGood } from "@lymi/client/cache";
import type { DehydratedState } from "@tanstack/react-query";
import type { PersistedClient } from "@tanstack/react-query-persist-client";

/** The few calls the query store makes on MMKV, so it runs in Node under test. */
export interface KeyValueStore {
  getString(key: string): string | undefined;
  set(key: string, value: string): void;
  remove(key: string): void;
  getAllKeys(): string[];
}

/** The whole cache as one string, as releases before per-query storage kept it; read once, then removed. */
const LEGACY_KEY = "queries";
/** Which queries are kept, with the client's timestamp and buster. */
const INDEX_KEY = "index";
/** Each query is kept under its own key, so a write stores only what changed. */
const QUERY_PREFIX = "q:";

interface Index {
  timestamp: number;
  buster: string;
  mutations: DehydratedState["mutations"];
  hashes: string[];
}

/**
 * Keeps the query cache one query per key. Every deck's cards are kept, megabytes for a large
 * library, so a write stores only the queries whose data changed since the last one.
 */
export function queryStore(store: KeyValueStore) {
  // The data each kept query held when written; a refetch that changed nothing keeps the same reference.
  const written = new Map<string, unknown>();
  return {
    write(client: PersistedClient) {
      const { queries, mutations } = asLastGood(client.clientState);
      const hashes = new Set<string>();
      for (const query of queries) {
        hashes.add(query.queryHash);
        if (written.get(query.queryHash) === query.state.data) continue;
        store.set(QUERY_PREFIX + query.queryHash, JSON.stringify(query));
        written.set(query.queryHash, query.state.data);
      }
      for (const hash of written.keys()) {
        if (hashes.has(hash)) continue;
        store.remove(QUERY_PREFIX + hash);
        written.delete(hash);
      }
      const index: Index = {
        timestamp: client.timestamp,
        buster: client.buster,
        mutations,
        hashes: [...hashes],
      };
      store.set(INDEX_KEY, JSON.stringify(index));
      store.remove(LEGACY_KEY);
    },
    restore(): PersistedClient | undefined {
      const indexText = store.getString(INDEX_KEY);
      if (!indexText) {
        const legacy = store.getString(LEGACY_KEY);
        return legacy ? (JSON.parse(legacy) as PersistedClient) : undefined;
      }
      const { timestamp, buster, mutations, hashes } = JSON.parse(indexText) as Index;
      const queries = hashes.flatMap((hash) => {
        const text = store.getString(QUERY_PREFIX + hash);
        if (!text) return [];
        const query = JSON.parse(text) as DehydratedState["queries"][number];
        written.set(hash, query.state.data);
        return [query];
      });
      return { timestamp, buster, clientState: { mutations, queries } };
    },
    forget() {
      written.clear();
      for (const key of store.getAllKeys()) {
        if (key === LEGACY_KEY || key === INDEX_KEY || key.startsWith(QUERY_PREFIX)) {
          store.remove(key);
        }
      }
    },
  };
}
