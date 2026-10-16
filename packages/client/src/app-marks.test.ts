import { describe, expect, it } from "vitest";
import { borrowsKnownName, identifyApp, listedApp } from "./app-marks";

const site = (path: string) => `https://lymi.app${path}`;
const listed = (clientId: string, name?: string) => listedApp(identifyApp(clientId, name, site));

describe("listedApp", () => {
  it("titles a recognised app by its own name, verified", () => {
    expect(listed("https://claude.ai/oauth/client.json", "Whatever")).toEqual({
      title: "Claude",
      unverified: false,
      host: "claude.ai",
      claimed: null,
    });
  });

  it("titles an unrecognised app by the name it gave, unverified, with its host under it", () => {
    expect(listed("https://notes-helper.example.app/client.json", "Notes Helper")).toEqual({
      title: "Notes Helper",
      unverified: true,
      host: "notes-helper.example.app",
      claimed: null,
    });
  });

  it("keeps the host as the title when the name borrows a known app's", () => {
    expect(listed("https://evil.example/client.json", "Claude Desktop")).toEqual({
      title: "evil.example",
      unverified: true,
      host: null,
      claimed: "Claude Desktop",
    });
  });

  it("titles an app that gave no name by its host", () => {
    expect(listed("https://notes-helper.example.app/client.json")).toEqual({
      title: "notes-helper.example.app",
      unverified: true,
      host: null,
      claimed: null,
    });
  });
});

describe("borrowsKnownName", () => {
  it("finds a known name as a word, in any case", () => {
    expect(borrowsKnownName("My chatgpt bridge")).toBe(true);
    expect(borrowsKnownName("OpenAI tools")).toBe(true);
  });

  it("ignores a known name inside another word", () => {
    expect(borrowsKnownName("Organized notes")).toBe(false);
    expect(borrowsKnownName("Notes Helper")).toBe(false);
  });
});
