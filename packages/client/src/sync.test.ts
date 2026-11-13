import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureForTest } from "./test/configure";

configureForTest(new Map());

const checkToday = vi.fn(async () => ({}));
vi.mock("./api", () => ({ api: { checkToday: () => checkToday() } }));

const { afterFlush, startDayTurn } = await import("./sync");

const KEYS = [["decks"], ["rounds"], ["streak"], ["queue", "all", "draw"], ["insights", 30]];

function cache() {
  const qc = new QueryClient();
  for (const key of KEYS) qc.setQueryData(key, {});
  return qc;
}
const refreshed = (qc: QueryClient) =>
  KEYS.filter((key) => qc.getQueryState(key)?.isInvalidated).map((key) => key[0]);
const ALL = ["decks", "rounds", "streak", "queue", "insights"];

const landed = { sent: 0, waited: 0, graded: 0, stopped: false, retryAt: null };

describe("after a flush", () => {
  it("refreshes everything the day holds once a grade replayed, with no write beside it", () => {
    const qc = cache();
    afterFlush(qc, { ...landed, graded: 1 });
    expect(refreshed(qc)).toEqual(ALL);
  });

  it("refreshes it once a queued write replayed", () => {
    const qc = cache();
    afterFlush(qc, { ...landed, sent: 2, waited: 1 });
    expect(refreshed(qc)).toEqual(ALL);
  });

  it("leaves a write its caller waited on to that caller", () => {
    const qc = cache();
    afterFlush(qc, { ...landed, sent: 1, waited: 1 });
    expect(refreshed(qc)).toEqual([]);
  });

  it("does nothing when nothing landed", () => {
    const qc = cache();
    afterFlush(qc, landed);
    expect(refreshed(qc)).toEqual([]);
  });
});

describe("the turn of the day", () => {
  let back: () => void;
  const stopWatching = vi.fn();
  const platform = (inFront: boolean) => ({
    onForeground: (listener: () => void) => {
      back = listener;
      return stopWatching;
    },
    inFront: () => inFront,
  });

  beforeEach(() => {
    vi.useFakeTimers();
    checkToday.mockClear();
    stopWatching.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("refreshes the day and settles it at the end of the day, not before", async () => {
    const qc = cache();
    const stop = startDayTurn(qc, Date.now() + 1000, platform(true));
    await vi.advanceTimersByTimeAsync(1000);
    expect(refreshed(qc)).toEqual([]);
    await vi.advanceTimersByTimeAsync(50);
    expect(refreshed(qc)).toEqual(ALL);
    expect(checkToday).toHaveBeenCalledOnce();
    stop();
  });

  it("refreshes a background tab without settling a day nobody opened", async () => {
    const qc = cache();
    const stop = startDayTurn(qc, Date.now() + 1000, platform(false));
    await vi.advanceTimersByTimeAsync(1050);
    expect(refreshed(qc)).toEqual(ALL);
    expect(checkToday).not.toHaveBeenCalled();
    stop();
  });

  it("turns when the app comes back after a timer that slept", async () => {
    const qc = cache();
    const stop = startDayTurn(qc, Date.now() + 1000, platform(true));
    back();
    expect(refreshed(qc)).toEqual([]);

    vi.setSystemTime(Date.now() + 1000);
    back();
    await vi.advanceTimersByTimeAsync(0);
    expect(refreshed(qc)).toEqual(ALL);
    expect(checkToday).toHaveBeenCalledOnce();
    stop();
  });

  it("only fetches the draw when it was kept from an earlier day", async () => {
    const qc = cache();
    const stop = startDayTurn(qc, Date.now() - 1000, platform(true));
    await vi.advanceTimersByTimeAsync(1000);
    expect(refreshed(qc)).toEqual(["queue"]);
    expect(checkToday).not.toHaveBeenCalled();
    stop();
  });

  it("stops the timer and the watching", async () => {
    const qc = cache();
    startDayTurn(qc, Date.now() + 1000, platform(true))();
    await vi.advanceTimersByTimeAsync(2000);
    expect(refreshed(qc)).toEqual([]);
    expect(stopWatching).toHaveBeenCalledOnce();
  });
});
