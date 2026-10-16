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

  it("ignores a known name inside another word", () => {
    expect(borrowsKnownName("Organized notes")).toBe(false);
    expect(borrowsKnownName("Notes Helper")).toBe(false);
  });
});
