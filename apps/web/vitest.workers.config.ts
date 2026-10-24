import { fileURLToPath } from "node:url";
import { cloudflareTest } from "@cloudflare/vitest-plugin";
import { lingui, linguiTransformerBabelPreset } from "@lingui/vite-plugin";
import babel from "@rolldown/plugin-babel";
import { defineConfig } from "vitest/config";
import { unstable_readConfig } from "wrangler";
import { testGateway } from "./src/test/ai-gateway";

// The production Worker's runtime settings, so a fetch option workerd refuses is refused here too.
const { compatibility_date, compatibility_flags } = unstable_readConfig({
  config: fileURLToPath(new URL("wrangler.jsonc", import.meta.url)),
});

const gateway = testGateway.AI_GATEWAY_URL;

const json = (body: unknown) => Response.json(body);
const audio = () =>
  new Response(new Uint8Array([0xff, 0xf3]), { headers: { "Content-Type": "audio/mpeg" } });
const gemini = (part: Record<string, unknown>, finishReason?: string) =>
  json({ candidates: [{ finishReason, content: { parts: [part] } }] });
const redirect = (location: string) =>
  new Response(null, { status: 302, headers: { Location: location } });
const picture = () =>
  new Response(new Uint8Array([0x52, 0x49, 0x46, 0x46]), {
    headers: { "Content-Type": "image/webp" },
  });

/** Other services the Worker calls, outside the AI Gateway. */
const services: Record<string, () => Response> = {
  "GET https://client.example/metadata.json": () => redirect("https://elsewhere.example/"),
  "GET https://images.example/start.png": () => redirect("/picture.png"),
  "GET https://images.example/picture.png": picture,
  "GET https://lh3.googleusercontent.com/a/photo=s512-c": () => redirect("/a/final"),
  "GET https://lh3.googleusercontent.com/a/final": picture,
  "POST https://oauth2.googleapis.com/token": () =>
    json({ access_token: "google-token", expires_in: 3600 }),
  "POST https://api.resend.com/emails": () => json({ id: "email" }),
  "POST https://eu.posthog.com/api/projects/1/persons/bulk_delete/": () => json({}),
  "POST https://eu.i.posthog.com/e/": () => json({ status: 1 }),
  "POST https://appleid.apple.com/auth/token": () => json({ refresh_token: "refresh" }),
  "POST https://appleid.apple.com/auth/revoke": () => new Response(null),
};

const events = (...data: unknown[]) =>
  new Response(data.map((event) => `data: ${JSON.stringify(event)}\n\n`).join(""), {
    headers: { "Content-Type": "text/event-stream" },
  });

/** Every service the Worker calls, answered just well enough for its caller to succeed. */
async function upstream(request: Request): Promise<Response> {
  const url = request.url;
  const service = services[`${request.method} ${url}`];
  if (service) return service();
  if (request.method !== "POST") return new Response("Unexpected request", { status: 405 });
  if (!url.startsWith(`${gateway}/`)) return new Response("Unexpected host", { status: 404 });
  const path = url.slice(gateway.length);
  if (path === "/openai/chat/completions") {
    return json({ choices: [{ message: { content: '{"ok":true}' }, finish_reason: "stop" }] });
  }
  if (path === "/openai/audio/speech" || path.startsWith("/elevenlabs/v1/text-to-speech/")) {
    return audio();
  }
  if (path === "/custom-google-cloud-tts/v1/text:synthesize") return json({ audioContent: "//M=" });
  if (path.startsWith("/google-ai-studio/v1beta/models/gemini-2.5-flash-lite:")) {
    return gemini({ text: '{"previousText":null}' }, "STOP");
  }
  if (path.startsWith("/google-ai-studio/v1beta/models/")) {
    return gemini({ inlineData: { mimeType: "audio/l16; rate=24000; channels=1", data: "AAA=" } });
  }
  if (path === "/anthropic/v1/messages") {
    const { stream } = (await request.json()) as { stream?: boolean };
    if (!stream) return json({ content: [] });
    return events(
      { type: "content_block_delta", delta: { type: "text_delta", text: "{}" } },
      { type: "message_delta", delta: { stop_reason: "end_turn" } },
    );
  }
  return new Response("Unexpected path", { status: 404 });
}

/** The outgoing fetches, run in workerd against `upstream`. docs/testing.md. */
export default defineConfig({
  plugins: [
    // The services reach server modules that carry Lingui macros, as vite.config.ts compiles them.
    lingui({ failOnCompileError: true, failOnMissing: true }),
    babel({ include: [/\/src\/.*\.tsx?(\?.*)?$/], presets: [linguiTransformerBabelPreset()] }),
    cloudflareTest({
      miniflare: {
        compatibilityDate: compatibility_date,
        compatibilityFlags: compatibility_flags,
        outboundService: upstream,
      },
    }),
  ],
  test: {
    name: "workers",
    include: ["src/**/*.workers.test.ts"],
  },
});
