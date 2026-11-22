import { afterEach, describe, expect, it, vi } from "vitest";
import { log, logFailure } from "./log";

class DrizzleQueryError extends Error {}

const card = { id: "card-1", term: "sbrigarsi", meaning: "to hurry up" };

function lines() {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  return () => spy.mock.calls.map(([line]) => JSON.parse(String(line)));
}

describe("log", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reduces an error to its class and a fixed failure, never its message", () => {
    const logged = lines();
    const cause = new Error("D1_ERROR: no such column: sbrigarsi at offset 42: SQLITE_ERROR");
    log.error("request_failed", {
      error: new DrizzleQueryError("Failed query: select 1\nparams: to hurry up", { cause }),
    });
    logFailure("readwise_pull_failed", { userId: "user-1" })(new TypeError("to hurry up"));
    expect(logged()).toEqual([
      { event: "request_failed", error: "DrizzleQueryError", code: "D1_ERROR" },
      { event: "readwise_pull_failed", userId: "user-1", error: "TypeError" },
    ]);
  });

  it("redacts text that reaches a field past the types", () => {
    const logged = lines();
    log.error("request_failed", {
      // @ts-expect-error a learner's text is not a fixed word
      outcome: card.meaning,
      // @ts-expect-error nor is text a template carries
      note: `kept ${card.term} of mine`,
      // @ts-expect-error nor an object that holds it
      card,
    });
    expect(logged()).toEqual([
      { event: "request_failed", outcome: "redacted", note: "redacted", card: null },
    ]);
  });

  it("refuses an event built from text", () => {
    const logged = lines();
    // @ts-expect-error the event is one of a fixed list
    log.error(`lookup of ${card.term} failed`);
    expect(logged()).toHaveLength(1);
  });

  it("keeps ids, counts and fixed words", () => {
    const logged = lines();
    log.error("request_failed", { cardId: card.id, failed: 2, trigger: "add", language: "et" });
    expect(logged()).toEqual([
      { event: "request_failed", cardId: "card-1", failed: 2, trigger: "add", language: "et" },
    ]);
  });
});
