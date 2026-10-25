import { describe, expect, it } from "vitest";
import type { ApiKeySummary, ConnectedApp } from "./api";
import { assistantOf, assistants, yomitanKey } from "./apps";

const site = (path: string) => `https://lymi.app${path}`;
const list = assistants(site);

const grant = (clientId: string, name: string | null = null): ConnectedApp => ({
  id: "g",
  clientId,
  name,
  scope: "write",
  createdAt: "2026-10-20T00:00:00.000Z",
  updatedAt: "2026-10-20T00:00:00.000Z",
});

const key = (name: string | null, createdAt: string): ApiKeySummary => ({
  id: createdAt,
  name,
  start: null,
  scope: "write",
  lastRequest: null,
  createdAt,
});

describe("assistants", () => {
  it("lists every assistant with Custom MCP last", () => {
    expect(list.map((a) => a.key)).toEqual([
      "claude",
      "chatgpt",
      "gemini",
      "grok",
      "cursor",
      "custom",
    ]);
  });
});

describe("assistantOf", () => {
  it("finds a connected app's assistant by its client ID's host", () => {
    expect(assistantOf(list, grant("https://claude.ai/oauth/client.json"), site)?.key).toBe(
      "claude",
    );
  });

  it("counts Gemini CLI's published document as Gemini", () => {
    const gemini = list.find((a) => a.key === "gemini")?.clientId ?? "";
    expect(assistantOf(list, grant(gemini), site)?.key).toBe("gemini");
  });

  it("never makes an unknown app Custom MCP or trusts the name it gave", () => {
    expect(
      assistantOf(list, grant("https://notes.example.com/c.json", "Claude"), site),
    ).toBeUndefined();
  });
});

describe("yomitanKey", () => {
  it("takes the newest key named for Yomitan and ignores the rest", () => {
    const keys = [
      key("Yomitan", "2026-10-01T00:00:00.000Z"),
      key("Script", "2026-10-30T00:00:00.000Z"),
      key("Yomitan", "2026-10-20T00:00:00.000Z"),
    ];
    expect(yomitanKey(keys)?.createdAt).toBe("2026-10-20T00:00:00.000Z");
    expect(yomitanKey([key("Script", "2026-10-30T00:00:00.000Z")])).toBeNull();
  });
});
