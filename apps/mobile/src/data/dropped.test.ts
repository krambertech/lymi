import type { StoredGrade } from "@lymi/client/grades";
import type { DrawData } from "@lymi/client/review-draw";
import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { withoutDropped } from "./dropped";

const at = "2026-10-14T08:00:00.000Z";
const sentAt = Date.parse(at) + 1_000;
const grade = {
  cardId: "a",
  mode: { cue: "term", target: "meaning" },
  rating: 3,
  reviewedAt: at,
  sentAt,
} as StoredGrade;
const draw = (log: { cardId: string; at: string }[], fetchedAt: number) =>
  ({ log, fetchedAt }) as unknown as DrawData & { fetchedAt: number };

describe("withoutDropped", () => {
  it("keeps a sent grade the server's draw still holds", () => {
    expect(withoutDropped([grade], draw([{ cardId: "a", at }], sentAt + 120_000))).toEqual([grade]);
  });

  it("drops a sent grade a draw read well after the send no longer holds", () => {
    expect(withoutDropped([grade], draw([], sentAt + 120_000))).toEqual([]);
  });

  it("keeps a sent grade a draw read too soon after the send may have missed", () => {
    expect(withoutDropped([grade], draw([], sentAt + 5_000))).toEqual([grade]);
  });

  it("keeps a sent grade when a card write patches a draw read before the send", () => {
    vi.useFakeTimers({ now: sentAt - 30_000 });
    const qc = new QueryClient();
    const key = ["queue", "all", "draw"];
    qc.setQueryData(key, { ...draw([], Date.now()), total: 0, cards: [] });
    vi.setSystemTime(sentAt + 120_000);
    // A card write patches the draw as `showWrite` does: the cache stamps it new, the log stays old.
    qc.setQueryData(key, (d: object | undefined) => d && { ...d, cards: [] });
    expect(qc.getQueryState(key)?.dataUpdatedAt).toBe(sentAt + 120_000);
    expect(withoutDropped([grade], qc.getQueryData(key))).toEqual([grade]);
    vi.useRealTimers();
  });

  it("keeps every grade before the first read lands", () => {
    expect(withoutDropped([grade], undefined)).toEqual([grade]);
  });

  it("keeps queued grades and undos, which have not reached the server", () => {
    const queued = { ...grade, sentAt: undefined };
    const undone = { ...grade, undone: true };
    expect(withoutDropped([queued, undone], draw([], sentAt + 120_000))).toEqual([queued, undone]);
  });
});
