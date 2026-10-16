import { beforeEach, describe, expect, it } from "vitest";
import { promiseJoin, takeJoin } from "./join-intent";

describe("joining after sign-in", () => {
  beforeEach(() => {
    takeJoin("link:reset");
  });

  it("never joins for a link the learner did not press Join or Add to Library on", () => {
    expect(takeJoin("link:abc")).toBe(false);
  });

  it("joins once for the link that was pressed", () => {
    promiseJoin("link:abc");
    expect(takeJoin("link:other")).toBe(false);
    expect(takeJoin("link:abc")).toBe(true);
    expect(takeJoin("link:abc")).toBe(false);
  });

  it("lets go of a promise after an hour", () => {
    promiseJoin("add:deck", 0);
    expect(takeJoin("add:deck", 60 * 60_000)).toBe(false);
  });
});
