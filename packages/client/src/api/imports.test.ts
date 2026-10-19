import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
import { importPreviewQuery, previewState } from "../queries/imports";
import { configureForTest } from "../test/configure";
import { importsApi, PREVIEW_TIMEOUT_MS } from "./imports";
import { ApiError, RequestTimeout } from "./request";

/** A fetch the network never settles, which gives up only when its signal aborts, as a browser's does. */
const hanging = vi.fn(
  (_url: string, init: RequestInit) =>
    new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () =>
        reject(new DOMException("The operation was aborted.", "AbortError")),
      );
    }),
);
vi.stubGlobal("fetch", hanging);

afterEach(() => {
  hanging.mockClear();
  vi.useRealTimers();
});

const choices = { languages: {}, roles: {}, skipDecks: [] };

describe("an import preview", () => {
  it("ends as unreachable when the network never answers", async () => {
    vi.useFakeTimers();
    configureForTest(new Map());
    const settled = importsApi.previewImport("imp1", choices).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(PREVIEW_TIMEOUT_MS);
    const error = await settled;
    expect(error).toBeInstanceOf(RequestTimeout);
    expect(error).toMatchObject({ status: 0, message: "unreachable" });
  });

  it("is not asked again after its deadline, so Try again shows at once", async () => {
    vi.useFakeTimers();
    configureForTest(new Map());
    const client = new QueryClient();
    const settled = client.fetchQuery(importPreviewQuery("imp1", choices)).catch((e) => e);
    await vi.advanceTimersByTimeAsync(PREVIEW_TIMEOUT_MS * 3);
    expect(await settled).toBeInstanceOf(RequestTimeout);
    expect(hanging).toHaveBeenCalledTimes(1);
  });

  it("stops when its query is cancelled", async () => {
    configureForTest(new Map());
    const controller = new AbortController();
    const settled = importsApi.previewImport("imp1", choices, controller.signal).catch((e) => e);
    await vi.waitFor(() => expect(hanging).toHaveBeenCalled());
    controller.abort();
    expect(await settled).toBeInstanceOf(ApiError);
  });
});

describe("the preview step's state", () => {
  const pending = {
    isPending: true,
    isPlaceholderData: false,
    isError: false,
    error: null,
    fetchStatus: "fetching" as const,
  };

  it("waits while fetching or paused for focus", () => {
    expect(previewState(pending, true)).toEqual({ waiting: true, error: undefined });
    expect(previewState({ ...pending, fetchStatus: "paused" }, true)).toEqual({
      waiting: true,
      error: undefined,
    });
  });

  it("reads a pause for a lost connection as unreachable", () => {
    configureForTest(new Map());
    expect(previewState({ ...pending, fetchStatus: "paused" }, false)).toEqual({
      waiting: false,
      error: "unreachable",
    });
  });

  it("answers once settled", () => {
    const settled = { ...pending, isPending: false, fetchStatus: "idle" as const };
    expect(previewState(settled, false)).toEqual({ waiting: false, error: undefined });
  });
});
