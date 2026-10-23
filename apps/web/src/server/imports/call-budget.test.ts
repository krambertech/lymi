import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { unstable_readConfig } from "wrangler";
import {
  CallBudget,
  CallBudgetSpent,
  FAILURE_RESERVE,
  isCallBudgetSpent,
  SUBREQUEST_LIMIT,
  stopOnSpent,
} from "./call-budget";

/** A binding shaped like D1 and Images: some calls build locally, the rest go out. */
function fakeBinding() {
  const sent: string[] = [];
  const statement = {
    bind: () => statement,
    run: async () => sent.push("run"),
  };
  const image = { transform: () => image, output: async () => sent.push("output") };
  return {
    sent,
    binding: {
      prepare: () => statement,
      batch: async () => sent.push("batch"),
      input: () => image,
      get: async () => sent.push("get"),
    },
  };
}

describe("a run's call budget", () => {
  it("counts the calls that go out, not the ones that build a statement or a transform", async () => {
    const budget = new CallBudget(100, 10);
    const { binding, sent } = fakeBinding();
    const db = budget.wrap(binding);
    await db.prepare().bind().run();
    await db.batch();
    await db.input().transform().output();
    await db.get();
    expect(sent).toEqual(["run", "batch", "output", "get"]);
    expect(budget.used).toBe(4);
  });

  it("refuses a call that would eat into the reserve, before sending it", async () => {
    const budget = new CallBudget(5, 2);
    const { binding, sent } = fakeBinding();
    const bucket = budget.wrap(binding);
    for (let i = 0; i < 3; i++) await bucket.get();
    expect(() => bucket.get()).toThrow(CallBudgetSpent);
    expect(sent).toHaveLength(3);
  });

  it("lets a failing run use the reserve for good, so calls that land later still go out", async () => {
    const budget = new CallBudget(5, 2);
    const { binding, sent } = fakeBinding();
    const bucket = budget.wrap(binding);
    for (let i = 0; i < 3; i++) await bucket.get();
    budget.startFailing();
    await bucket.get();
    // Later, as an event's settings lookup that runs after the failure step's work returned.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await bucket.get();
    expect(sent).toHaveLength(5);
  });

  it("turns running out of calls into the step's final error, and leaves other errors alone", async () => {
    class Final extends Error {}
    const spent = stopOnSpent(
      async () => {
        throw new CallBudgetSpent(9000);
      },
      (message) => new Final(message),
    );
    await expect(spent).rejects.toBeInstanceOf(Final);
    const other = stopOnSpent(
      async () => {
        throw new Error("network");
      },
      (message) => new Final(message),
    );
    await expect(other).rejects.not.toBeInstanceOf(Final);
    await expect(
      stopOnSpent(
        async () => 3,
        (m) => new Final(m),
      ),
    ).resolves.toBe(3);
  });

  it("is recognised by its message once it has crossed a step", () => {
    const crossed = new Error(new CallBudgetSpent(9000).message);
    expect(isCallBudgetSpent(crossed)).toBe(true);
    expect(isCallBudgetSpent(new Error("damaged"))).toBe(false);
  });

  it("matches the Worker's configured subrequest limit, and keeps a reserve inside it", () => {
    const config = unstable_readConfig(
      { config: fileURLToPath(new URL("../../../wrangler.jsonc", import.meta.url)) },
      { hideWarnings: true },
    );
    // Cloudflare's default on Workers Paid when wrangler.jsonc sets none.
    expect(SUBREQUEST_LIMIT).toBe(config.limits?.subrequests ?? 10_000);
    expect(FAILURE_RESERVE).toBeLessThan(SUBREQUEST_LIMIT / 2);
  });
});
