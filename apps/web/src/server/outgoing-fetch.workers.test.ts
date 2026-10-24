import { proxyPostHog } from "@lymi/core/posthog-proxy";
import { describe, expect, it } from "vitest";
import { testGateway } from "../test/ai-gateway";
import { createElevenLabsSpeechProvider } from "./ai/elevenlabs-speech";
import { createGeminiApiSpeechProvider } from "./ai/gemini-api-speech";
import { synthesizeGoogleSpeech } from "./ai/google-cloud-tts";
import { createLeadInWriter } from "./ai/lead-in-writer";
import { createOpenAiSpeechProvider } from "./ai/openai-speech";
import { createOpenAiTextProvider } from "./ai/openai-text";
import { revokeAppleGrant } from "./apple-revoke";
import { fetchClientMetadataResource } from "./cimd-fetch";
import { sendWithResend } from "./email/resend";
import { createLessonReader, pingLessonReader } from "./lessons/reader";
import { erasePostHogPerson } from "./posthog";
import { fetchGooglePhoto } from "./services/avatars";
import { fetchRemoteImage } from "./services/image-import";

// Each call goes through workerd's own fetch to the stub upstream in vitest.workers.config.ts,
// so a request option Workers refuses fails here as it failed in production on Oct 17.

async function pkcs8Pem(key: CryptoKey): Promise<string> {
  const der = new Uint8Array((await crypto.subtle.exportKey("pkcs8", key)) as ArrayBuffer);
  return `-----BEGIN PRIVATE KEY-----\n${btoa(String.fromCharCode(...der))}\n-----END PRIVATE KEY-----\n`;
}

async function serviceAccount(): Promise<string> {
  const keys = await crypto.subtle.generateKey(
    {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["sign", "verify"],
  );
  return JSON.stringify({
    type: "service_account",
    project_id: "lymi-test",
    private_key: await pkcs8Pem(keys.privateKey),
    client_email: "speech@lymi-test.iam.gserviceaccount.com",
  });
}

describe("outgoing fetches in the Workers runtime", () => {
  it("OpenAI text", async () => {
    const provider = createOpenAiTextProvider({ ...testGateway, OPENAI_API_KEY: "key" });
    const reply = await provider.complete({
      instructions: "Reply.",
      input: "ok",
      schema: { name: "reply", schema: { type: "object" } },
    });
    expect(reply).toEqual({ ok: true });
  });

  it("OpenAI speech", async () => {
    const provider = createOpenAiSpeechProvider({ ...testGateway, OPENAI_API_KEY: "key" }, "uk");
    const response = await provider.speech({ text: "слово", language: "uk" });
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
  });

  it("ElevenLabs speech", async () => {
    const provider = createElevenLabsSpeechProvider(
      { ...testGateway, ELEVENLABS_API_KEY: "key" },
      "uk-UA",
      "voice",
    );
    const response = await provider.speech({ text: "слово", language: "uk" });
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
  });

  it("Google Cloud Text-to-Speech, with its OAuth token exchange", async () => {
    const response = await synthesizeGoogleSpeech(
      { ...testGateway, GOOGLE_CLOUD_TTS_CREDENTIALS: await serviceAccount() },
      { body: { input: { text: "слово" } }, request: fetch },
    );
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([0xff, 0xf3]));
  });

  it("Gemini API speech", async () => {
    const provider = createGeminiApiSpeechProvider(
      { ...testGateway, GEMINI_API_KEY: "key" },
      "uk-UA",
    );
    const response = await provider.speech({ text: "слово", language: "uk" });
    expect(response.headers.get("content-type")).toBe("audio/wav");
  });

  it("the lead-in writer", async () => {
    const writer = createLeadInWriter({ ...testGateway, GEMINI_API_KEY: "key" });
    const result = await writer?.write({ instructions: "Write.", input: { term: "слово" } });
    expect(result?.previousText).toBeNull();
  });

  it("the lesson reader and its canary ping", async () => {
    const env = { ...testGateway, ANTHROPIC_API_KEY: "key" };
    const text: string[] = [];
    await createLessonReader(env)?.stream({ images: [], pdfs: [], text: "" }, "Read.", {}, (t) =>
      text.push(t),
    );
    expect(text.join("")).toBe("{}");
    await expect(pingLessonReader(env)).resolves.toBeUndefined();
  });

  it("the CIMD metadata fetch hands a redirect back unfollowed", async () => {
    // Better Auth asks for `redirect: "error"`, which Workers refuses.
    const response = await fetchClientMetadataResource("https://client.example/metadata.json", {
      redirect: "error",
    });
    expect(response.status).toBe(302);
  });

  it("a picture import, following a redirect", async () => {
    const { bytes, host } = await fetchRemoteImage("https://images.example/start.png");
    expect(host).toBe("images.example");
    expect(bytes.byteLength).toBe(4);
  });

  it("a Google profile photo, following a redirect", async () => {
    const bytes = await fetchGooglePhoto("https://lh3.googleusercontent.com/a/photo=s96-c");
    expect(bytes.byteLength).toBe(4);
  });

  it("Resend", async () => {
    const sent = await sendWithResend("key", {
      to: "learner@lymi.local",
      from: { email: "hello@lymi.app", name: "Lymi" },
      replyTo: "hello@lymi.app",
      subject: "Hello",
      text: "Hello",
      html: "<p>Hello</p>",
      kind: "test",
    });
    expect(sent).toEqual({ id: "email" });
  });

  it("PostHog person erasure", async () => {
    const env = { POSTHOG_PERSONAL_API_KEY: "key", POSTHOG_PROJECT_ID: "1" };
    await expect(erasePostHogPerson(env, "user")).resolves.toBe(true);
  });

  it("the PostHog capture proxy", async () => {
    const request = new Request("https://my.lymi.app/ingest/e/", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "test", properties: {} }),
    });
    const response = await proxyPostHog(request, { country: "UA" });
    expect(response.status).toBe(200);
  });

  it("Apple grant revocation, with its ES256 client secret", async () => {
    const keys = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
      "sign",
      "verify",
    ]);
    const key = {
      bundleIdentifier: "app.lymi",
      teamId: "TEAM",
      keyId: "KEY",
      privateKey: await pkcs8Pem(keys.privateKey),
    };
    await expect(revokeAppleGrant(key, "code")).resolves.toBe(true);
  });
});
