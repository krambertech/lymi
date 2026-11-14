import { assistants } from "@lymi/client/apps";
import { describe, expect, it } from "vitest";
import { assistantClientOf } from "./assistant-client";

const SITE = "https://lymi.app";
const site = (path: string) => new URL(path, SITE).toString();

describe("assistantClientOf", () => {
  it("names each assistant by the client it signs in with", () => {
    expect(assistantClientOf("https://chatgpt.com/oauth/client.json", SITE)).toBe("chatgpt");
    expect(assistantClientOf("https://chatgpt.com/oauth/codex/client.json", SITE)).toBe("codex");
    expect(assistantClientOf("https://claude.ai/oauth/mcp-oauth-client-metadata", SITE)).toBe(
      "claude",
    );
    expect(assistantClientOf(site("/oauth/grok.json"), SITE)).toBe("grok");
    expect(assistantClientOf(site("/oauth/cursor.json"), SITE)).toBe("cursor");
    expect(assistantClientOf(site("/oauth/gemini-cli.json"), SITE)).toBe("gemini_cli");
  });

  it("labels every client it does not recognise as other, never by its host", () => {
    expect(assistantClientOf("https://agent.example/client.json", SITE)).toBe("other");
    expect(assistantClientOf("not-a-url", SITE)).toBe("other");
    expect(assistantClientOf(null, SITE)).toBe("other");
  });

  it("falls back to the default site when the configured one is empty, and never throws", () => {
    expect(assistantClientOf(site("/oauth/grok.json"), "")).toBe("grok");
    expect(assistantClientOf("https://chatgpt.com/oauth/client.json", "not a url")).toBe("other");
  });

  it("has a label for every assistant the Apps group offers", () => {
    for (const assistant of assistants(site)) {
      if (!assistant.app) continue;
      const clientId = assistant.clientId ?? `https://${assistant.app.host}/client.json`;
      expect(assistantClientOf(clientId, SITE), assistant.key).not.toBe("other");
    }
  });
});
