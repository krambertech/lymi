import type { PersistedClient } from "@tanstack/react-query-persist-client";
import { describe, expect, it } from "vitest";
import { type KeyValueStore, queryStore } from "./query-store";

function memory(): KeyValueStore & { sets: string[] } {
  const map = new Map<string, string>();
  const sets: string[] = [];
  return {
    sets,
    getString: (key) => map.get(key),
    set: (key, value) => {
      sets.push(key);
      map.set(key, value);
    },
    remove: (key) => void map.delete(key),
    getAllKeys: () => [...map.keys()],
  };
}

const query = (hash: string, data: unknown) => ({
  queryHash: hash,
  queryKey: [hash],
  state: { data, status: "success", dataUpdatedAt: 1 },
});

const client = (queries: ReturnType<typeof query>[]) =>
  ({
    timestamp: 10,
    buster: "1 local",
    clientState: { mutations: [], queries },
  }) as unknown as PersistedClient;

describe("queryStore", () => {
  it("writes only the queries whose data changed since the last write", () => {
    const store = memory();
    const kept = queryStore(store);
    const cards = { rows: ["a", "b"] };
    kept.write(client([query("cards", cards), query("decks", [1])]));
    store.sets.length = 0;
    kept.write(client([query("cards", cards), query("decks", [2])]));
    expect(store.sets).toEqual(["q:decks", "index"]);
  });

  it("restores what it wrote and drops queries the cache no longer holds", () => {
    const store = memory();
    queryStore(store).write(client([query("cards", { n: 1 }), query("draw", { n: 2 })]));
    const kept = queryStore(store);
    const restored = kept.restore();
    expect(restored?.buster).toBe("1 local");
    expect(restored?.clientState.queries.map((q) => q.queryHash)).toEqual(["cards", "draw"]);
    kept.write(client([query("cards", restored?.clientState.queries[0]?.state.data)]));
    expect(store.getAllKeys().sort()).toEqual(["index", "q:cards"]);
  });

  it("reads an earlier release's single-string cache, then replaces it", () => {
    const store = memory();
    store.set("queries", JSON.stringify(client([query("decks", [1])])));
    const kept = queryStore(store);
    const restored = kept.restore();
    expect(restored?.clientState.queries[0]?.queryHash).toBe("decks");
    kept.write(restored as PersistedClient);
    expect(store.getString("queries")).toBeUndefined();
    expect(store.getString("q:decks")).toBeDefined();
  });

  it("forgets every kept query and nothing else", () => {
    const store = memory();
    store.set("owner", "learner");
    const kept = queryStore(store);
    kept.write(client([query("decks", [1])]));
    kept.forget();
    expect(store.getAllKeys()).toEqual(["owner"]);
  });
});
