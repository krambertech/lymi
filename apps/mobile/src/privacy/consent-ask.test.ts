import { describe, expect, it } from "vitest";
import { CLOSED, type ConsentEvent, consentAsk } from "./consent-ask";

const run = (...events: ConsentEvent[]) => events.reduce(consentAsk, CLOSED);

describe("the AI consent sheet", () => {
  it("answers yes when the sheet is swiped away while Turn on AI saves", () => {
    expect(
      run({ type: "ask" }, { type: "allow" }, { type: "close" }, { type: "dismissed" }),
    ).toEqual({ status: "saving", shown: false });
    expect(
      run(
        { type: "ask" },
        { type: "allow" },
        { type: "close" },
        { type: "dismissed" },
        { type: "saved", allowed: true },
      ),
    ).toEqual({ status: "closed", answer: true });
  });

  it("opens without the last error", () => {
    const failed = run({ type: "ask" }, { type: "allow" }, { type: "failed" });
    expect(failed).toEqual({ status: "open", failed: true });
    const reopened = consentAsk(
      consentAsk(consentAsk(failed, { type: "later" }), { type: "dismissed" }),
      { type: "ask" },
    );
    expect(reopened).toEqual({ status: "open", failed: false });
  });

  it("keeps one sheet for a second ask while it is open", () => {
    const open = run({ type: "ask" });
    expect(consentAsk(open, { type: "ask" })).toBe(open);
  });

  it("settles with the saved answer only once the sheet has gone", () => {
    const closing = run({ type: "ask" }, { type: "allow" }, { type: "saved", allowed: true });
    expect(closing).toEqual({ status: "closing", allowed: true });
    expect(consentAsk(closing, { type: "dismissed" })).toEqual({ status: "closed", answer: true });
  });

  it("answers no after Not now", () => {
    expect(run({ type: "ask" }, { type: "later" }, { type: "dismissed" })).toEqual(CLOSED);
  });
});
