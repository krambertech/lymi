import { afterEach, describe, expect, it, vi } from "vitest";
import { log, logFailure, warnOnce } from "./log";

class DrizzleQueryError extends Error {}

const card = { id: "00mg3k9x1abcdefghij", term: "sbrigarsi", meaning: "to hurry up" };
const userId = "Yw3kQ8vTzR1mNb6xLp0cJd5sHf2gAe9u";

function lines(level: "error" | "warn" = "error") {
  const spy = vi.spyOn(console, level).mockImplementation(() => {});
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
    logFailure("readwise_pull_failed", { userId })(new TypeError("to hurry up"));
    log.error("request_failed", { error: new DOMException("to hurry up", "TimeoutError") });
    expect(logged()).toEqual([
      { event: "request_failed", error: "DrizzleQueryError", code: "D1_ERROR" },
      { event: "readwise_pull_failed", userId, error: "TypeError" },
      { event: "request_failed", error: "TimeoutError" },
    ]);
  });

  it("keeps one word of learner text out of an error's class and code", () => {
    const logged = lines();
    const named = Object.assign(new Error(card.term), { name: card.term, code: card.term });
    log.error("request_failed", { error: named });
    log.error("request_failed", { error: card.term });
    log.error("request_failed", { error: Object.assign(new Error("x"), { code: "E_NO_ROOM" }) });
    expect(logged()).toEqual([
      { event: "request_failed", error: "Error" },
      { event: "request_failed", error: "string" },
      { event: "request_failed", error: "Error", code: "E_NO_ROOM" },
    ]);
  });

  it("refuses text the types can see", () => {
    const logged = lines();
    log.error("request_failed", {
      // @ts-expect-error a learner's text is not a fixed word
      outcome: card.meaning,
      // @ts-expect-error nor is text a template carries
      note: `kept ${card.term} of mine`,
      // @ts-expect-error nor an object that holds it
      card,
      // @ts-expect-error nor a field the log has no shape for, whatever it holds
      cardId: "sbrigarsi",
    });
    expect(logged()).toEqual([
      {
        event: "request_failed",
        outcome: "redacted",
        note: "redacted",
        card: null,
        cardId: "redacted",
      },
    ]);
  });

  it("refuses a field of any, and redacts the fields of an any the types cannot see", () => {
    const logged = lines();
    const reply = JSON.parse('{"term":"sbrigarsi","cardId":"sbrigarsi"}');
    // @ts-expect-error it could be a learner's text
    log.error("request_failed", { outcome: reply.term });
    log.error("request_failed", reply);
    expect(logged()[1]).toEqual({ event: "request_failed", term: "redacted", cardId: "redacted" });
  });

  it("redacts one word of learner text from every field with a shape but language and slug", () => {
    const logged = lines();
    const { term } = card;
    log.error("request_failed", {
      deckId: term,
      errorClass: term,
      importId: term,
      method: term,
      model: term,
      route: term,
      tool: term,
      userId: term,
    });
    expect(new Set(Object.values(logged()[0]))).toEqual(new Set(["request_failed", "redacted"]));
  });

  it("refuses an event built from text", () => {
    const logged = lines();
    // @ts-expect-error the event is one of a fixed list
    log.error(`lookup of ${card.term} failed`);
    expect(logged()).toHaveLength(1);
  });

  it("keeps ids, counts and fixed words", () => {
    const logged = lines();
    const fields = {
      deckId: card.id,
      userId,
      failed: 2,
      language: "et",
      route: "/api/cards/:id",
      tool: "add_cards",
      model: "gpt-5",
    };
    log.error("request_failed", { ...fields, trigger: "add" });
    expect(logged()).toEqual([{ event: "request_failed", ...fields, trigger: "add" }]);
  });

  it("warns of a bulk failure once for each thing that fails", () => {
    const logged = lines("warn");
    for (const dataset of ["health", "events", "health"] as const) {
      warnOnce("metric_write_failed", { dataset, error: new Error("full") });
    }
    expect(logged().map((line) => line.dataset)).toEqual(["health", "events"]);
  });
});
