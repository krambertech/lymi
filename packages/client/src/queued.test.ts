import { beforeEach, describe, expect, it } from "vitest";
import { claimQueued, dropQueued } from "./queued";
import { configureForTest } from "./test/configure";

const store = new Map<string, string>();
configureForTest(store);

beforeEach(() => {
  store.clear();
  store.set("lymi-outbox", "[]");
  store.set("lymi-writes:a", "{}");
  store.set("lymi-last-deck", "d1");
});

describe("the queued outboxes", () => {
  it("stay with the learner who made them", () => {
    store.set("lymi-queued-for", "u1");
    claimQueued("u1");
    expect([...store.keys()]).toEqual(expect.arrayContaining(["lymi-outbox", "lymi-writes:a"]));
  });

  it("are dropped when someone else signs in", () => {
    store.set("lymi-queued-for", "u1");
    claimQueued("u2");
    expect(Object.fromEntries(store)).toEqual({ "lymi-last-deck": "d1", "lymi-queued-for": "u2" });
  });

  it("go entirely on sign-out, leaving what is not theirs", () => {
    store.set("lymi-queued-for", "u1");
    dropQueued();
    expect(Object.fromEntries(store)).toEqual({ "lymi-last-deck": "d1" });
  });
});
