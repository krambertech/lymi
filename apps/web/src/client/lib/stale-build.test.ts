import { afterEach, beforeEach, expect, it, vi } from "vitest";

let stale: typeof import("./stale-build");
let reload: ReturnType<typeof vi.fn>;
let stored: Map<string, string>;
let listeners: Map<string, () => void>;

beforeEach(async () => {
  vi.resetModules();
  reload = vi.fn();
  stored = new Map();
  listeners = new Map();
  vi.stubGlobal("window", {
    addEventListener: (type: string, listener: () => void) => listeners.set(type, listener),
  });
  vi.stubGlobal("location", { reload });
  vi.stubGlobal("sessionStorage", {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem: (key: string, value: string) => stored.set(key, value),
  });
  stale = await import("./stale-build");
});
afterEach(() => vi.unstubAllGlobals());

it("recognises a chunk an older build named, in each browser's words", () => {
  for (const message of [
    "Failed to fetch dynamically imported module: https://my.lymi.app/assets/explore-a1.js",
    "error loading dynamically imported module: https://my.lymi.app/assets/explore-a1.js",
    "Importing a module script failed.",
    "Unable to preload CSS for /assets/explore-a1.css",
  ]) {
    expect(stale.isStaleChunkError(new TypeError(message))).toBe(true);
  }
  expect(stale.isStaleChunkError(new TypeError("Cannot read properties of undefined"))).toBe(false);
  expect(stale.isStaleChunkError("Importing a module script failed.")).toBe(false);
});

it("reloads once per build, so a chunk that still fails is reported rather than looped", async () => {
  expect(stale.reloadOntoCurrentBuild()).toBe(true);
  expect(stale.reloadOntoCurrentBuild()).toBe(true);
  expect(reload).toHaveBeenCalledTimes(1);

  vi.resetModules();
  stale = await import("./stale-build");
  expect(stale.reloadOntoCurrentBuild()).toBe(false);
  expect(reload).toHaveBeenCalledTimes(1);
});

it("does not reload when the tab cannot remember that it tried", () => {
  vi.stubGlobal("sessionStorage", {
    getItem: () => {
      throw new Error("blocked");
    },
  });
  expect(stale.reloadOntoCurrentBuild()).toBe(false);
  expect(reload).not.toHaveBeenCalled();
});

it("does not pull the learner back to a page they are leaving", () => {
  listeners.get("beforeunload")?.();
  expect(stale.reloadOntoCurrentBuild()).toBe(true);
  expect(reload).not.toHaveBeenCalled();

  listeners.get("pageshow")?.();
  expect(stale.reloadOntoCurrentBuild()).toBe(true);
  expect(reload).toHaveBeenCalledTimes(1);
});
