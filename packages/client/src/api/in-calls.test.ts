import { CARD_BATCH_LIMIT } from "@lymi/core";
import { describe, expect, it, vi } from "vitest";
import { inCalls } from "./in-calls";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `c${i}`);
const archived = (chunk: string[]) =>
  Promise.resolve({ results: chunk.map((id) => ({ id, status: "archived" })) });

describe("a bulk card write", () => {
  it("sends a selection past the limit a call at a time, every card once", async () => {
    const send = vi.fn(archived);
    const out = await inCalls(ids(450), String, send);
    expect(send.mock.calls.map(([chunk]) => chunk.length)).toEqual([
      CARD_BATCH_LIMIT,
      CARD_BATCH_LIMIT,
      450 - 2 * CARD_BATCH_LIMIT,
    ]);
    expect(out.results.map((r) => r.id)).toEqual(ids(450));
  });

  it("returns the cards a failed call never reached as unavailable, beside those saved", async () => {
    const send = vi
      .fn(archived)
      .mockImplementationOnce(archived)
      .mockRejectedValueOnce(new Error("offline"));
    const out = await inCalls(ids(450), String, send);
    expect(send).toHaveBeenCalledTimes(2);
    expect(out.results.filter((r) => r.status === "archived")).toHaveLength(CARD_BATCH_LIMIT);
    expect(out.results.slice(CARD_BATCH_LIMIT)).toHaveLength(450 - CARD_BATCH_LIMIT);
    expect(out.results[CARD_BATCH_LIMIT]).toEqual({
      id: `c${CARD_BATCH_LIMIT}`,
      status: "error",
      code: "unavailable",
      error: "offline",
    });
  });

  it("throws when the first call fails, as a single call would", async () => {
    const send = vi.fn(() => Promise.reject(new Error("offline")));
    await expect(inCalls(ids(3), String, send)).rejects.toThrow("offline");
  });
});
