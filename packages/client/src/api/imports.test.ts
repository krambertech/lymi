import { afterEach, describe, expect, it, vi } from "vitest";
import { configureForTest } from "../test/configure";
import { importsApi, PREVIEW_TIMEOUT_MS } from "./imports";
import { ApiError } from "./request";

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
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 0, message: "unreachable" });
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
