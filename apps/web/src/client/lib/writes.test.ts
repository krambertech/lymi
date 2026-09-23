import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
let full = false;
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    if (full) {
      full = false;
      throw new Error("QuotaExceededError");
    }
    store.set(k, v);
  },
  removeItem: (k: string) => store.delete(k),
});

const calls: string[] = [];
const answers: (() => unknown)[] = [];
const next = (kind: string) => {
  calls.push(kind);
  const answer = answers.shift();
  return Promise.resolve().then(() => (answer ? answer() : { ok: true }));
};
vi.mock("./api", async () => {
  class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    ApiError,
    api: {
      addCard: (input: { id: string }) => next(`add ${input.id}`),
      updateCard: (id: string) => next(`update ${id}`),
      archiveCard: (id: string) => next(`archive ${id}`),
      restoreCard: (id: string) => next(`restore ${id}`),
      createDeck: (input: { id: string }) => next(`create ${input.id}`),
      updateDeck: (id: string) => next(`update ${id}`),
      archiveDeck: (id: string) => next(`archive ${id}`),
      restoreDeck: (id: string) => next(`restore ${id}`),
    },
  };
});
const flushGrades = vi.fn(async (_before?: string) => 0);
vi.mock("./grades", () => ({ flushOutbox: (before?: string) => flushGrades(before) }));

const { ApiError } = await import("./api");
const w = await import("./writes");

const offline = () => {
  throw new ApiError(0, "offline");
};
const fail = (status: number) => () => {
  throw new ApiError(status, `status ${status}`);
};
const add = (id: string, deckId = "deck") =>
  ({ kind: "card.add", input: { id, deckId, term: id } }) as const;
const edit = (id: string) => ({ kind: "card.update", id, patch: { meaning: "m" } }) as const;

beforeEach(() => {
  store.clear();
  calls.length = 0;
  answers.length = 0;
  flushGrades.mockClear();
  w.resetWriteCache();
  w.claimWrites("me");
  vi.useRealTimers();
});

describe("submitting a write", () => {
  it("sends it at once and hands back the server's answer", async () => {
    answers.push(() => ({ status: "added", card: { id: "a" } }));
    expect(await w.submit(add("a"), "a")).toEqual({
      status: "sent",
      value: { status: "added", card: { id: "a" } },
    });
    expect(w.pendingWrites()).toBe(0);
  });

  it("keeps it on the device offline and sends it, in order, once the connection returns", async () => {
    answers.push(offline);
    expect(await w.submit(add("a"), "a")).toEqual({ status: "queued" });
    answers.push(offline);
    expect(await w.submit(edit("a"), "a")).toEqual({ status: "queued" });
    expect(w.pendingWrites()).toBe(2);

    calls.length = 0;
    expect((await w.flushWrites()).sent).toBe(2);
    expect(calls).toEqual(["add a", "update a"]);
    expect(w.pendingWrites()).toBe(0);
  });

  it("survives a reload, because the queue is read back from storage", async () => {
    answers.push(offline);
    await w.submit(add("a"), "a");
    w.resetWriteCache();
    expect(w.writeStore.snapshot()).toMatchObject([{ write: { kind: "card.add" } }]);
  });

  it("throws a refusal, as the plain request would", async () => {
    answers.push(fail(400));
    await expect(w.submit(add("a"), "a")).rejects.toMatchObject({ status: 400 });
    expect(w.pendingWrites()).toBe(0);
  });
});

describe("flushing", () => {
  it("holds a write that failed on the server, and every later write to the same card", async () => {
    vi.useFakeTimers();
    answers.push(fail(503));
    await w.submit(add("a"), "a");
    // Held behind the add, so it is not even tried.
    await w.submit(edit("a"), "a");
    expect(calls).toEqual(["add a"]);
    calls.length = 0;
    // Another card goes past; the one that failed and its edit wait for the backoff.
    answers.push(() => ({ status: "added", card: { id: "b" } }));
    await w.submit(add("b"), "b");
    expect(calls).toEqual(["add b"]);
    expect(w.pendingWrites()).toBe(2);

    await vi.advanceTimersByTimeAsync(w.backoff(1));
    expect(calls).toEqual(["add b", "add a", "update a"]);
    expect(w.pendingWrites()).toBe(0);
  });

  it("drops a refused create with everything that needed it, and says so once", async () => {
    const notices: unknown[] = [];
    const stop = w.onNotice((n) => notices.push(n));
    answers.push(offline);
    await w.submit(add("a"), "aitäh");
    answers.push(offline);
    await w.submit(edit("a"), "aitäh");
    answers.push(offline);
    await w.submit(add("b"), "b");

    calls.length = 0;
    answers.push(fail(404));
    await w.flushWrites();
    stop();
    expect(calls).toEqual(["add a", "add b"]);
    expect(w.pendingWrites()).toBe(0);
    expect(notices).toEqual([{ reason: "refused", label: "aitäh", message: "status 404" }]);
  });

  it("drops the writes to an add the server skipped as a duplicate", async () => {
    const notices: unknown[] = [];
    const stop = w.onNotice((n) => notices.push(n));
    answers.push(offline);
    await w.submit(add("a"), "magari");
    answers.push(offline);
    await w.submit(edit("a"), "magari");

    calls.length = 0;
    answers.push(() => ({ status: "skipped", term: "magari", deckName: "Italian" }));
    await w.flushWrites();
    stop();
    expect(calls).toEqual(["add a"]);
    expect(notices).toEqual([{ reason: "skipped", label: "magari", deckName: "Italian" }]);
  });

  it("stops at a lapsed session and keeps everything for after sign-in", async () => {
    answers.push(offline);
    await w.submit(add("a"), "a");
    answers.push(offline);
    await w.submit(add("b"), "b");
    calls.length = 0;
    answers.push(fail(401));
    expect(await w.flushWrites()).toMatchObject({ sent: 0, stopped: true });
    expect(calls).toEqual(["add a"]);
    expect(w.pendingWrites()).toBe(2);
  });

  it("sends the grades made before each write ahead of it", async () => {
    answers.push(offline);
    await w.submit(add("a"), "a");
    const [queued] = w.writeStore.snapshot();
    flushGrades.mockClear();
    await w.flushWrites();
    expect(flushGrades.mock.calls).toEqual([
      [new Date(queued?.at ?? 0).toISOString()],
      [undefined],
    ]);
  });

  it("skips an entry it cannot read without losing the rest", async () => {
    store.set(
      "lymi-writes",
      JSON.stringify([{ nope: true }, { key: "k", at: 1, write: add("a"), label: "a" }]),
    );
    w.resetWriteCache();
    expect(w.writeStore.snapshot()).toHaveLength(1);
  });

  it("sends nothing until the queue is known to be the signed-in learner's", async () => {
    w.resetWriteCache();
    await w.submit(add("a"), "a");
    expect(calls).toEqual([]);
    w.claimWrites("me");
    await w.flushWrites();
    expect(calls).toEqual(["add a"]);
  });

  it("drops another learner's queue when a different account signs in", async () => {
    answers.push(offline);
    await w.submit(add("a"), "a");
    w.claimWrites("someone-else");
    w.resetWriteCache();
    expect(w.pendingWrites()).toBe(0);
  });

  it("makes room by dropping the query cache when storage is full", async () => {
    store.set("lymi-query-cache", "x".repeat(10));
    full = true;
    answers.push(offline);
    await w.submit(add("a"), "a");
    expect(store.has("lymi-query-cache")).toBe(false);
    expect(JSON.parse(store.get("lymi-writes") ?? "[]")).toHaveLength(1);
  });
});
