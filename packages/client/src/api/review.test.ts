import { afterEach, describe, expect, it, vi } from "vitest";
import { configureForTest } from "../test/configure";
import { RequestTimeout } from "./request";
import { GRADE_TIMEOUT, reviewApi } from "./review";

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

describe("a send the network never answers", () => {
  it.each([
    ["grade", () => reviewApi.grade({ cardId: "c", direction: "recognition", rating: 3 })],
    ["undo", () => reviewApi.undoReview("r")],
  ])("%s ends as offline at its deadline, so the outbox lets go of its lock", async (_, send) => {
    vi.useFakeTimers();
    configureForTest(new Map());
    const settled = send().catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(GRADE_TIMEOUT);
    const error = await settled;
    expect(error).toBeInstanceOf(RequestTimeout);
    expect(error).toMatchObject({ status: 0 });
  });
});
