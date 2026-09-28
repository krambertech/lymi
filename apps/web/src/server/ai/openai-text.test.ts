import { describe, expect, it, vi } from "vitest";
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
    const provider = createOpenAiTextProvider({ OPENAI_API_KEY: "key" }, request);

    expect(await provider.complete({ instructions: "fill", input: "{}", schema })).toEqual({
      cards: [],
    });
    const call = request.mock.calls[0];
    if (!call) throw new Error("OpenAI request was not made");
    expect(call[0]).toBe("https://api.openai.com/v1/chat/completions");
    expect(JSON.parse(String(call[1]?.body))).toMatchObject({
      model: "gpt-6-luna",
      reasoning_effort: "high",
      response_format: { type: "json_schema", json_schema: { name: "reply", strict: true } },
    });
  });

  it("uses the model the environment names", async () => {
    const request = reply("{}");
    const provider = createOpenAiTextProvider(
      { OPENAI_API_KEY: "key", OPENAI_TEXT_MODEL: "gpt-5-mini" },
      request,
    );

    await provider.complete({ instructions: "fill", input: "{}", schema });
    expect(provider.model).toBe("gpt-5-mini");
    expect(JSON.parse(String(request.mock.calls[0]?.[1]?.body)).model).toBe("gpt-5-mini");
  });

  it("fails a reply that was cut off", async () => {
    const provider = createOpenAiTextProvider(
      { OPENAI_API_KEY: "key" },
      reply('{"cards":', "length"),
    );
    await expect(
      provider.complete({ instructions: "fill", input: "{}", schema }),
    ).rejects.toBeInstanceOf(OpenAiTextError);
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
