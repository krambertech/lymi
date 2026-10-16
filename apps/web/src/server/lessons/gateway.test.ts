import { describe, expect, it } from "vitest";
import { decisionModel } from "./keep";
import { createLessonReader } from "./reader";

const material = { images: [], pdfs: [], text: "Tund 6" };

function sse(...events: unknown[]): Response {
  const body = events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join("");
  return new Response(body, { headers: { "content-type": "text/event-stream" } });
}

describe("AI Gateway", () => {
  it("sends lesson reads to the gateway with its token when one is set", async () => {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    const reader = createLessonReader(
      {
        ANTHROPIC_API_KEY: "key",
        ANTHROPIC_BASE_URL: "https://gateway.ai.cloudflare.com/v1/acct/lymi/anthropic/v1/",
        AI_GATEWAY_TOKEN: "gateway-token",
      },
      async (url, init) => {
        calls.push({ url: String(url), headers: init?.headers as Record<string, string> });
        return sse({ type: "message_start", message: { usage: { input_tokens: 1 } } });
      },
    );
    await reader?.stream(material, "brief", {}, () => {});
    expect(calls[0]?.url).toBe(
      "https://gateway.ai.cloudflare.com/v1/acct/lymi/anthropic/v1/messages",
    );
    expect(calls[0]?.headers["cf-aig-authorization"]).toBe("Bearer gateway-token");
  });

  it("calls Anthropic directly without the gateway's token", async () => {
    const calls: { url: string; headers: Record<string, string> }[] = [];
    const env = {
      ANTHROPIC_API_KEY: "key",
      ANTHROPIC_BASE_URL: "https://gateway.ai.cloudflare.com/v1/acct/lymi/anthropic/v1",
    };
    const reader = createLessonReader(env, async (url, init) => {
      calls.push({ url: String(url), headers: init?.headers as Record<string, string> });
      return sse({ type: "message_start", message: { usage: { input_tokens: 1 } } });
    });
    await reader?.stream(material, "brief", {}, () => {});
    expect(calls[0]?.url).toBe("https://api.anthropic.com/v1/messages");
    expect(calls[0]?.headers["cf-aig-authorization"]).toBeUndefined();
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
