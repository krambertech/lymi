import { afterEach, describe, expect, it, vi } from "vitest";
import { configureClient } from "../config";
import { configureForTest } from "../test/configure";
import { ApiError, apiUrl, request } from "./request";

const fetch = vi.fn(
  async (_url: string, _init: RequestInit) => new Response(JSON.stringify({ ok: true })),
);
vi.stubGlobal("fetch", fetch);

afterEach(() => fetch.mockClear());

const sent = (i = 0) => fetch.mock.calls[i] ?? ["", {}];

describe("a request", () => {
  it("goes to the web's own origin with its session cookie", async () => {
    configureForTest(new Map());
    await request("/api/decks");
    const [url, init] = sent();
    expect(url).toBe("/api/decks");
    expect(init.credentials).toBe("include");
    expect(init.headers).toEqual({ "content-type": "application/json" });
  });

  it("goes to the phone's base URL with the session headers it reads each time", async () => {
    let cookie = "session=one";
    configureClient({
      storage: { getItem: () => null, setItem() {}, removeItem() {}, keys: () => [] },
      messages: {
        unreachable: () => "",
        signIn: () => "",
        ownerOnly: () => "",
        gone: () => "",
        failed: () => "",
      },
      baseUrl: "https://my.lymi.app",
      credentials: "omit",
      headers: async () => ({ cookie }),
    });
    await request("/api/decks");
    cookie = "session=two";
    await request("/api/streak", { headers: { "x-extra": "1" } });
    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      "https://my.lymi.app/api/decks",
      "https://my.lymi.app/api/streak",
    ]);
    const [, init] = sent(1);
    expect(init.credentials).toBe("omit");
    expect(init.headers).toEqual({
      "content-type": "application/json",
      cookie: "session=two",
      "x-extra": "1",
    });
    expect(apiUrl("/api/audio/c1")).toBe("https://my.lymi.app/api/audio/c1");
  });

  it("reads a session it cannot read as signed out, so nothing queued is dropped", async () => {
    configureForTest(new Map(), {
      headers: () => {
        throw new Error("keychain locked");
      },
    });
    const error = await request("/api/decks").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, message: "sign in" });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("reads a network failure as offline, with the app's sentence", async () => {
    configureForTest(new Map());
    fetch.mockRejectedValueOnce(new TypeError("Network request failed"));
    const error = await request("/api/decks").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, message: "unreachable" });
  });
});
