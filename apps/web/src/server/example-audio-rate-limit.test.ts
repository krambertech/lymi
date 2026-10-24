import type { Context } from "hono";
import { describe, expect, it, vi } from "vitest";
import { exampleAudioAllowance } from "./example-audio-rate-limit";
import type { AppEnv } from "./index";

function learnerContext(userId: string, kv: Map<string, string>) {
  const SESSIONS = {
    get: async (key: string) => kv.get(key) ?? null,
    put: async (key: string, value: string) => void kv.set(key, value),
  };
  return { env: { SESSIONS }, get: () => ({ id: userId }) } as unknown as Context<AppEnv>;
}

describe("the example audio allowance", () => {
  it("gives each learner 100 new example clips a day, then says how long to wait", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const kv = new Map<string, string>();
    const kateryna = exampleAudioAllowance(learnerContext("kateryna", kv));
    for (let i = 0; i < 100; i++) {
      expect(await kateryna.left()).toBeNull();
      await kateryna.spend();
    }
    const wait = await kateryna.left();
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(24 * 60 * 60);
    expect(await exampleAudioAllowance(learnerContext("noor", kv)).left()).toBeNull();
  });
});
