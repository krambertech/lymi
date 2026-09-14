import type { ReviewMode } from "@lymi/core";
import { beforeEach, describe, expect, it, vi } from "vitest";

const store = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => store.set(k, v),
  removeItem: (k: string) => store.delete(k),
});

const grade = vi.fn();
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
    api: { grade: (...a: unknown[]) => grade(...a) },
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

  it("drops a refused grade, so the card comes back", async () => {
    grade.mockRejectedValueOnce(new ApiError(404, "gone"));
    expect(await grades.recordGrade(g("a"))).toBe("refused");
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
  it("keeps queued grades when the session has lapsed", async () => {
    grade.mockRejectedValueOnce(offline());
    await grades.recordGrade(g("a"));
    grade.mockRejectedValueOnce(new ApiError(401, "sign in"));
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
