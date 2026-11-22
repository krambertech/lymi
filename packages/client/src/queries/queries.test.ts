import {
  dehydrate,
  environmentManager,
  focusManager,
  InfiniteQueryObserver,
  onlineManager,
  QueryClient,
  QueryObserver,
} from "@tanstack/react-query";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import * as queries from ".";
import type { Card, DeckTags } from "../api";
import { outboxDehydrateOptions, shouldPersistQuery } from "../cache";
import { recordGrade, resetGradeCache } from "../grades";
import { configureForTest } from "../test/configure";
import { bindWriteCache, claimWrites, resetWriteCache, submit } from "../writes";

const store = new Map<string, string>();
configureForTest(store, { baseUrl: "https://lymi.test" });

const asked: string[] = [];
let answer: (path: string) => unknown = () => ({});

beforeAll(() => environmentManager.setIsServer(() => false));

beforeEach(() => {
  vi.useFakeTimers({ now: new Date("2026-10-12T12:00:00Z") });
  store.clear();
  resetGradeCache();
  resetWriteCache();
  claimWrites("me");
  asked.length = 0;
  answer = () => ({});
  vi.stubGlobal("fetch", async (input: string) => {
    const path = new URL(input).pathname;
    asked.push(path);
    return Response.json(answer(path));
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  focusManager.setFocused(undefined);
  onlineManager.setOnline(true);
});

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } });

function watched(options: unknown, data: unknown, refetchOnMount = false) {
  const qc = client();
  const { queryKey } = options as { queryKey: readonly unknown[] };
  qc.setQueryData(queryKey, data);
  const watch = { ...(options as object), ...(refetchOnMount ? {} : { refetchOnMount: false }) };
  const observer =
    "getNextPageParam" in watch
      ? new InfiniteQueryObserver(qc, watch as never)
      : new QueryObserver(qc, watch as never);
  qc.mount();
  const unsubscribe = observer.subscribe(() => {});
  const stop = () => {
    unsubscribe();
    qc.unmount();
    qc.clear();
  };
  return { observer, stop };
}

async function polls(options: unknown, data: unknown) {
  const { stop } = watched(options, data);
  await vi.advanceTimersByTimeAsync(5_000);
  stop();
  return asked.length > 0;
}

describe("what this device keeps", () => {
  it("keeps only these reads, and no link, search, import, member or catalogue", () => {
    const qc = client();
    const built = Object.entries(queries).flatMap(([name, value]) => {
      if (!name.endsWith("Query")) return [];
      const options =
        typeof value === "function"
          ? (value as (...args: string[]) => unknown)("one", "two")
          : value;
      const query = qc.getQueryCache().build(qc, options as never);
      query.setData({});
      return [{ name, hash: query.queryHash }];
    });
    const kept = (options: Parameters<typeof dehydrate>[1]) => {
      const hashes = new Set(dehydrate(qc, options).queries.map((query) => query.queryHash));
      return built.flatMap(({ name, hash }) => (hashes.has(hash) ? [name] : [])).sort();
    };
    const reads = [
      "archivedCardPagesQuery",
      "archivedCardsQuery",
      "archivedDecksQuery",
      "archivedSectionsQuery",
      "avatarQuery",
      "cardHistoryQuery",
      "connectedAppsQuery",
      "deckCardsQuery",
      "deckTagsQuery",
      "decksQuery",
      "deletionQuery",
      "drawQuery",
      "insightsQuery",
      "keysQuery",
      "meQuery",
      "queueQuery",
      "readwiseQuery",
      "roundsQuery",
      "sectionsQuery",
      "seriesQuery",
      "settingsQuery",
      "streakQuery",
      "tagsQuery",
    ];
    expect(kept({ shouldDehydrateQuery: shouldPersistQuery })).toEqual(reads);
    expect(kept(outboxDehydrateOptions)).toEqual(reads);
  });
});

