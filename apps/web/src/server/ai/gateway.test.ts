import { describe, expect, it } from "vitest";
import { decisionModel } from "../lessons/keep";
import { createLessonReader } from "../lessons/reader";
import { createElevenLabsSpeechProvider } from "./elevenlabs-speech";
import { providerEndpoint } from "./gateway";
import { createGeminiApiSpeechProvider } from "./gemini-api-speech";
import { createOpenAiSpeechProvider } from "./openai-speech";
import { createOpenAiTextProvider } from "./openai-text";

const GATEWAY = "https://gateway.ai.cloudflare.com/v1/acct/lymi";
const routed = { AI_GATEWAY_URL: `${GATEWAY}/`, AI_GATEWAY_TOKEN: "gateway-token" };

type Call = { url: string; headers: Record<string, string> };

/** Records each request and answers with a failure, so a provider stops after its first call. */
function recorder() {
  const calls: Call[] = [];
  const request = async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(url), headers: init?.headers as Record<string, string> });
    return new Response("{}", { status: 400 });
  };
  return { calls, request };
}

describe("providerEndpoint", () => {
  it("routes each provider to its gateway path with the gateway's token", () => {
    expect(providerEndpoint(routed, "openai")).toEqual({
      base: `${GATEWAY}/openai`,
      headers: { "cf-aig-authorization": "Bearer gateway-token" },
    });
    expect(providerEndpoint(routed, "anthropic").base).toBe(`${GATEWAY}/anthropic/v1`);
    expect(providerEndpoint(routed, "elevenlabs").base).toBe(`${GATEWAY}/elevenlabs`);
    expect(providerEndpoint(routed, "google-ai-studio").base).toBe(`${GATEWAY}/google-ai-studio`);
  });

  it("calls the provider directly, without the token, unless both are set", () => {
    const tokenOnly = providerEndpoint({ AI_GATEWAY_TOKEN: "gateway-token" }, "openai");
    expect(tokenOnly).toEqual({ base: "https://api.openai.com/v1", headers: {} });
    expect(providerEndpoint({ AI_GATEWAY_URL: GATEWAY }, "anthropic")).toEqual({
      base: "https://api.anthropic.com/v1",
      headers: {},
    });
  });
});

describe("clients through the gateway", () => {
  it("sends OpenAI text, OpenAI speech, ElevenLabs and Gemini through it", async () => {
    const { calls, request } = recorder();
    await createOpenAiTextProvider({ OPENAI_API_KEY: "k", ...routed }, request)
      .complete({ instructions: "i", input: "x", schema: { name: "s", schema: {} } })
      .catch(() => {});
    await createOpenAiSpeechProvider({ OPENAI_API_KEY: "k", ...routed }, "et", request)
      .speech({ text: "tere", language: "et" })
      .catch(() => {});
    await createElevenLabsSpeechProvider({ ELEVENLABS_API_KEY: "k", ...routed }, "et", "v", request)
      .speech({ text: "tere", language: "et" })
      .catch(() => {});
    await createGeminiApiSpeechProvider({ GEMINI_API_KEY: "k", ...routed }, "et-EE", request)
      .speech({ text: "tere", language: "et" })
      .catch(() => {});
    const urls = [...new Set(calls.map((c) => c.url.split("?")[0]))];
    expect(urls).toEqual([
      `${GATEWAY}/openai/chat/completions`,
      `${GATEWAY}/openai/audio/speech`,
      `${GATEWAY}/elevenlabs/v1/text-to-speech/v`,
      expect.stringMatching(
        /^https:\/\/gateway\.ai\.cloudflare\.com\/v1\/acct\/lymi\/google-ai-studio\/v1beta\/models\//,
      ),
    ]);
    for (const call of calls) {
      expect(call.headers["cf-aig-authorization"]).toBe("Bearer gateway-token");
    }
  });

  it("never sends the gateway token to a provider directly", async () => {
    const { calls, request } = recorder();
    const env = { OPENAI_API_KEY: "k", ANTHROPIC_API_KEY: "k", AI_GATEWAY_TOKEN: "gateway-token" };
    await createOpenAiTextProvider(env, request)
      .complete({ instructions: "i", input: "x", schema: { name: "s", schema: {} } })
      .catch(() => {});
    await createOpenAiSpeechProvider(env, "et", request)
      .speech({ text: "tere", language: "et" })
      .catch(() => {});
    await createLessonReader(env, request)
      ?.stream({ images: [], pdfs: [], text: "Tund 6" }, "brief", {}, () => {})
      .catch(() => {});
    expect(calls.map((c) => new URL(c.url).host)).toEqual(
      expect.arrayContaining(["api.openai.com", "api.anthropic.com"]),
    );
    for (const call of calls) expect(call.headers["cf-aig-authorization"]).toBeUndefined();
  });

  it("sends lesson reads to the gateway's Anthropic endpoint", async () => {
    const { calls, request } = recorder();
    await createLessonReader({ ANTHROPIC_API_KEY: "k", ...routed }, request)
      ?.stream({ images: [], pdfs: [], text: "Tund 6" }, "brief", {}, () => {})
      .catch(() => {});
    expect(calls[0]?.url).toBe(`${GATEWAY}/anthropic/v1/messages`);
    expect(calls[0]?.headers["cf-aig-authorization"]).toBe("Bearer gateway-token");
  });

  it("names the gateway on Workers AI calls only when one is set", async () => {
    const options: unknown[] = [];
    const AI = {
      run: async (_model: string, _input: unknown, opts: unknown) => {
        options.push(opts);
        return {};
      },
    } as unknown as Ai;
    await decisionModel({ AI, AI_GATEWAY_ID: "lymi" })?.run("@cf/cloudflare/clef-flash", {});
    await decisionModel({ AI })?.run("@cf/cloudflare/clef-flash", {});
    expect(options).toEqual([{ gateway: { id: "lymi" } }, {}]);
    expect(decisionModel({})).toBeUndefined();
  });
});
