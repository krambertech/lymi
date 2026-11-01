import { resetGradeCache } from "@lymi/client/grades";
import { type ReviewFlow, type ReviewPlatform, useReviewFlow } from "@lymi/client/review-flow";
import type { GradeOut, StreakOut } from "@lymi/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { renderHook } from "vitest-browser-react";
import { ApiError, api, type Card, type Draw } from "./api";

const M = { cue: "meaning", target: "term" } as const;
const DAY = 86_400_000;

function dayOf(start: number, end: number) {
  const date = new Date(start).toISOString().slice(0, 10);
  return {
    date,
    zone: "UTC",
    start: new Date(start).toISOString(),
    end: new Date(end).toISOString(),
  };
}

function drawOf(ids: string[], day = dayOf(Date.now() - 1000, Date.now() + DAY)): Draw {
  const next = { 1: day.end, 2: day.end, 3: day.end, 4: day.end };
  return {
    day,
    goal: 20,
    attempts: 0,
    total: ids.length,
    log: [],
    cards: ids.map((id) => ({
      card: { id, deckId: "a", term: id } as Card,
      slipping: false,
      modes: [
        {
          mode: M,
          stateId: `s-${id}`,
          fsrsState: 2,
          due: new Date(Date.now() - DAY).toISOString(),
          retrievability: 0.5,
          added: new Date(Date.now() - 30 * DAY).toISOString(),
          hasCue: true,
          next,
        },
      ],
    })),
  } as unknown as Draw;
}

const accepted = { duplicate: false, reviewId: "r1", state: 2 } as unknown as GradeOut;
const PLATFORM: ReviewPlatform = {
  track: () => undefined,
  newId: () => "leg",
  onForeground: () => () => undefined,
};

let qc: QueryClient;
const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={qc}>{children}</QueryClientProvider>
);

async function openReview(draw: Draw) {
  vi.spyOn(api, "draw").mockResolvedValue(draw);
  const { result } = await renderHook(() => useReviewFlow({}, undefined, undefined, PLATFORM), {
    wrapper,
  });
  await vi.waitFor(() => expect(result.current.current).not.toBeNull());
  return result as { current: ReviewFlow };
}

const shown = (flow: ReviewFlow) => flow.current?.card.id;
function gradeShown(flow: ReviewFlow) {
  const { current } = flow;
  if (!current) throw new Error("no card on screen");
  return flow.grade(current, 3, {});
}

beforeEach(() => {
  localStorage.clear();
  resetGradeCache();
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  vi.spyOn(api, "streak").mockResolvedValue({
    reviewedDays: 1,
    today: { date: new Date().toISOString().slice(0, 10), attempts: 0, goal: 20, outcome: "open" },
  } as unknown as StreakOut);
  vi.spyOn(api, "decks").mockResolvedValue([]);
  vi.spyOn(api, "rounds").mockResolvedValue({} as Awaited<ReturnType<typeof api.rounds>>);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("takes one grade per position, however fast the taps come", async () => {
  vi.spyOn(api, "grade").mockResolvedValue(accepted);
  const flow = await openReview(drawOf(["a", "b"]));
  const first = flow.current;
  expect(gradeShown(first)).not.toBeNull();
  // The same render again, as a second tap before React draws the next card.
  expect(gradeShown(first)).toBeNull();
  await vi.waitFor(() => expect(flow.current.position).toBe(1));
  expect(api.grade).toHaveBeenCalledTimes(1);
});

test("refreshes what a grade moves once it is answered", async () => {
  vi.spyOn(api, "grade").mockResolvedValue(accepted);
  const flow = await openReview(drawOf(["a", "b"]));
  const refreshed = vi.spyOn(qc, "invalidateQueries");
  await gradeShown(flow.current)?.answered;
  const keys = refreshed.mock.calls.map(([filters]) => filters?.queryKey?.[0]);
  expect(keys).toEqual(expect.arrayContaining(["decks", "rounds", "streak", "insights"]));
});

test("drops the answer to a grade taken back while its send was pending", async () => {
  let refuse: (err: Error) => void = () => undefined;
  vi.spyOn(api, "grade").mockReturnValue(
    new Promise((_, reject) => {
      refuse = reject;
    }),
  );
  const flow = await openReview(drawOf(["a", "b"]));
  const card = shown(flow.current);
  const graded = gradeShown(flow.current);
  await vi.waitFor(() => expect(flow.current.position).toBe(1));
  flow.current.undo();
  await vi.waitFor(() => expect(shown(flow.current)).toBe(card));
  refuse(new ApiError(422, "refused"));
  await expect(graded?.answered).resolves.toBeNull();
  expect(shown(flow.current)).toBe(card);
});

test("steps forward again when the server keeps a grade Undo took back", async () => {
  vi.spyOn(api, "grade").mockResolvedValue(accepted);
  vi.spyOn(api, "undoReview").mockRejectedValue(new ApiError(409, "kept"));
  const flow = await openReview(drawOf(["a", "b"]));
  const card = shown(flow.current);
  await gradeShown(flow.current)?.answered;
  const taken = flow.current.undo();
  await expect(taken?.kept).resolves.toEqual({ kept: true, stepped: true });
  await vi.waitFor(() => expect(flow.current.position).toBe(1));
  expect(shown(flow.current)).not.toBe(card);
});

test("fetches the next day's draw when the day ends during a review", async () => {
  const end = Date.now() + 400;
  const today = drawOf(["a"], dayOf(end - DAY, end));
  const tomorrow = drawOf(["b"], dayOf(end, end + DAY));
  const draw = vi
    .spyOn(api, "draw")
    .mockImplementation(async () => (Date.now() < end ? today : tomorrow));
  const { result } = await renderHook(() => useReviewFlow({}, undefined, undefined, PLATFORM), {
    wrapper,
  });
  await vi.waitFor(() => expect(result.current.leg?.date).toBe(today.day.date));
  await vi.waitFor(() => expect(result.current.leg?.date).toBe(tomorrow.day.date), {
    timeout: 3000,
  });
  await vi.waitFor(() => expect(draw.mock.calls.length).toBeGreaterThan(1));
  await vi.waitFor(() => expect(result.current.current?.card.id).toBe("b"));
});
