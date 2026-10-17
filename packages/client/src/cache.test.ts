import { dehydrate, onlineManager, QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  asLastGood,
  cacheWarmer,
  outboxDehydrateOptions,
  shouldPersistQuery,
  warmCache,
} from "./cache";
import { deckCardsQuery } from "./queries";
import { configureForTest } from "./test/configure";

configureForTest(new Map(), { baseUrl: "https://lymi.test" });

const asked: string[] = [];

beforeEach(() => {
  asked.length = 0;
  vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
    asked.push(new URL(String(input)).pathname);
    // Enough of a draw and of a deck's cards for each read to succeed.
    return Promise.resolve(Response.json({ cards: [] }));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  onlineManager.setOnline(true);
});

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

describe("warming the cache", () => {
  it("fetches each deck's cards, sections and draw, skipping what is already kept", async () => {
    const qc = client();
    qc.setQueryData(deckCardsQuery("d1").queryKey, []);
    await warmCache(qc, ["d1"]);
    expect(asked).toEqual(["/api/review/draw", "/api/decks/d1/sections", "/api/review/draw"]);
  });

  it("stops once the connection goes", async () => {
    onlineManager.setOnline(false);
    await warmCache(client(), ["d1", "d2"]);
    expect(asked).toEqual([]);
  });
});

describe("a warm pass", () => {
  it("picks up what it missed once the connection is back", async () => {
    const qc = client();
    const warmer = cacheWarmer(qc);
    onlineManager.setOnline(false);
    await warmer.run(["d1"]);
    expect(asked).toEqual([]);
    onlineManager.setOnline(true);
    await warmer.run();
    expect(asked).toEqual([
      "/api/review/draw",
      "/api/decks/d1/cards",
      "/api/decks/d1/sections",
      "/api/review/draw",
    ]);
  });

  it("runs one at a time, however often it is asked", async () => {
    const warmer = cacheWarmer(client());
    const first = warmer.run(["d1"]);
    expect(warmer.run()).toBe(first);
    await first;
    await warmer.run();
    expect(asked).toHaveLength(4);
  });

  it("stops when asked", async () => {
    const warmer = cacheWarmer(client());
    const pass = warmer.run(["d1", "d2"]);
    warmer.stop();
    await pass;
    expect(asked.length).toBeLessThanOrEqual(1);
  });
});

describe("what the kept cache holds", () => {
  it("leaves out reads that opt out and pictures", () => {
    const qc = client();
    qc.setQueryData(["decks"], []);
    qc.setQueryData(["picture"], new Blob(["x"]));
    const cache = qc.getQueryCache();
    const optedOut = cache.build(qc, { queryKey: ["explore"], meta: { persist: false } });
    optedOut.setData({});
    expect(
      cache
        .getAll()
        .filter(shouldPersistQuery)
        .map((q) => q.queryKey),
    ).toEqual([["decks"]]);
  });
});

describe("what a client with outboxes keeps", () => {
  it("leaves out a mutation paused offline, with what it would have sent", async () => {
    onlineManager.setOnline(false);
    const qc = client();
    qc.setQueryData(["decks"], []);
    void qc
      .getMutationCache()
      .build(qc, { mutationFn: async () => undefined })
      .execute({ message: "private feedback" });
    await vi.waitFor(() => expect(qc.getMutationCache().getAll()[0]?.state.isPaused).toBe(true));
    const kept = dehydrate(qc, outboxDehydrateOptions);
    expect(kept.mutations).toEqual([]);
    expect(kept.queries.map((q) => q.queryKey)).toEqual([["decks"]]);
  });
});

describe("a refresh that failed", () => {
  it("keeps the last good copy, written as the success it was", async () => {
    const qc = client();
    qc.setQueryData(["decks"], [{ id: "d1" }]);
    await qc
      .fetchQuery({
        queryKey: ["decks"],
        queryFn: () => Promise.reject(new Error("offline")),
        staleTime: 0,
      })
      .catch(() => undefined);
    expect(qc.getQueryState(["decks"])?.status).toBe("error");
    const kept = asLastGood(dehydrate(qc, outboxDehydrateOptions));
    expect(kept.queries).toHaveLength(1);
    expect(kept.queries[0]?.state).toMatchObject({
      status: "success",
      data: [{ id: "d1" }],
      error: null,
    });
  });
});
