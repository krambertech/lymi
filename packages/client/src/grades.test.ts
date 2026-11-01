import type { ReviewMode } from "@lymi/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureForTest } from "./test/configure";

const store = new Map<string, string>();
configureForTest(store);

const grade = vi.fn();
const undoReview = vi.fn();
vi.mock("./api", async () => {
  class ApiError extends Error {
    constructor(
      public status: number,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    ApiError,
    api: {
      grade: (...a: unknown[]) => grade(...a),
      undoReview: (...a: unknown[]) => undoReview(...a),
    },
  };
});

const { ApiError } = await import("./api");
const grades = await import("./grades");

const M: ReviewMode = { cue: "term", target: "meaning" };
const offline = () => new ApiError(0, "offline");
let tick = 0;
const g = (cardId: string, rating: 1 | 2 | 3 | 4 = 3) => {
  tick += 1;
  return {
    cardId,
    mode: M,
    rating,
    reviewedAt: new Date(Date.UTC(2026, 8, 13, 12, 0, tick)).toISOString(),
    stateBefore: 2,
  };
};
const accepted = (reviewId: string) => ({ ok: true, duplicate: false, reviewId });

beforeEach(() => {
  store.clear();
  grades.resetGradeCache();
  grade.mockReset();
  undoReview.mockReset();
});

describe("recording a grade", () => {
  it("keeps it before the server answers, so the review moves on at once", async () => {
    let answer = (_: unknown) => {};
    grade.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    const recorded = grades.recordGrade(g("a"));
    expect(grades.gradeStore.snapshot()).toMatchObject([{ cardId: "a" }]);
    expect(grades.outboxSize()).toBe(1);
    answer(accepted("rev-1"));
    expect(await recorded).toBe("sent");
  });

  it("sends it and keeps it for today's draws", async () => {
    grade.mockResolvedValueOnce(accepted("rev-1"));
    expect(await grades.recordGrade(g("a"))).toBe("sent");
    expect(grades.gradeStore.snapshot()).toMatchObject([{ cardId: "a" }]);
    expect(grades.outboxSize()).toBe(0);
  });

  it("queues offline, and sends later grades only after the queued ones", async () => {
    grade.mockRejectedValueOnce(offline());
    expect(await grades.recordGrade(g("a", 1))).toBe("queued");
    grade.mockRejectedValueOnce(offline());
    expect(await grades.recordGrade(g("b"))).toBe("queued");
    expect(grades.outboxSize()).toBe(2);

    grade.mockResolvedValueOnce(accepted("rev-a")).mockResolvedValueOnce(accepted("rev-b"));
    expect(await grades.flushOutbox()).toBe(2);
    expect(grade.mock.calls.map(([body]) => (body as { cardId: string }).cardId)).toEqual([
      "a",
      "a",
      "a",
      "b",
    ]);
    expect(grades.outboxSize()).toBe(0);
  });

  it("keeps a peek with a queued grade and sends it on replay", async () => {
    grade.mockRejectedValueOnce(offline());
    expect(await grades.recordGrade({ ...g("a"), aid: "hint" })).toBe("queued");
    grades.resetGradeCache();
    grade.mockResolvedValueOnce(accepted("rev-a"));
    expect(await grades.flushOutbox()).toBe(1);
    expect(grade.mock.calls.at(-1)?.[0]).toMatchObject({ cardId: "a", rating: 3, aid: "hint" });
  });

  it("keeps the times measured at the grade with a queued grade and sends them on replay", async () => {
    grade.mockRejectedValueOnce(offline());
    expect(await grades.recordGrade({ ...g("a"), recallMs: 4210, gradeMs: 870 })).toBe("queued");
    grades.resetGradeCache();
    grade.mockResolvedValueOnce(accepted("rev-a"));
    expect(await grades.flushOutbox()).toBe(1);
    expect(grade.mock.calls.at(-1)?.[0]).toMatchObject({ recallMs: 4210, gradeMs: 870 });
  });

  it("keeps the faded readings with a queued grade, sends them on replay, and keeps the state the server set", async () => {
    grade.mockRejectedValueOnce(offline());
    expect(await grades.recordGrade({ ...g("a"), readingsFaded: 2 })).toBe("queued");
    grades.resetGradeCache();
    grade.mockResolvedValueOnce({ ...accepted("rev-a"), state: 2 });
    expect(await grades.flushOutbox()).toBe(1);
    expect(grade.mock.calls.at(-1)?.[0]).toMatchObject({ readingsFaded: 2 });
    expect(grades.gradeStore.snapshot()).toMatchObject([{ cardId: "a", stateAfter: 2 }]);
  });

  it("drops a refused grade, so the card comes back", async () => {
    grade.mockRejectedValueOnce(new ApiError(422, "invalid"));
    expect(await grades.recordGrade(g("a"))).toBe("refused");
    expect(grades.gradeStore.snapshot()).toEqual([]);
  });

  it("tells a grade for a card that is gone from any other refusal", async () => {
    grade.mockRejectedValueOnce(new ApiError(404, "gone"));
    expect(await grades.recordGrade(g("a"))).toBe("gone");
    expect(grades.gradeStore.snapshot()).toEqual([]);
  });

  it("forgets a grade the server calls a duplicate", async () => {
    grade.mockResolvedValueOnce({ ok: true, duplicate: true, reviewId: null });
    expect(await grades.recordGrade(g("a"))).toBe("duplicate");
    expect(grades.gradeStore.snapshot()).toEqual([]);
  });

  it("reads a grade queued by the old outbox, which named a direction", () => {
    store.set(
      "lymi-outbox",
      JSON.stringify([
        {
          cardId: "a",
          direction: "recognition",
          rating: 3,
          reviewedAt: "2026-09-13T12:00:00.000Z",
        },
      ]),
    );
    grades.resetGradeCache();
    expect(grades.gradeStore.snapshot()).toMatchObject([{ cardId: "a", mode: M }]);
    expect(grades.outboxSize()).toBe(1);
  });
});

describe("taking a grade back", () => {
  it("drops a queued grade that was never sent", async () => {
    grade.mockRejectedValue(offline());
    await grades.recordGrade(g("a"));
    const behind = g("b");
    await grades.recordGrade(behind);

    expect(await grades.undoGrade(behind)).toBe("undone");
    expect(grades.gradeStore.snapshot().map((queued) => queued.cardId)).toEqual(["a"]);
    expect(grade.mock.calls.map(([sent]) => sent.cardId)).not.toContain("b");
    expect(undoReview).not.toHaveBeenCalled();
  });

  it("undoes a grade whose send got no answer, once the server names its attempt", async () => {
    const unanswered = g("a");
    grade.mockRejectedValueOnce(offline());
    await grades.recordGrade(unanswered);

    grade.mockResolvedValueOnce({ ok: true, duplicate: true, reviewId: "rev-1", state: 2 });
    undoReview.mockResolvedValueOnce({ ok: true });
    expect(await grades.undoGrade(unanswered)).toBe("undone");
    expect(undoReview).toHaveBeenCalledWith("rev-1");
    expect(grades.gradeStore.snapshot()).toEqual([]);
  });

  it("waits for the connection to undo a grade whose send got no answer", async () => {
    const unanswered = g("a");
    grade.mockRejectedValueOnce(offline());
    await grades.recordGrade(unanswered);

    grade.mockRejectedValueOnce(offline());
    expect(await grades.undoGrade(unanswered)).toBe("pending");
    expect(grades.gradeStore.snapshot()).toMatchObject([{ undone: true }]);

    grade.mockResolvedValueOnce(accepted("rev-1"));
    undoReview.mockResolvedValueOnce({ ok: true });
    expect(await grades.flushOutbox()).toBe(0);
    expect(undoReview).toHaveBeenCalledWith("rev-1");
    expect(grades.gradeStore.snapshot()).toEqual([]);
  });

  it("keeps a grade with no answer when the replay lands but the undo is refused", async () => {
    const unanswered = g("a");
    grade.mockRejectedValueOnce(offline());
    await grades.recordGrade(unanswered);

    grade.mockResolvedValueOnce({ ok: true, duplicate: true, reviewId: "rev-1", state: 2 });
    undoReview.mockRejectedValueOnce(new ApiError(409, "Only the latest grade"));
    expect(await grades.undoGrade(unanswered)).toBe("kept");
    expect(grades.gradeStore.snapshot()).toMatchObject([{ reviewId: "rev-1" }]);
  });

  it("drops a grade with no answer when the server says a later grade came first", async () => {
    const unanswered = g("a");
    grade.mockRejectedValueOnce(offline());
    await grades.recordGrade(unanswered);

    grade.mockResolvedValueOnce({ ok: true, duplicate: true, reviewId: null, state: 2 });
    expect(await grades.undoGrade(unanswered)).toBe("undone");
    expect(undoReview).not.toHaveBeenCalled();
  });

  it("drops a grade with no answer that the server refuses on the way to undoing it", async () => {
    const unanswered = g("a");
    grade.mockRejectedValueOnce(offline());
    await grades.recordGrade(unanswered);

    grade.mockRejectedValueOnce(new ApiError(404, "gone"));
    expect(await grades.undoGrade(unanswered)).toBe("undone");
    expect(grades.gradeStore.snapshot()).toEqual([]);
  });

  it("keeps a grade with no answer for undoing while the session has lapsed", async () => {
    const unanswered = g("a");
    grade.mockRejectedValueOnce(offline());
    await grades.recordGrade(unanswered);

    grade.mockRejectedValueOnce(new ApiError(401, "sign in"));
    expect(await grades.undoGrade(unanswered)).toBe("pending");
  });

  it("undoes a sent grade by the attempt the server named", async () => {
    grade.mockResolvedValueOnce(accepted("rev-1"));
    const sent = g("a");
    await grades.recordGrade(sent);
    undoReview.mockResolvedValueOnce({ ok: true });
    expect(await grades.undoGrade(sent)).toBe("undone");
    expect(undoReview).toHaveBeenCalledWith("rev-1");
    expect(grades.gradeStore.snapshot()).toEqual([]);
  });

  it("undoes a grade the server stored though its response never arrived", async () => {
    const lost = g("a");
    grade.mockRejectedValueOnce(offline());
    expect(await grades.recordGrade(lost)).toBe("queued");

    grade.mockResolvedValueOnce({ ok: true, duplicate: true, reviewId: "rev-1", state: 2 });
    expect(await grades.flushOutbox()).toBe(1);
    expect(grades.gradeStore.snapshot()).toMatchObject([{ sentAt: expect.any(Number) }]);

    undoReview.mockResolvedValueOnce({ ok: true });
    expect(await grades.undoGrade(lost)).toBe("undone");
    expect(undoReview).toHaveBeenCalledWith("rev-1");
  });

  it("keeps a replayed grade the server will not undo", async () => {
    const lost = g("a");
    grade.mockRejectedValueOnce(offline());
    await grades.recordGrade(lost);
    grade.mockResolvedValueOnce({ ok: true, duplicate: true, reviewId: "rev-1", state: 2 });
    await grades.flushOutbox();

    undoReview.mockRejectedValueOnce(new ApiError(409, "Only the latest grade"));
    expect(await grades.undoGrade(lost)).toBe("kept");
  });

  it("drops a replayed grade that a later grade beat to the server", async () => {
    const beaten = g("a");
    grade.mockRejectedValueOnce(offline());
    await grades.recordGrade(beaten);
    grade.mockResolvedValueOnce({ ok: true, duplicate: true, reviewId: null, state: 2 });
    expect(await grades.flushOutbox()).toBe(0);
    expect(grades.gradeStore.snapshot()).toEqual([]);
  });

  it("waits for the connection to undo a sent grade, and the draw forgets it meanwhile", async () => {
    grade.mockResolvedValueOnce(accepted("rev-1"));
    const sent = g("a");
    await grades.recordGrade(sent);
    undoReview.mockRejectedValueOnce(offline());
    expect(await grades.undoGrade(sent)).toBe("pending");
    expect(grades.gradeStore.snapshot()).toMatchObject([{ cardId: "a", undone: true }]);
    expect(grades.outboxSize()).toBe(1);

    undoReview.mockResolvedValueOnce({ ok: true });
    await grades.flushOutbox();
    expect(undoReview).toHaveBeenCalledTimes(2);
    expect(grades.gradeStore.snapshot()).toEqual([]);
  });

  it("undoes a grade taken back while it was still being sent", async () => {
    let answer = (_: unknown) => {};
    grade.mockReturnValueOnce(new Promise((resolve) => (answer = resolve)));
    const sending = g("a");
    const recorded = grades.recordGrade(sending);
    await vi.waitFor(() => expect(grade).toHaveBeenCalled());
    undoReview.mockResolvedValueOnce({ ok: true });
    const undone = grades.undoGrade(sending);
    answer(accepted("rev-1"));
    await recorded;
    expect(await undone).toBe("undone");
    expect(undoReview).toHaveBeenCalledWith("rev-1");
  });

  it("lets the grade stand when the server refuses to undo it", async () => {
    grade.mockResolvedValueOnce(accepted("rev-1"));
    const sent = g("a");
    await grades.recordGrade(sent);
    undoReview.mockRejectedValueOnce(new ApiError(409, "not the latest"));
    expect(await grades.undoGrade(sent)).toBe("kept");
    expect(grades.gradeStore.snapshot()).toMatchObject([{ cardId: "a", reviewId: "rev-1" }]);
    expect(grades.gradeStore.snapshot()[0]?.undone).toBeUndefined();
  });
});

describe("across tabs", () => {
  /** A queue per lock name, as the browser keeps across a device's tabs. */
  const browserLocks = () => {
    const tails = new Map<string, Promise<unknown>>();
    return {
      request<T>(name: string, task: () => Promise<T>) {
        const run = (tails.get(name) ?? Promise.resolve()).then(task, task);
        tails.set(
          name,
          run.catch(() => undefined),
        );
        return run;
      },
    };
  };
  afterEach(() => vi.unstubAllGlobals());

  it("sends nothing while another tab holds the grade lock", async () => {
    const locks = browserLocks();
    vi.stubGlobal("navigator", { locks });
    grade.mockResolvedValue(accepted("rev-1"));

    let otherTabDone = () => {};
    const otherTab = new Promise<void>((resolve) => {
      otherTabDone = resolve;
    });
    void locks.request("lymi-grades", () => otherTab);

    const recorded = grades.recordGrade(g("a"));
    await new Promise((resolve) => setTimeout(resolve));
    expect(grade).not.toHaveBeenCalled();

    otherTabDone();
    expect(await recorded).toBe("sent");
    expect(grade).toHaveBeenCalledTimes(1);
  });

  it("still flushes grades from inside a flush of writes", async () => {
    const locks = browserLocks();
    vi.stubGlobal("navigator", { locks });
    grade.mockRejectedValueOnce(offline());
    await grades.recordGrade(g("a"));

    grade.mockResolvedValueOnce(accepted("rev-1"));
    const sent = await locks.request("lymi-writes", () => grades.flushOutbox());
    expect(sent).toBe(1);
  });
});

describe("retiring", () => {
  it("keeps today's sent grades for every scope's draw, and drops earlier days' sent ones", async () => {
    grade.mockResolvedValueOnce(accepted("r1"));
    const today = g("a");
    await grades.recordGrade(today);
    store.set(
      "lymi-outbox",
      JSON.stringify([
        { ...g("old"), reviewedAt: "2026-09-12T20:00:00.000Z", sentAt: 1 },
        { ...g("queued-old"), reviewedAt: "2026-09-12T20:00:00.000Z" },
        ...grades.gradeStore.snapshot(),
      ]),
    );
    grades.retireGrades("2026-09-13T00:00:00.000Z");
    expect(grades.gradeStore.snapshot().map((x) => x.cardId)).toEqual(["queued-old", "a"]);
  });
});

describe("resilience", () => {
  it.each([
    [401, "the session has lapsed"],
    [426, "the release is too old for the API"],
  ])("keeps queued grades at %i, when %s", async (status) => {
    grade.mockRejectedValueOnce(offline());
    await grades.recordGrade(g("a"));
    grade.mockRejectedValueOnce(new ApiError(status, "wait"));
    expect(await grades.flushOutbox()).toBe(0);
    expect(grades.outboxSize()).toBe(1);
  });

  it("sends other cards past a grade the server keeps failing, but holds that card's later grades", async () => {
    grade.mockRejectedValueOnce(offline());
    await grades.recordGrade(g("a", 1));
    grade.mockRejectedValueOnce(new ApiError(500, "broken")).mockResolvedValueOnce(accepted("rb"));
    expect(await grades.recordGrade(g("b"))).toBe("sent");
    grade.mockRejectedValueOnce(new ApiError(500, "broken"));
    expect(await grades.recordGrade(g("a"))).toBe("queued");
    expect(grades.outboxSize()).toBe(2);
  });

  it("skips one unreadable entry and keeps the rest of the queue", async () => {
    store.set(
      "lymi-outbox",
      JSON.stringify([g("a"), { ...g("broken"), reviewedAt: "not a date" }, null, g("b")]),
    );
    grades.resetGradeCache();
    expect(grades.gradeStore.snapshot().map((x) => x.cardId)).toEqual(["a", "b"]);
    grade.mockRejectedValueOnce(offline());
    await grades.recordGrade(g("c"));
    expect(grades.outboxSize()).toBe(3);
  });

  it("reads what another tab wrote instead of overwriting it", async () => {
    grade.mockRejectedValueOnce(offline());
    await grades.recordGrade(g("a"));
    store.set(
      "lymi-outbox",
      JSON.stringify([...grades.gradeStore.snapshot(), g("from-other-tab")]),
    );
    grade.mockRejectedValueOnce(offline());
    await grades.recordGrade(g("b"));
    expect(grades.gradeStore.snapshot().map((x) => x.cardId)).toEqual(["a", "from-other-tab", "b"]);
  });
});
