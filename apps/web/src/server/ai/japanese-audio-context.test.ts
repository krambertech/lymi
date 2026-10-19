import { describe, expect, it, vi } from "vitest";
import {
  createJapaneseContextProvider,
  JapaneseContextError,
  validJapaneseLeadIn,
} from "./japanese-audio-context";

const env = {
  GEMINI_API_KEY: "test-key",
  AI_GATEWAY_URL: "https://gateway.ai.cloudflare.com/v1/account/lymi",
  AI_GATEWAY_TOKEN: "test-token",
};
const input = { term: "橋", reading: "はし", meaning: "bridge" };
const payload = (previousText: string | null) => ({
  candidates: [
    { finishReason: "STOP", content: { parts: [{ text: JSON.stringify({ previousText }) }] } },
  ],
  usageMetadata: { promptTokenCount: 300, candidatesTokenCount: 10, thoughtsTokenCount: 400 },
});

describe("cheap Japanese audio context", () => {
  it("uses the gateway, a fixed cheap model and a capped output, without speech instructions", async () => {
    const request = vi.fn(async (_url: RequestInfo | URL, _init?: RequestInit) =>
      Response.json(payload("川を渡る")),
    );
    const provider = createJapaneseContextProvider(env, request);
    expect(await provider?.generate(input)).toEqual({
      previousText: "川を渡る",
      inputTokens: 300,
      outputTokens: 410,
      reasoningTokens: 400,
      status: 200,
    });
    const [url, init] = request.mock.calls[0] ?? [];
    expect(url).toBe(
      `${env.AI_GATEWAY_URL}/google-ai-studio/v1beta/models/gemini-2.5-flash-lite:generateContent`,
    );
    expect(init?.redirect).toBe("manual");
    expect(init?.headers).toMatchObject({
      "cf-aig-collect-log-payload": "false",
      "cf-aig-skip-cache": "true",
    });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    expect(JSON.parse(String(init?.body)).generationConfig).toMatchObject({
      maxOutputTokens: 768,
      thinkingConfig: { thinkingBudget: 512 },
    });
  });

  it("makes no automatic retry on timeout or rejection", async () => {
    const request = vi.fn(async () => {
      throw new DOMException("timeout", "TimeoutError");
    });
    await expect(createJapaneseContextProvider(env, request)?.generate(input)).rejects.toThrow();
    expect(request).toHaveBeenCalledOnce();
    const limited = vi.fn(async () => new Response("limited", { status: 429 }));
    await expect(
      createJapaneseContextProvider(env, limited)?.generate(input),
    ).rejects.toMatchObject({
      reason: "failed",
      usage: { status: 429 },
    });
    expect(limited).toHaveBeenCalledOnce();
  });

  it("tells a refused reply, which would come back the same, from an outage, and keeps its usage", async () => {
    const refused = createJapaneseContextProvider(env, async () =>
      Response.json(payload("とても")),
    );
    const error = await refused?.generate(input).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(JapaneseContextError);
    expect(error).toMatchObject({
      reason: "rejected",
      usage: { inputTokens: 300, outputTokens: 410, reasoningTokens: 400, status: 200 },
    });
    const garbled = createJapaneseContextProvider(env, async () => new Response("not json"));
    await expect(garbled?.generate(input)).rejects.toMatchObject({ reason: "failed" });
  });

  it("fails closed without the gateway and refuses truncated or oversized JSON", async () => {
    const request = vi.fn(async () => Response.json(payload("川を渡る")));
    await expect(
      createJapaneseContextProvider({ GEMINI_API_KEY: "test" }, request)?.generate(input),
    ).rejects.toThrow("Gateway");
    expect(request).not.toHaveBeenCalled();
    const truncated = payload("川を渡る");
    const candidate = truncated.candidates[0];
    if (candidate) candidate.finishReason = "MAX_TOKENS";
    await expect(
      createJapaneseContextProvider(env, async () => Response.json(truncated))?.generate(input),
    ).rejects.toThrow();
    await expect(
      createJapaneseContextProvider(env, async () => new Response("x".repeat(16_385)))?.generate(
        input,
      ),
    ).rejects.toThrow();
  });

  it("accepts an explicit no-context result and rejects target repetition, markup and generic modifiers", () => {
    expect(validJapaneseLeadIn(null, input)).toBe(true);
    expect(validJapaneseLeadIn("川を渡る", input)).toBe(true);
    for (const prefix of ["橋の", "はし", "とても", "新しい", "川。", "[quiet]", "あ".repeat(17)])
      expect(validJapaneseLeadIn(prefix, input)).toBe(false);
  });

  it("keeps lead-ins whose ordinary words contain a one-kana reading, unless they end in it", () => {
    const tree = { term: "木", reading: "き", meaning: "tree" };
    const leaf = { term: "葉", reading: "は", meaning: "leaf" };
    expect(validJapaneseLeadIn("大きな", tree)).toBe(true);
    expect(validJapaneseLeadIn("秋には色づく", leaf)).toBe(true);
    expect(validJapaneseLeadIn("木の", tree)).toBe(false);
    expect(validJapaneseLeadIn("ゆき", tree)).toBe(false);
  });
});
