import { describe, expect, it } from "vitest";
import { nextArrivals } from "./arrivals";

describe("nextArrivals", () => {
  it("counts nothing on the first load", () => {
    const first = nextArrivals(null, ["a", "b"]);
    expect([...first.fresh]).toEqual([]);
    expect([...(first.seen ?? [])]).toEqual(["a", "b"]);
  });

  it("names only the cards that were never in the list", () => {
    const next = nextArrivals(new Set(["a", "b"]), ["c", "a"]);
    expect([...next.fresh]).toEqual(["c"]);
    // An archived card that comes back is not new to this list.
    expect([...nextArrivals(next.seen, ["b", "c"]).fresh]).toEqual([]);
  });

  it("waits for the list to load", () => {
    expect(nextArrivals(null, undefined)).toEqual({ seen: null, fresh: new Set() });
  });
});
