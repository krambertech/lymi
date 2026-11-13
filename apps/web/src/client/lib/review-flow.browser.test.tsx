import { resetGradeCache } from "@lymi/client/grades";
import { type ReviewFlow, type ReviewPlatform, useReviewFlow } from "@lymi/client/review-flow";
import type { GradeOut, StreakOut } from "@lymi/core";
import { QueryClient, QueryClientProvider, QueryObserver } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { renderHook } from "vitest-browser-react";
import { ApiError, api, type Card, type Draw, type ReviewScope, type Section } from "./api";
import { drawQuery } from "./queries";

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

async function openReview(draw: Draw, scope: ReviewScope = {}) {
  vi.spyOn(api, "draw").mockResolvedValue(draw);
  const { result } = await renderHook(() => useReviewFlow(scope, undefined, undefined, PLATFORM), {
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
  vi.useRealTimers();
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
  await vi.waitFor(() => {
    const keys = refreshed.mock.calls.map(([filters]) => filters?.queryKey?.[0]);
    expect(keys).toEqual(expect.arrayContaining(["decks", "rounds", "streak", "insights"]));
  });
});

test("checks the end of a section with one fetch, ahead of the day's other reads", async () => {
  vi.spyOn(api, "grade").mockResolvedValue(accepted);
  vi.spyOn(api, "sections").mockResolvedValue({
    sections: [{ id: "s", due: 1 } as Section],
    progress: null,
  });
  const stopWatchingDay = new QueryObserver(qc, {
    ...drawQuery({}),
    staleTime: Number.POSITIVE_INFINITY,
  }).subscribe(() => undefined);
  const scope = { deck: "a", section: "s" };
  const draw = drawOf(["a"]);
  const flow = await openReview(draw, scope);
  await vi.waitFor(() => expect(api.sections).toHaveBeenCalled());

  let land: (draw: Draw) => void = () => undefined;
  const fetched = vi.mocked(api.draw);
  fetched.mockClear();
  fetched.mockImplementation(() => new Promise((resolve) => (land = resolve)));
  vi.mocked(api.decks).mockClear();

  await gradeShown(flow.current)?.answered;
  await vi.waitFor(() => expect(fetched).toHaveBeenCalled());
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(fetched).toHaveBeenCalledTimes(1);
  expect(fetched).toHaveBeenCalledWith(scope);
  expect(api.decks).not.toHaveBeenCalled();
  expect(flow.current.end).toBeNull();

  land(draw);
  await vi.waitFor(() => expect(flow.current.end).not.toBeNull());
  await vi.waitFor(() => expect(api.decks).toHaveBeenCalled());
  expect(fetched).toHaveBeenCalledTimes(1);
  stopWatchingDay();
});

test("still refreshes the counts and ends when the end's draw fails", async () => {
  vi.spyOn(api, "grade").mockResolvedValue(accepted);
  const flow = await openReview(drawOf(["a"]));
  vi.mocked(api.decks).mockClear();
  vi.mocked(api.draw).mockRejectedValue(new ApiError(500, "down"));

  await gradeShown(flow.current)?.answered;

  await vi.waitFor(() => expect(flow.current.end).toBe("unchecked"));
  await vi.waitFor(() => expect(api.decks).toHaveBeenCalled());
});

test("keeps a section's end while the deck's new count lands before the section's", async () => {
  vi.spyOn(api, "grade").mockResolvedValue(accepted);
  const sections = (due: number) => ({
    sections: [{ id: "s", due } as Section],
    progress: null,
  });
  const deck = (due: number) => [{ id: "a", due }] as Awaited<ReturnType<typeof api.decks>>;
  vi.mocked(api.decks).mockResolvedValue(deck(2));
  const listed = vi.spyOn(api, "sections").mockResolvedValue(sections(1));
  const flow = await openReview(drawOf(["a"]), { deck: "a", section: "s" });
  await vi.waitFor(() => expect(listed).toHaveBeenCalled());
  await vi.waitFor(() => expect(flow.current.decks?.[0]?.due).toBe(2));

  let land: (value: ReturnType<typeof sections>) => void = () => undefined;
  listed.mockImplementation(() => new Promise((resolve) => (land = resolve)));
  vi.mocked(api.decks).mockResolvedValue(deck(1));
  await gradeShown(flow.current)?.answered;
  await vi.waitFor(() => expect(flow.current.end).not.toBeNull());
  const heading = () => {
    const { end } = flow.current;
    return end && end !== "unchecked" ? end.heading : null;
  };
  expect(heading()).toBe("scope_done");

  await vi.waitFor(() => expect(flow.current.decks?.[0]?.due).toBe(1));
  expect(heading()).toBe("scope_done");
  land(sections(1));
  await vi.waitFor(() => expect(heading()).toBe("day_done"));
});

test("holds a section's end until its first counts have settled together", async () => {
  vi.spyOn(api, "grade").mockResolvedValue(accepted);
  const sections = { sections: [{ id: "s", due: 0 } as Section], progress: null };
  let landSections: (value: typeof sections) => void = () => undefined;
  const listed = vi
    .spyOn(api, "sections")
    .mockImplementation(() => new Promise((resolve) => (landSections = resolve)));
  const flow = await openReview(drawOf(["a"]), { deck: "a", section: "s" });
  await vi.waitFor(() => expect(listed).toHaveBeenCalled());

  let landDecks: (value: Awaited<ReturnType<typeof api.decks>>) => void = () => undefined;
  const decks = vi.mocked(api.decks);
  decks.mockClear();
  decks.mockImplementation(() => new Promise((resolve) => (landDecks = resolve)));
  await gradeShown(flow.current)?.answered;
  await vi.waitFor(() => expect(decks).toHaveBeenCalled());

  landSections(sections);
  await new Promise((resolve) => setTimeout(resolve, 50));
  expect(flow.current.end).toBeNull();
  landDecks([]);
  await vi.waitFor(() => expect(flow.current.end).not.toBeNull());
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
  // The test owns the clock, so a slow runner cannot reach the day's end before the first draw.
  const start = new Date("2026-11-01T12:00:00Z").getTime();
  const end = start + 60 * 60_000;
  vi.useFakeTimers({ now: start, toFake: ["Date", "setTimeout", "clearTimeout"] });
  const today = drawOf(["a"], dayOf(end - DAY, end));
  const tomorrow = drawOf(["b"], dayOf(end, end + DAY));
  const draw = vi
    .spyOn(api, "draw")
    .mockImplementation(async () => (Date.now() < end ? today : tomorrow));
  const { result } = await renderHook(() => useReviewFlow({}, undefined, undefined, PLATFORM), {
    wrapper,
  });
  await vi.waitFor(() => expect(result.current.current?.card.id).toBe("a"));
  expect(result.current.leg?.date).toBe(today.day.date);
  const calls = draw.mock.calls.length;
  // Midnight passes with the review still open, and only the day's own timer can notice.
  await vi.advanceTimersByTimeAsync(end - Date.now() + 100);
  await vi.waitFor(() => expect(result.current.leg?.date).toBe(tomorrow.day.date));
  expect(draw.mock.calls.length).toBeGreaterThan(calls);
  await vi.waitFor(() => expect(result.current.current?.card.id).toBe("b"));
});
