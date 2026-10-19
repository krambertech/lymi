import { afterEach, describe, expect, it, vi } from "vitest";
import { runCanary } from "./canary";
import type { Bindings } from "./env";

const GATEWAY = "https://gateway.ai.cloudflare.com/v1/acct/lymi";

function production(fetch: (url: string) => Promise<Response>) {
  const writeDataPoint = vi.fn();
  vi.stubGlobal(
    "fetch",
    vi.fn((input: RequestInfo | URL) => fetch(String(input))),
  );
  const env = {
    PUBLIC_SITE_URL: "https://lymi.app",
    OPENAI_API_KEY: "openai-key",
    ANTHROPIC_API_KEY: "anthropic-key",
    AI_GATEWAY_URL: GATEWAY,
    AI_GATEWAY_TOKEN: "gateway-token",
    AI_GATEWAY_ID: "lymi",
    CF_VERSION_METADATA: { id: "v", tag: "abc123", timestamp: "" },
    HEALTH: { writeDataPoint },
    DB: { prepare: () => ({ first: async () => ({ 1: 1 }) }) },
    SESSIONS: { get: async () => null },
    AUDIO: { head: async () => null },
    AI: { run: async () => ({ answers: { worth: { noul: 0.8 } } }) },
  } as unknown as Bindings;
  const checks = () =>
    Object.fromEntries(
      writeDataPoint.mock.calls
        .map(([point]) => point)
        .filter((point) => point.blobs[0] === "check")
        .map((point) => [point.indexes[0], point.blobs[1]]),
    );
  const calls = () =>
    writeDataPoint.mock.calls
      .map(([point]) => point)
      .filter((point) => point.blobs[0] === "call")
      .map((point) => [point.indexes[0], point.blobs[1], point.blobs[3]]);
  return { env, checks, calls };
}

function healthy(url: string): Promise<Response> {
  if (url === "https://lymi.app/api/health") return Promise.resolve(Response.json({ ok: true }));
  if (url === `${GATEWAY}/openai/chat/completions`) {
    return Promise.resolve(
      Response.json({ choices: [{ message: { content: '{"ok":true}' }, finish_reason: "stop" }] }),
    );
  }
  if (url === `${GATEWAY}/anthropic/v1/messages`) return Promise.resolve(Response.json({}));
  return Promise.reject(new Error(`unexpected request to ${url}`));
}

async function run(env: Bindings, at: Date) {
  vi.useFakeTimers({ toFake: ["setTimeout"] });
  const done = runCanary(env, at);
  // Past every retry wait but bounded: the unit worker's shared local runtime re-arms its socket timers on this clock, so running all timers may never end.
  await vi.advanceTimersByTimeAsync(10_000);
  await done;
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("production canary", () => {
  it("records one passing verdict per service, leaving speech to the hourly run", async () => {
    const { env, checks } = production(healthy);
    await run(env, new Date("2026-10-17T11:20:00Z"));
    expect(checks()).toEqual({
      d1: "ok",
      kv: "ok",
      r2: "ok",
      site: "ok",
      openai_text: "ok",
      anthropic: "ok",
      workers_ai: "ok",
    });
  });

  it("checks each configured speech provider once an hour, ElevenLabs through Estonian", async () => {
    const { env, checks } = production(healthy);
    const voiced = { ...env, ELEVENLABS_API_KEY: "eleven", GEMINI_API_KEY: "gemini" } as Bindings;
    await run(voiced, new Date("2026-10-17T11:05:00Z"));
    expect(Object.keys(checks())).toEqual(
      expect.arrayContaining(["elevenlabs", "gemini_speech", "openai_speech"]),
    );
  });

  it("checks hourly that the deployed key may call the Japanese context model", async () => {
    const context = `${GATEWAY}/google-ai-studio/v1beta/models/gemini-2.5-flash-lite:generateContent`;
    const reply = (previousText: string) =>
      Response.json({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ text: JSON.stringify({ previousText }) }] },
          },
        ],
      });
    const at = new Date("2026-10-17T11:05:00Z");
    for (const [answer, verdict] of [
      [() => reply("海を渡る"), "ok"],
      [() => reply("ふね"), "ok"],
      [() => new Response("denied", { status: 403 }), "failed"],
    ] as const) {
      const { env, checks } = production((url) =>
        url === context ? Promise.resolve(answer()) : healthy(url),
      );
      await run({ ...env, GEMINI_API_KEY: "gemini" } as Bindings, at);
      expect(checks().gemini_text).toBe(verdict);
    }
  });

  it("fails the AI checks when every provider request throws, as on 17 October", async () => {
    const { env, checks, calls } = production((url) =>
      url.startsWith(GATEWAY)
        ? Promise.reject(new TypeError("Invalid redirect value"))
        : healthy(url),
    );
    await run(env, new Date("2026-10-17T11:20:00Z"));
    expect(checks()).toMatchObject({
      site: "ok",
      openai_text: "unreachable",
      anthropic: "unreachable",
    });
    expect(calls()).toContainEqual(["openai_text", "unreachable", "canary"]);
  });

  it("fails the text check when production has lost its key", async () => {
    const { env, checks } = production(healthy);
    await run({ ...env, OPENAI_API_KEY: "" } as Bindings, new Date("2026-10-17T11:20:00Z"));
    expect(checks().openai_text).toBe("failed");
  });

  it("fails Workers AI when the model gives no score", async () => {
    const { env, checks } = production(healthy);
    const broken = { ...env, AI: { run: async () => ({}) } } as unknown as Bindings;
    await run(broken, new Date("2026-10-17T11:20:00Z"));
    expect(checks().workers_ai).toBe("failed");
  });
});
