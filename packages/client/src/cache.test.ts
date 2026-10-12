import { onlineManager, QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { shouldPersistQuery, warmCache } from "./cache";
import { deckCardsQuery } from "./queries";
import { configureForTest } from "./test/configure";

configureForTest(new Map(), { baseUrl: "https://lymi.test" });

const asked: string[] = [];

beforeEach(() => {
  asked.length = 0;
  vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
    asked.push(new URL(String(input)).pathname);
    return Promise.resolve(Response.json({}));
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
