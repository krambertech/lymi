import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CardSearchPage } from "./api";
import { cardSearchQuery } from "./queries";
import { configureForTest } from "./test/configure";

const page = (ids: string[], nextCursor: string | null): CardSearchPage => ({
  cards: ids.map(
    (id) => ({ id, deckId: "d", deckName: "Deck" }) as CardSearchPage["cards"][number],
  ),
  nextCursor,
  total: null,
});

describe("searching cards a page at a time", () => {
  const urls: string[] = [];
  let pages: CardSearchPage[] = [];

  beforeEach(() => {
    urls.length = 0;
    configureForTest(new Map());
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(url);
        return new Response(JSON.stringify(pages.shift()), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("follows the cursor past a short page, and stops once there is none", async () => {
    pages = [page(["a"], "c1"), page([], "c2"), page(["b"], null)];
    const qc = new QueryClient();
    const options = cardSearchQuery("ver", "d1");
    await qc.fetchInfiniteQuery(options);
    const query = qc.getQueryCache().find({ queryKey: options.queryKey });
    expect(options.getNextPageParam(page(["a"], "c1"), [], undefined, [])).toBe("c1");
    expect(options.getNextPageParam(page([], "c2"), [], "c1", [])).toBe("c2");
    expect(options.getNextPageParam(page(["b"], null), [], "c2", [])).toBeUndefined();
    expect(query).toBeDefined();

    const params = new URL(urls[0] ?? "", "http://x").searchParams;
    expect(params.get("query")).toBe("ver");
    expect(params.get("deckId")).toBe("d1");
    expect(params.has("cursor")).toBe(false);
  });

  it("sends the cursor for a later page", async () => {
    pages = [page(["a"], "c1"), page(["b"], null)];
    const qc = new QueryClient();
    const options = cardSearchQuery("ver");
    await qc.fetchInfiniteQuery({ ...options, pages: 2 });
    expect(urls).toHaveLength(2);
    const second = new URL(urls[1] ?? "", "http://x").searchParams;
    expect(second.get("cursor")).toBe("c1");
    expect(second.has("deckId")).toBe(false);
  });
});
