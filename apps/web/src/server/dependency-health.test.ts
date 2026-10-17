import { describe, expect, it, vi } from "vitest";
import { metered, meteredFetch, outcomeOfError, outcomeOfStatus } from "./dependency-health";

function health() {
  const writeDataPoint = vi.fn();
  return {
    env: {
      HEALTH: { writeDataPoint } as unknown as AnalyticsEngineDataset,
      CF_VERSION_METADATA: { tag: "abc123" },
    },
    rows: () =>
      writeDataPoint.mock.calls.map(([point]) => ({
        dependency: point.indexes[0],
        blobs: point.blobs,
      })),
  };
}

describe("dependency outcomes", () => {
  it.each([
    [200, "ok"],
    [204, "ok"],
    [302, "failed"],
    [400, "rejected"],
    [401, "rejected"],
    [429, "limited"],
    [500, "failed"],
    [503, "failed"],
  ])("reads HTTP %s as %s", (status, outcome) => {
    expect(outcomeOfStatus(status)).toBe(outcome);
  });

  it("tells a timeout from an unreachable service", () => {
    expect(outcomeOfError(new DOMException("slow", "TimeoutError"))).toBe("timeout");
    expect(outcomeOfError(new TypeError("Invalid redirect value"))).toBe("unreachable");
  });
});

describe("meteredFetch", () => {
  it("records each response's status class and the deployed version", async () => {
    const { env, rows } = health();
    const request = meteredFetch(
      env,
      "openai_text",
      "traffic",
      async () => new Response("", { status: 503 }),
    );
    await request("https://gateway.example/openai");
    expect(rows()).toEqual([
      { dependency: "openai_text", blobs: ["call", "failed", "5xx", "traffic", "abc123"] },
    ]);
  });

  it("records a thrown fetch as unreachable and rethrows it", async () => {
    const { env, rows } = health();
    const thrown = new TypeError("Invalid redirect value");
    const request = meteredFetch(env, "anthropic", "canary", async () => {
      throw thrown;
    });
    await expect(request("https://gateway.example/anthropic")).rejects.toBe(thrown);
    expect(rows()).toEqual([
      { dependency: "anthropic", blobs: ["call", "unreachable", "none", "canary", "abc123"] },
    ]);
  });

  it("does nothing without the dataset", async () => {
    const response = await meteredFetch(
      {},
      "site",
      "canary",
      async () => new Response("ok"),
    )("https://lymi.app/api/health");
    expect(response.ok).toBe(true);
  });
});

describe("metered", () => {
  it("records a binding call that resolved and one that threw", async () => {
    const { env, rows } = health();
    await metered(env, "email", async () => "sent");
    await expect(
      metered(env, "workers_ai", async () => {
        throw new Error("model unavailable");
      }),
    ).rejects.toThrow("model unavailable");
    expect(rows().map((row) => [row.dependency, row.blobs[1]])).toEqual([
      ["email", "ok"],
      ["workers_ai", "failed"],
    ]);
  });
});
