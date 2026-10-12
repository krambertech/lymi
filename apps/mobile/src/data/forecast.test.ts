import { QueryClient } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { followDueCounts } from "./forecast";

describe("followDueCounts", () => {
  let qc: QueryClient;
  let stop: () => void;

  beforeEach(() => {
    vi.useFakeTimers();
    qc = new QueryClient();
    qc.setQueryData(["decks"], []);
    qc.setQueryData(["insights", 30], { forecast: [] });
    stop = followDueCounts(qc, 1000);
  });

  afterEach(() => {
    stop();
    vi.useRealTimers();
  });

  const stale = () => qc.getQueryState(["insights", 30])?.isInvalidated;

  it("refetches the forecast once the due counts are refetched and settle", async () => {
    await qc.invalidateQueries({ queryKey: ["decks"] });
    expect(stale()).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(stale()).toBe(true);
  });

  it("waits for a run of grades to finish", async () => {
    const invalidate = vi.spyOn(qc, "invalidateQueries");
    for (let i = 0; i < 5; i++) {
      await qc.invalidateQueries({ queryKey: ["decks"] });
      qc.setQueryData(["decks"], []);
      vi.advanceTimersByTime(500);
    }
    expect(stale()).toBe(false);
    vi.advanceTimersByTime(1000);
    expect(stale()).toBe(true);
    expect(invalidate.mock.calls.filter(([f]) => f?.queryKey?.[0] === "insights")).toHaveLength(1);
  });

  it("catches a grade made while the due counts are still waiting to refetch", async () => {
    await qc.invalidateQueries({ queryKey: ["decks"] });
    vi.advanceTimersByTime(1000);
    qc.setQueryData(["insights", 30], { forecast: [] });
    // The deck request is still pending, so this second grade's invalidation emits nothing.
    await qc.invalidateQueries({ queryKey: ["decks"] });
    vi.advanceTimersByTime(1000);
    expect(stale()).toBe(false);
    // Its counts arriving is what follows it.
    qc.setQueryData(["decks"], [{ id: "d1" }]);
    vi.advanceTimersByTime(1000);
    expect(stale()).toBe(true);
  });

  it("ignores everything else", async () => {
    await qc.invalidateQueries({ queryKey: ["streak"] });
    qc.setQueryData(["streak"], {});
    vi.advanceTimersByTime(5000);
    expect(stale()).toBe(false);
  });

  it("stops following at sign-out", async () => {
    await qc.invalidateQueries({ queryKey: ["decks"] });
    stop();
    vi.advanceTimersByTime(5000);
    expect(stale()).toBe(false);
  });
});
