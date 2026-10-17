import { describe, expect, it, vi } from "vitest";
import { testGateway } from "../../test/ai-gateway";
import { createOpenAiTextProvider, OpenAiTextError } from "./openai-text";

const schema = { name: "reply", schema: { type: "object" } };

function reply(content: string, finishReason = "stop") {
  return vi.fn(
    async (_input: RequestInfo | URL, _init?: RequestInit): Promise<Response> =>
      Response.json({ choices: [{ message: { content }, finish_reason: finishReason }] }),
  );
}

describe("OpenAI text provider", () => {
  it("asks GPT-6 Luna at high effort for a strict structured reply", async () => {
    const request = reply('{"cards":[]}');
    const provider = createOpenAiTextProvider({ ...testGateway, OPENAI_API_KEY: "key" }, request);

    expect(await provider.complete({ instructions: "fill", input: "{}", schema })).toEqual({
      cards: [],
    });
    const call = request.mock.calls[0];
    if (!call) throw new Error("OpenAI request was not made");
    expect(call[0]).toBe("https://gateway.ai.cloudflare.com/v1/acct/lymi/openai/chat/completions");
    expect(JSON.parse(String(call[1]?.body))).toMatchObject({
      model: "gpt-6-luna",
      reasoning_effort: "high",
      response_format: { type: "json_schema", json_schema: { name: "reply", strict: true } },
    });
  });

  it("uses the model the environment names", async () => {
    const request = reply("{}");
    const provider = createOpenAiTextProvider(
      { ...testGateway, OPENAI_API_KEY: "key", OPENAI_TEXT_MODEL: "gpt-5-mini" },
      request,
    );

    await provider.complete({ instructions: "fill", input: "{}", schema });
    expect(provider.model).toBe("gpt-5-mini");
    expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body)).model).toBe("gpt-5-mini");
  });

  it("fails a reply that was cut off", async () => {
    const provider = createOpenAiTextProvider(
      { ...testGateway, OPENAI_API_KEY: "key" },
      reply('{"cards":', "length"),
    );
    await expect(
      provider.complete({ instructions: "fill", input: "{}", schema }),
    ).rejects.toBeInstanceOf(OpenAiTextError);
  });

  it("tells an observer each call's tokens and time, including a reply that was cut off", async () => {
    const usage = {
      prompt_tokens: 900,
      completion_tokens: 120,
      completion_tokens_details: { reasoning_tokens: 80 },
      prompt_tokens_details: { cached_tokens: 600 },
    };
    const request = vi.fn(async () =>
      Response.json({ choices: [{ message: { content: "{}" }, finish_reason: "stop" }], usage }),
    );
    const observe = vi.fn();
    const provider = createOpenAiTextProvider(
      { ...testGateway, OPENAI_API_KEY: "key" },
      request,
      observe,
    );
    await provider.complete({ instructions: "fill", input: "private", schema });
    expect(observe).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "gpt-6-luna",
        inputTokens: 900,
        outputTokens: 120,
        reasoningTokens: 80,
        cachedTokens: 600,
        error: false,
      }),
    );
    expect(JSON.stringify(observe.mock.calls)).not.toContain("private");

    request.mockImplementationOnce(async () =>
      Response.json({ choices: [{ message: { content: "{" }, finish_reason: "length" }], usage }),
    );
    await expect(
      provider.complete({ instructions: "fill", input: "{}", schema }),
    ).rejects.toThrow();
    expect(observe).toHaveBeenLastCalledWith(
      expect.objectContaining({ outputTokens: 120, error: true, status: 500 }),
    );
  });

  it("does not make a request when the key is missing", async () => {
    const request = vi.fn();
    const provider = createOpenAiTextProvider({}, request);
    await expect(
      provider.complete({ instructions: "fill", input: "{}", schema }),
    ).rejects.toBeInstanceOf(OpenAiTextError);
    expect(request).not.toHaveBeenCalled();
  });
});
