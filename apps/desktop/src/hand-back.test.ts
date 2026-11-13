import { describe, expect, it, vi } from "vitest";
import { handBack } from "./hand-back.js";

const link = "app.lymi.desktop://auth/callback#token=secret";

function setUp(overrides: Partial<Parameters<typeof handBack>[0]> = {}) {
  const deps = {
    complete: vi.fn(async () => {}),
    signedIn: vi.fn(() => false),
    askToRetry: vi.fn(async () => true),
    retry: vi.fn(async () => {}),
    report: vi.fn(),
    ...overrides,
  };
  return { ...deps, handle: handBack(deps) };
}

describe("a link the browser hands back", () => {
  it("signs in without a question when the trade works", async () => {
    const { handle, askToRetry, report } = setUp();
    await expect(handle(link)).resolves.toBe(true);
    expect(askToRetry).not.toHaveBeenCalled();
    expect(report).not.toHaveBeenCalled();
  });

  it("reports the cause of a failed trade and starts again on yes", async () => {
    const cause = new Error("the token exchange answered 401");
    const { handle, report, retry } = setUp({ complete: vi.fn().mockRejectedValue(cause) });
    await expect(handle(link)).resolves.toBe(false);
    expect(report).toHaveBeenCalledWith(cause);
    expect(retry).toHaveBeenCalledOnce();
  });

  it("starts nothing on no", async () => {
    const { handle, retry } = setUp({
      complete: vi.fn().mockRejectedValue(new Error("failed")),
      askToRetry: vi.fn(async () => false),
    });
    await handle(link);
    expect(retry).not.toHaveBeenCalled();
  });

  it("reports but asks nothing when a repeated link fails after the first signed in", async () => {
    const { handle, askToRetry, report } = setUp({
      complete: vi.fn().mockRejectedValue(new Error("no sign-in waiting")),
      signedIn: vi.fn(() => true),
    });
    await handle(link);
    expect(report).toHaveBeenCalledOnce();
    expect(askToRetry).not.toHaveBeenCalled();
  });

  it("asks once while two failed links are open, and again for a later one", async () => {
    let answer = (_yes: boolean) => {};
    const askToRetry = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          answer = resolve;
        }),
    );
    const { handle, report } = setUp({
      complete: vi.fn().mockRejectedValue(new Error("failed")),
      askToRetry,
    });
    const first = handle(link);
    await vi.waitFor(() => expect(askToRetry).toHaveBeenCalledOnce());
    await handle(link);
    expect(report).toHaveBeenCalledTimes(2);
    expect(askToRetry).toHaveBeenCalledOnce();
    answer(false);
    await first;
    const third = handle(link);
    await vi.waitFor(() => expect(askToRetry).toHaveBeenCalledTimes(2));
    answer(false);
    await third;
  });

  it("starts nothing if the browser finished the sign-in while the question was up", async () => {
    let signedIn = false;
    const { handle, retry } = setUp({
      complete: vi.fn().mockRejectedValue(new Error("failed")),
      signedIn: () => signedIn,
      askToRetry: vi.fn(async () => {
        signedIn = true;
        return true;
      }),
    });
    await handle(link);
    expect(retry).not.toHaveBeenCalled();
  });

  it("reports a retry that cannot open the browser", async () => {
    const cause = new Error("no default browser");
    const { handle, report } = setUp({
      complete: vi.fn().mockRejectedValue(new Error("failed")),
      retry: vi.fn().mockRejectedValue(cause),
    });
    await expect(handle(link)).resolves.toBe(false);
    expect(report).toHaveBeenLastCalledWith(cause);
  });
});
