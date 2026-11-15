import { beforeEach, describe, expect, it } from "vitest";
import { promiseJoin, resume, resumeStep, takeJoin } from "./join-intent";

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

describe("coming back to a promised link", () => {
  it("shows the deck when the learner left Welcome without signing in", () => {
    expect(resumeStep("out", "signed-out")).toBe("show");
    expect(resume({ status: "waiting" }, { type: "show" })).toEqual({ status: "none" });
  });

  it("waits while a new session's preview still says signed out", () => {
    expect(resumeStep("pending", undefined)).toBe("wait");
    expect(resumeStep("in", "signed-out")).toBe("wait");
    expect(resumeStep("in", undefined)).toBe("wait");
  });

  it("joins for a visitor and lets the promise go for anyone already in the deck", () => {
    expect(resumeStep("in", "visitor")).toBe("join");
    expect(resumeStep("in", "member")).toBe("drop");
    expect(resumeStep("in", "owner")).toBe("drop");
  });

  it("shows the deck again when the join fails", () => {
    const joining = resume({ status: "waiting" }, { type: "join" });
    expect(joining).toEqual({ status: "joining" });
    expect(resume(joining, { type: "show" })).toBe(joining);
    expect(resume(joining, { type: "settled" })).toEqual({ status: "none" });
  });
});
