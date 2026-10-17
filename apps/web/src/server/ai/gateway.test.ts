import { describe, expect, it, vi } from "vitest";
import { decisionModel } from "../lessons/keep";
import { createLessonReader } from "../lessons/reader";
import { createElevenLabsSpeechProvider } from "./elevenlabs-speech";
import { AiGatewayError, providerEndpoint } from "./gateway";
import { createGeminiApiSpeechProvider } from "./gemini-api-speech";
import { createGoogleChirpProvider } from "./google-chirp";
import { createGoogleGeminiProvider } from "./google-gemini";
import { createOpenAiSpeechProvider } from "./openai-speech";
import { createOpenAiTextProvider } from "./openai-text";

const GATEWAY = "https://gateway.ai.cloudflare.com/v1/acct/lymi";
const routed = { AI_GATEWAY_URL: `${GATEWAY}/`, AI_GATEWAY_TOKEN: "gateway-token" };

type Call = { url: string; headers: Record<string, string>; redirect: RequestRedirect | undefined };

/** Records each request and answers with a failure, so a provider stops after its first call. */
function recorder() {
  const calls: Call[] = [];
  const request = async (url: RequestInfo | URL, init?: RequestInit) => {
    calls.push({
      url: String(url),
      headers: init?.headers as Record<string, string>,
      redirect: init?.redirect,
    });
    return new Response("{}", { status: 400 });
  };
  return { calls, request };
}

