import { describe, expect, it } from "vitest";
import { testGateway } from "../test/ai-gateway";
import { createElevenLabsSpeechProvider } from "./ai/elevenlabs-speech";
import { createGeminiApiSpeechProvider } from "./ai/gemini-api-speech";
import { synthesizeGoogleSpeech } from "./ai/google-cloud-tts";
import { createLeadInWriter } from "./ai/lead-in-writer";
import { createOpenAiSpeechProvider } from "./ai/openai-speech";
import { createOpenAiTextProvider } from "./ai/openai-text";
import { fetchClientMetadataResource } from "./cimd-fetch";
import { createLessonReader, pingLessonReader } from "./lessons/reader";

// Each call goes through workerd's own fetch to the stub upstream in vitest.workers.config.ts,
// so a request option Workers refuses fails here as it failed in production on Oct 17.

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
  const pkcs8 = new Uint8Array(
    (await crypto.subtle.exportKey("pkcs8", keys.privateKey)) as ArrayBuffer,
  );
  const body = btoa(String.fromCharCode(...pkcs8));
  return JSON.stringify({
    type: "service_account",
    project_id: "lymi-test",
    private_key: `-----BEGIN PRIVATE KEY-----\n${body}\n-----END PRIVATE KEY-----\n`,
    client_email: "speech@lymi-test.iam.gserviceaccount.com",
  });
}

describe("outgoing provider fetches in the Workers runtime", () => {
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
});
