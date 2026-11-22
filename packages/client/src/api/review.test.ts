import { afterEach, describe, expect, it, vi } from "vitest";
import { configureForTest } from "../test/configure";
import { RequestTimeout } from "./request";
import { GRADE_TIMEOUT, reviewApi, scopeKey } from "./review";

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

describe("a mode this release cannot ask", () => {
  const term = { cue: "term", target: "meaning" };
  const gap = { cue: "gap", target: "term" };
  const answer = (body: unknown) => {
    configureForTest(new Map());
    hanging.mockImplementationOnce(async () => Response.json(body));
  };

  it("is left out of a round", async () => {
    answer({ total: 2, items: [{ mode: term }, { mode: gap }] });
    expect((await reviewApi.queue()).items).toEqual([{ mode: term }]);
  });

  it("is left out of the draw, with a card that has no other, while its grades still count", async () => {
    const log = [{ cardId: "a", mode: gap }];
    answer({
      cards: [
        { card: { id: "a" }, modes: [{ mode: term }, { mode: gap }] },
        { card: { id: "b" }, modes: [{ mode: gap }] },
      ],
      log,
    });
    const draw = await reviewApi.draw();
    expect(draw.cards).toEqual([{ card: { id: "a" }, modes: [{ mode: term }] }]);
    expect(draw.log).toEqual(log);
  });
});

it("gives every review scope a key of its own", () => {
  const scopes = [{}, { deck: "x" }, { series: "x" }, { section: "x", deck: "y" }];
  expect(scopes.map((scope) => scopeKey(scope))).toEqual([
    "all",
    "deck:x",
    "series:x",
    "section:x",
  ]);
});