describe("providerEndpoint", () => {
  it("routes each provider to its gateway path with the gateway's token", () => {
    expect(providerEndpoint(routed, "openai")).toEqual({
      base: `${GATEWAY}/openai`,
      headers: {
        "cf-aig-authorization": "Bearer gateway-token",
        "cf-aig-collect-log-payload": "false",
        "cf-aig-skip-cache": "true",
      },
    });
    expect(providerEndpoint(routed, "anthropic").base).toBe(`${GATEWAY}/anthropic/v1`);
    expect(providerEndpoint(routed, "typesafe").base).toBe(`${GATEWAY}/custom-typesafe`);
    expect(providerEndpoint(routed, "elevenlabs").base).toBe(`${GATEWAY}/elevenlabs`);
    expect(providerEndpoint(routed, "google-ai-studio").base).toBe(`${GATEWAY}/google-ai-studio`);
  });

  it.each([{}, { AI_GATEWAY_TOKEN: "gateway-token" }, { AI_GATEWAY_URL: GATEWAY }])(
    "refuses incomplete gateway configuration",
    (env) => expect(() => providerEndpoint(env, "openai")).toThrow(AiGatewayError),
  );

  it.each([
    "http://gateway.ai.cloudflare.com/v1/acct/lymi",
    "https://example.com/v1/acct/lymi",
    "https://gateway.ai.cloudflare.com.evil.test/v1/acct/lymi",
    `${GATEWAY}?token=secret`,
    `${GATEWAY}#ignored`,
    `${GATEWAY}/openai`,
  ])("refuses an unsafe gateway URL without exposing it", (url) => {
    expect(() => providerEndpoint({ ...routed, AI_GATEWAY_URL: url }, "openai")).toThrow(
      "AI Gateway URL is invalid",
    );
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
      expect(call.redirect).toBe("manual");
    }
  });

  it("never makes an upstream request with missing gateway configuration", async () => {
    const request = vi.fn();
    const env = { OPENAI_API_KEY: "k", ANTHROPIC_API_KEY: "k" };
    await expect(
      createOpenAiTextProvider(env, request).complete({
        instructions: "i",
        input: "x",
        schema: { name: "s", schema: {} },
      }),
    ).rejects.toThrow(AiGatewayError);
    await expect(
      createOpenAiSpeechProvider(env, "et", request).speech({ text: "tere", language: "et" }),
    ).rejects.toThrow(AiGatewayError);
    expect(() => createLessonReader(env, request)).toThrow(AiGatewayError);
    expect(request).not.toHaveBeenCalled();
  });

  it.each([301, 302, 307, 308, 401, 403, 429, 500])(
    "never bypasses the gateway after HTTP %s",
    async (status) => {
      const request = vi.fn(
        async (_url: RequestInfo | URL, _init?: RequestInit) =>
          new Response("private upstream detail", { status }),
      );
      await expect(
        createOpenAiTextProvider({ OPENAI_API_KEY: "k", ...routed }, request).complete({
          instructions: "i",
          input: "x",
          schema: { name: "s", schema: {} },
        }),
      ).rejects.toMatchObject({ status });
      for (const [url, init] of request.mock.calls) {
        expect(url).toBe(`${GATEWAY}/openai/chat/completions`);
        expect(init?.redirect).toBe("manual");
      }
    },
  );

  it("keeps Google Cloud speech behind its custom gateway provider", async () => {
    const calls: string[] = [];
    const credentials = JSON.stringify({
      type: "service_account",
      project_id: "lymi",
      client_email: "test@example.com",
      private_key: "unused",
    });
    const request = async (url: RequestInfo | URL, init?: RequestInit) => {
      calls.push(String(url));
      expect(init?.redirect).toBe("manual");
      expect(new Headers(init?.headers).get("cf-aig-authorization")).toBe("Bearer gateway-token");
      return Response.json({ audioContent: btoa("audio") });
    };
    const env = { ...routed, GOOGLE_CLOUD_TTS_CREDENTIALS: credentials };
    const dependencies = { locale: "et-EE", accessToken: async () => "oauth-token", request };
    for (const provider of [
      createGoogleGeminiProvider(env, dependencies),
      createGoogleChirpProvider(env, dependencies),
    ]) {
      expect(await (await provider.speech({ text: "tere", language: "et" })).text()).toBe("audio");
    }
    expect(calls).toEqual(Array(2).fill(`${GATEWAY}/custom-google-cloud-tts/v1/text:synthesize`));
  });

  it("sends lesson reads to the gateway's Anthropic endpoint", async () => {
    const { calls, request } = recorder();
    await createLessonReader({ ANTHROPIC_API_KEY: "k", ...routed }, request)
      ?.stream({ images: [], pdfs: [], text: "Tund 6" }, "brief", {}, () => {})
      .catch(() => {});
    expect(calls[0]?.url).toBe(`${GATEWAY}/anthropic/v1/messages`);
    expect(calls[0]?.redirect).toBe("manual");
    expect(calls[0]?.headers["cf-aig-authorization"]).toBe("Bearer gateway-token");
  });

  it("keeps upstream lesson errors out of diagnostics", async () => {
    const reader = createLessonReader(
      { ...routed, ANTHROPIC_API_KEY: "k" },
      async () => new Response("private upstream payload", { status: 403 }),
    );
    await expect(
      reader?.stream({ images: [], pdfs: [], text: "lesson" }, "brief", {}, () => {}),
    ).rejects.toMatchObject({ message: "The lesson reader failed (403)", status: 403 });

    const stream = createLessonReader(
      { ...routed, ANTHROPIC_API_KEY: "k" },
      async () =>
        new Response(
          `data: ${JSON.stringify({
            type: "error",
            error: { message: "private stream payload" },
          })}\n\n`,
        ),
    );
    await expect(
      stream?.stream({ images: [], pdfs: [], text: "lesson" }, "brief", {}, () => {}),
    ).rejects.toThrow("The lesson reader stream failed");
  });

  it("requires a gateway on Workers AI calls and disables payload storage and caching", async () => {
    const run = vi.fn(async () => ({}));
    const AI = { run } as unknown as Ai;
    await decisionModel({ AI, AI_GATEWAY_ID: "lymi" })?.run("@cf/cloudflare/clef-flash", {});
    expect(run).toHaveBeenCalledWith(
      "@cf/cloudflare/clef-flash",
      {},
      {
        gateway: { id: "lymi", skipCache: true },
        extraHeaders: { "cf-aig-collect-log-payload": "false" },
        signal: expect.any(AbortSignal),
      },
    );
    expect(() => decisionModel({ AI })).toThrow(AiGatewayError);
    expect(run).toHaveBeenCalledTimes(1);
    expect(decisionModel({})).toBeUndefined();
  });
});
