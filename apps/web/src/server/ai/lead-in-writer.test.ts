import { describe, expect, it, vi } from "vitest";
import { japanese } from "../lead-ins/japanese";
import { createLeadInWriter, LeadInError } from "./lead-in-writer";

const env = {
  OPENAI_API_KEY: "test-key",
  AI_GATEWAY_URL: "https://gateway.ai.cloudflare.com/v1/account/lymi",
  AI_GATEWAY_TOKEN: "test-token",
};
const input = { term: "橋", reading: "はし", meaning: "bridge" };
const request = { instructions: japanese.instructions, input };
const payload = (previousText: string | null, finish_reason = "stop") => ({
  choices: [{ finish_reason, message: { content: JSON.stringify({ previousText }) } }],
  usage: {
    prompt_tokens: 300,
    completion_tokens: 410,
    completion_tokens_details: { reasoning_tokens: 400 },
  },
});

describe("lead-in writer", () => {
  it("uses the gateway, a fixed cheap model and a capped output, with the policy's instructions", async () => {
    const fetch = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      Response.json(payload("川を渡る")),
    );
    expect(await createLeadInWriter(env, fetch)?.write(request)).toEqual({
      previousText: "川を渡る",
      inputTokens: 300,
      outputTokens: 410,
      reasoningTokens: 400,
      status: 200,
    });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(url).toBe(`${env.AI_GATEWAY_URL}/openai/chat/completions`);
    expect(init?.redirect).toBe("manual");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.headers).toMatchObject({
      "cf-aig-collect-log-payload": "false",
      "cf-aig-skip-cache": "true",
    });
    const body = JSON.parse(String(init?.body));
    expect(body.messages[0].content).toBe(japanese.instructions);
    expect(body).toMatchObject({
      model: "gpt-6-luna",
      reasoning_effort: "low",
      max_completion_tokens: 768,
    });
  });

  it("makes no automatic retry on timeout or an error status", async () => {
    const timeout = vi.fn(async () => {
      throw new DOMException("timeout", "TimeoutError");
    });
    await expect(createLeadInWriter(env, timeout)?.write(request)).rejects.toThrow();
    expect(timeout).toHaveBeenCalledOnce();
    const limited = vi.fn(async () => new Response("limited", { status: 429 }));
    await expect(createLeadInWriter(env, limited)?.write(request)).rejects.toMatchObject({
      reason: "failed",
      usage: { status: 429 },
    });
    expect(limited).toHaveBeenCalledOnce();
  });

  it("tells an unusable reply, which would come back the same, from an outage, and keeps its usage", async () => {
    const truncated = payload("川を渡る", "length");
    const error = await createLeadInWriter(env, async () => Response.json(truncated))
      ?.write(request)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LeadInError);
    expect(error).toMatchObject({
      reason: "refused",
      usage: { inputTokens: 300, outputTokens: 410, reasoningTokens: 400, status: 200 },
    });
    const garbled = createLeadInWriter(env, async () => new Response("not json"));
    await expect(garbled?.write(request)).rejects.toMatchObject({ reason: "failed" });
  });

  it("fails closed without a key or the gateway and refuses oversized replies", async () => {
    expect(createLeadInWriter({})).toBeNull();
    const fetch = vi.fn(async () => Response.json(payload("川を渡る")));
    await expect(
      createLeadInWriter({ OPENAI_API_KEY: "test" }, fetch)?.write(request),
    ).rejects.toThrow("Gateway");
    expect(fetch).not.toHaveBeenCalled();
    await expect(
      createLeadInWriter(env, async () => new Response("x".repeat(16_385)))?.write(request),
    ).rejects.toMatchObject({ reason: "failed" });
  });
});
