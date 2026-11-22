import { describe, expect, it } from "vitest";
import { borrowsKnownName, identifyApp, listedApp } from "./app-marks";

const site = (path: string) => `https://lymi.app${path}`;
const listed = (clientId: string, name?: string) => listedApp(identifyApp(clientId, name, site));

describe("listedApp", () => {
  it("titles a recognised app by its own name, verified", () => {
    expect(listed("https://claude.ai/oauth/client.json", "Whatever")).toEqual({
      title: "Claude",
      host: "claude.ai",
      unverified: false,
      borrowed: false,
    });
  });

  it("titles an unrecognised app by the name it gave, unverified, with its host under it", () => {
    expect(listed("https://notes-helper.example.app/client.json", "Notes Helper")).toEqual({
      title: "Notes Helper",
      host: "notes-helper.example.app",
      unverified: true,
      borrowed: false,
    });
  });

  it("marks a name that borrows a known app's from another host", () => {
    expect(listed("https://evil.example/client.json", "Claude Desktop")).toEqual({
      title: "Claude Desktop",
      host: "evil.example",
      unverified: true,
      borrowed: true,
    });
  });

  it("titles an app that gave no name by its host, without repeating it", () => {
    expect(listed("https://notes-helper.example.app/client.json")).toEqual({
      title: "notes-helper.example.app",
      host: null,
      unverified: true,
      borrowed: false,
    });
  });
});

describe("borrowsKnownName", () => {
  it("finds a known name as a word, in any case", () => {
    expect(borrowsKnownName("My chatgpt bridge")).toBe(true);
    expect(borrowsKnownName("OpenAI tools")).toBe(true);
  });

  it("finds a longer known name inside another word or next to digits", () => {
    expect(borrowsKnownName("Claude2")).toBe(true);
    expect(borrowsKnownName("ClaudeCode")).toBe(true);
    expect(borrowsKnownName("ChatGPT4o")).toBe(true);
    expect(borrowsKnownName("MyClaude")).toBe(true);
    expect(borrowsKnownName("Chat-GPT helper")).toBe(true);
  });

  it("finds a short known name only as a word", () => {
    expect(borrowsKnownName("Zed notes")).toBe(true);
    expect(borrowsKnownName("Organized notes")).toBe(false);
    expect(borrowsKnownName("Notes Helper")).toBe(false);
  });
});

describe("identifyApp", () => {
  const name = (clientId: string, claimed?: string) => identifyApp(clientId, claimed, site).name;

  it("takes the name from the host, never from what the client calls itself", () => {
    expect(name("https://evil.example/client.json", "Claude")).toBe("evil.example");
    expect(name("not-a-url", "Claude")).toBeNull();
  });

  it("recognises a known host's subdomain, and no host that only ends in its letters", () => {
    expect(name("https://www.claude.ai/client.json")).toBe("Claude");
    expect(name("https://auth.claude.ai/client.json")).toBe("Claude");
    expect(name("https://evilclaude.ai/client.json")).toBe("evilclaude.ai");
    expect(name("https://claude.ai.evil.example/client.json")).toBe("claude.ai.evil.example");
  });

  it("tells Codex from ChatGPT, which share a host, by Codex's own document", () => {
    expect(name("https://chatgpt.com/oauth/codex/client.json")).toBe("Codex");
    expect(name("https://chatgpt.com/oauth/client.json")).toBe("ChatGPT");
  });

  it("shows a claim only beside an address that is not recognised and does not repeat it", () => {
    const claimed = (clientId: string, given: string) => identifyApp(clientId, given, site).claimed;
    expect(claimed("https://claude.ai/client.json", "Anything")).toBeNull();
    expect(claimed("https://evil.example/client.json", "Claude")).toBe("Claude");
    expect(claimed("https://evil.example/client.json", "evil.example")).toBeNull();
  });
});