describe("a kept copy", () => {
  it.each([
    ["decks", queries.decksQuery, []],
    ["series", queries.seriesQuery, []],
    ["rounds", queries.roundsQuery, {}],
    ["insights", queries.insightsQuery(30), {}],
    ["a deck's sections", queries.sectionsQuery("d1"), {}],
    ["the account's deletion", queries.deletionQuery, {}],
    ["tags", queries.tagsQuery, []],
  ])("of %s is read again as soon as a screen opens", async (_, options, data) => {
    const { stop } = watched(options, data, true);
    await vi.advanceTimersByTimeAsync(5_000);
    stop();
    expect(asked).toHaveLength(1);
  });

  it("of one period's insights stays on screen while the next period loads", () => {
    const { observer, stop } = watched(queries.insightsQuery(30), { reviews: 30 });
    observer.setOptions(queries.insightsQuery(90) as never);
    expect(observer.getCurrentResult()).toMatchObject({
      data: { reviews: 30 },
      isPlaceholderData: true,
    });
    stop();
  });
});

describe("a deck's cards while AI works", () => {
  const row = (card: Partial<Card>) => [
    { card: { id: "c", updatedAt: "2026-10-12T11:59:00Z", ...card }, state: null },
  ];
  const cards = queries.deckCardsQuery("d1");

  it.each([
    ["fills a card", { enrichmentStatus: "working" }],
    ["translates an example", { exampleTranslationStatus: "working" }],
  ] as const)("are read again while AI %s", async (_, card) => {
    expect(await polls(cards, row(card as Partial<Card>))).toBe(true);
  });

  it("are left alone once nothing is working", async () => {
    expect(await polls(cards, row({ enrichmentStatus: null }))).toBe(false);
  });

  it("are no longer asked for once a run has worked ten minutes, which a server that stopped answering never ends", async () => {
    const updatedAt = "2026-10-12T11:49:59Z" as unknown as Date;
    expect(await polls(cards, row({ enrichmentStatus: "working", updatedAt }))).toBe(false);
  });
});

describe("Activity", () => {
  const importing = { entries: [{ import: { status: "importing" } }], nextCursor: null };
  const pages = (n: number) => ({
    pages: Array.from({ length: n }, () => importing),
    pageParams: Array.from({ length: n }, () => undefined),
  });

  it("follows a file on its way while one page is loaded", async () => {
    expect(await polls(queries.activityQuery, pages(1))).toBe(true);
  });

  it("never reads a longer log again every few seconds", async () => {
    expect(await polls(queries.activityQuery, pages(2))).toBe(false);
  });
});

describe("what a review draws from", () => {
  const queue = queries.queueQuery({}, "forgotten");
  const draw = queries.drawQuery({});
  const items = { total: 0, items: [] };
  const drawn = { cards: [], log: [] };
  const queuedGrade = () =>
    recordGrade({
      cardId: "c",
      mode: { cue: "term", target: "meaning" },
      rating: 3,
      reviewedAt: "2026-10-12T11:59:00Z",
    });

  it.each([
    ["a round", queue, items],
    ["the draw", draw, drawn],
  ])(
    "keeps the order %s began with when the learner comes back to it",
    async (_, options, data) => {
      const { stop } = watched(options, data);
      focusManager.setFocused(false);
      focusManager.setFocused(true);
      await vi.advanceTimersByTimeAsync(5_000);
      stop();
      expect(asked).toEqual([]);
    },
  );

  it("keeps a round's order when the connection returns", async () => {
    const { stop } = watched(queue, items);
    onlineManager.setOnline(false);
    onlineManager.setOnline(true);
    await vi.advanceTimersByTimeAsync(5_000);
    stop();
    expect(asked).toEqual([]);
  });

  it.each([
    ["a round's cards", queue],
    ["the rounds' counts", queries.roundsQuery],
  ])("sends the grades still on the device before the server works out %s", async (_, options) => {
    answer = () => {
      throw new TypeError("offline");
    };
    await queuedGrade();
    asked.length = 0;
    answer = (path) =>
      path === "/api/review/grade" ? { ok: true, duplicate: false, reviewId: "r" } : items;
    await client().fetchQuery(options as typeof queue);
    expect(asked[0]).toBe("/api/review/grade");
    expect(asked).toHaveLength(2);
  });

  it("holds a round until a slow grade has landed, since the server chooses its cards", async () => {
    answer = () => {
      throw new TypeError("offline");
    };
    await queuedGrade();
    const landed: string[] = [];
    vi.stubGlobal("fetch", async (input: string) => {
      const { pathname } = new URL(input);
      if (pathname === "/api/review/grade") await vi.advanceTimersByTimeAsync(15_000);
      landed.push(pathname);
      return Response.json({ ok: true, duplicate: false, reviewId: "r", ...items });
    });
    await client().fetchQuery(queue);
    expect(landed).toEqual(["/api/review/grade", "/api/review/queue"]);
  });

  it("is dated by when the read began, so a grade made while it was on its way is newer", async () => {
    const began = Date.now();
    vi.stubGlobal("fetch", async () => {
      await new Promise((resolve) => setTimeout(resolve, 4_000));
      return Response.json(drawn);
    });
    const reading = client().fetchQuery(draw);
    await vi.advanceTimersByTimeAsync(4_000);
    expect((await reading).fetchedAt).toBe(began);
  });
});

