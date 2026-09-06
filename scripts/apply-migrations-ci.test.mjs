import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyMigrations } from "./apply-migrations-ci.mjs";

describe("applyMigrations", () => {
  it("stops after the first successful apply", async () => {
    let attempts = 0;
    await applyMigrations({
      run: () => {
        attempts += 1;
        return { status: 0 };
      },
      delays: [1, 1],
    });
    assert.equal(attempts, 1);
  });

  it("retries a collision from another Worker build", async () => {
    let attempts = 0;
    const pauses = [];
    await applyMigrations({
      run: () => ({ status: ++attempts === 1 ? 1 : 0 }),
      pause: async (delay) => pauses.push(delay),
      delays: [2_000, 4_000],
      report: () => undefined,
    });
    assert.equal(attempts, 2);
    assert.deepEqual(pauses, [2_000]);
  });

  it("fails closed after the retry budget is exhausted", async () => {
    await assert.rejects(
      applyMigrations({
        run: () => ({ status: 1 }),
        pause: async () => undefined,
        delays: [1, 1],
        report: () => undefined,
      }),
      /failed after 3 attempts/,
    );
  });
});
