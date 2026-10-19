import { describe, expect, it, vi } from "vitest";
import { japanese } from "../lead-ins/japanese";
import { createLeadInWriter, LeadInError } from "./lead-in-writer";

const env = {
  GEMINI_API_KEY: "test-key",
  AI_GATEWAY_URL: "https://gateway.ai.cloudflare.com/v1/account/lymi",
  AI_GATEWAY_TOKEN: "test-token",
};
const input = { term: "橋", reading: "はし", meaning: "bridge" };
const request = {
  instructions: japanese.instructions,
  input,
  accepts: (previousText: string | null) => japanese.accepts(previousText, input),
};
const payload = (previousText: string | null) => ({
  candidates: [
    { finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ previousText }) }] } },
  ],
  usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 10, thoughtsTokenCount: 400 },
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
    expect(url).toBe(
      `${env.AI_GATEWAY_URL}/google-ai-studio/v1beta/models/gemini-2.5-flash-lite:generateContent`,
    );
    expect(init?.redirect).toBe("manual");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(init?.headers).toMatchObject({
      "cf-aig-collect-log-payload": "false",
      "cf-aig-skip-cache": "true",
    });
    const body = JSON.parse(String(init?.body));
    expect(body.systemInstruction.parts[0].text).toBe(japanese.instructions);
    expect(body.generationConfig).toMatchObject({
      maxOutputTokens: 768,
      thinkingConfig: { thinkingBudget: 512 },
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

  it("tells a refused reply, which would come back the same, from an outage, and keeps its usage", async () => {
    const refused = createLeadInWriter(env, async () => Response.json(payload("とても")));
    const error = await refused?.write(request).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(LeadInError);
    expect(error).toMatchObject({
      reason: "refused",
      usage: { inputTokens: 300, outputTokens: 410, reasoningTokens: 400, status: 200 },
    });
    const truncated = payload("川を渡る");
    const candidate = truncated.candidates[0];
    if (candidate) candidate.finishReason = "MAX_TOKENS";
    await expect(
      createLeadInWriter(env, async () => Response.json(truncated))?.write(request),
    ).rejects.toMatchObject({ reason: "refused" });
    const garbled = createLeadInWriter(env, async () => new Response("not json"));
    await expect(garbled?.write(request)).rejects.toMatchObject({ reason: "failed" });
  });

  it("fails closed without a key or the gateway and refuses oversized replies", async () => {
    expect(createLeadInWriter({})).toBeNull();
    const fetch = vi.fn(async () => Response.json(payload("川を渡る")));
    await expect(
      createLeadInWriter({ GEMINI_API_KEY: "test" }, fetch)?.write(request),
    ).rejects.toThrow("Gateway");
    expect(fetch).not.toHaveBeenCalled();
    await expect(
      createLeadInWriter(env, async () => new Response("x".repeat(16_385)))?.write(request),
    ).rejects.toMatchObject({ reason: "failed" });
  });
});