describe("a read while a card write waits on the device", () => {
  const card = { id: "c", deckId: "d1", term: "kass", tags: [] };

  async function archivedOffline() {
    const qc = client();
    bindWriteCache(qc);
    qc.setQueryData(["decks", "d1", "cards"], [{ card, state: null }]);
    answer = () => {
      throw new TypeError("offline");
    };
    await submit({ kind: "card.archive", id: "c" }, "kass");
    vi.stubGlobal("fetch", async (input: string) => {
      const path = new URL(input).pathname;
      if (path.endsWith("/archive")) throw new TypeError("offline");
      return Response.json(answer(path));
    });
    return qc;
  }

  it("shows a draw without the card it archives", async () => {
    const qc = await archivedOffline();
    answer = () => ({
      total: 1,
      cards: [{ card, modes: [{ mode: { cue: "term", target: "meaning" } }] }],
      log: [],
    });
    const reading = qc.fetchQuery(queries.drawQuery({}));
    await vi.advanceTimersByTimeAsync(10_000);
    expect((await reading).cards).toEqual([]);
  });

  it("shows the card it archives on the first page of Archived", async () => {
    const qc = await archivedOffline();
    answer = () => ({ cards: [], nextCursor: null, total: null });
    const reading = qc.fetchInfiniteQuery(queries.archivedCardPagesQuery);
    await vi.advanceTimersByTimeAsync(10_000);
    expect((await reading).pages[0]?.cards.map((c) => c.id)).toEqual(["c"]);
  });
});

describe("a deck's sections", () => {
  it("are out of date whenever the decks are, as after a review", () => {
    const qc = client();
    qc.setQueryData(queries.sectionsQuery("d1").queryKey, { sections: [], progress: null });
    void qc.invalidateQueries({ queryKey: queries.decksQuery.queryKey });
    expect(qc.getQueryState(queries.sectionsQuery("d1").queryKey)?.isInvalidated).toBe(true);
  });
});

describe("after a tag change", () => {
  it("shows the reply, and the deck's cards, the tag lists and Activity are read again", async () => {
    const qc = client();
    const followers = [["decks", "d1", "cards"], ["tags"], ["activity"]];
    for (const key of followers) qc.setQueryData(key, []);
    const next = { tags: [], archived: [] } as unknown as DeckTags;
    await queries.settleDeckTags(qc, "d1", next);
    expect(qc.getQueryData(queries.deckTagsQuery("d1").queryKey)).toBe(next);
    expect(followers.filter((key) => qc.getQueryState(key)?.isInvalidated)).toEqual(followers);
  });
});
