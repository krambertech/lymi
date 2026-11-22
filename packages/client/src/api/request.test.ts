import { afterEach, describe, expect, it, vi } from "vitest";
import { configureClient } from "../config";
import { configureForTest } from "../test/configure";
import { resetUpdateRequired, updateRequired } from "../update-required";
import { ApiError, apiUrl, RequestTimeout, request } from "./request";

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

it("versions audio URLs on edits without putting card text in the URL", async () => {
  const { cardsApi } = await import("./cards");
  configureForTest(new Map());
  const timestamp = "2026-10-18T12:00:00.000Z";
  const first = cardsApi.audioUrl("card/one", timestamp);
  expect(first).toBe(`/api/audio/card%2Fone?v=1-${Date.parse(timestamp)}`);
  expect(cardsApi.audioUrl("card/one", new Date(timestamp))).toBe(first);
  expect(cardsApi.storedAudioUrl("card/one", timestamp)).toBe(`${first}&stored=1`);
  expect(cardsApi.audioUrl("card/one", "2026-10-18T12:01:00.000Z")).not.toBe(first);
});

describe("a refusal", () => {
  const refuse = async (status: number, body: unknown) => {
    configureForTest(new Map());
    fetch.mockResolvedValueOnce(Response.json(body, { status }));
    return request("/api/decks").catch((e: unknown) => e);
  };

  it("shows the app's sentence, never the server's English", async () => {
    const error = "Only the owner can do this";
    expect(await refuse(403, { error })).toMatchObject({ message: "owner only" });
    expect(await refuse(404, { error })).toMatchObject({ message: "gone" });
    expect(await refuse(409, { error, code: "code_wrong" })).toMatchObject({
      message: "failed",
      code: "code_wrong",
    });
    expect(await refuse(503, { error })).toMatchObject({ message: "unreachable" });
  });

  it("shows a schema's message, which is written for a person", async () => {
    const issues = [{ message: "Write a term" }];
    expect(await refuse(400, { error: "Invalid input", issues })).toMatchObject({
      message: "Write a term",
    });
  });

  it("keeps the first update notice until the app restarts", async () => {
    await refuse(426, {
      error: "Update",
      code: "update_required",
      updateUrl: "https://lymi.app/first",
    });
    await refuse(426, {
      error: "Update",
      code: "update_required",
      updateUrl: "https://lymi.app/second",
    });
    expect(updateRequired()).toEqual({ updateUrl: "https://lymi.app/first" });
    resetUpdateRequired();
  });
});

it("ends at its deadline on the phone, whose AbortSignal has neither any nor timeout", async () => {
  vi.useFakeTimers();
  const missing = () => {
    throw new TypeError("undefined is not a function");
  };
  vi.spyOn(AbortSignal, "any").mockImplementation(missing);
  vi.spyOn(AbortSignal, "timeout").mockImplementation(missing);
  configureForTest(new Map());
  fetch.mockImplementationOnce(
    (_url, init) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      }),
  );
  const settled = request("/api/decks", { timeout: 5_000 }).catch((e: unknown) => e);
  await vi.advanceTimersByTimeAsync(5_000);
  expect(await settled).toBeInstanceOf(RequestTimeout);
  vi.useRealTimers();
  vi.restoreAllMocks();
});
