import type {
  Direction,
  DrawOut,
  GradeInput,
  GradeOut,
  Rating,
  ReviewDayProgress,
  ReviewMode,
  Round,
  RoundsOut,
} from "@lymi/core";
import type { Card } from "./cards";
import { deviceTimezone, request } from "./request";

/** What a review draws from: every deck, one deck, or one of the learner's series. */
export type ReviewScope = { deck?: string | undefined; series?: string | undefined };
/** One cache key per scope, so a series review and a deck review never share a draw. */
export const scopeKey = (scope: ReviewScope = {}) =>
  scope.deck ? `deck:${scope.deck}` : scope.series ? `series:${scope.series}` : "all";
const scopeParams = (scope: ReviewScope = {}) => ({
  ...(scope.deck ? { deck: scope.deck } : {}),
  ...(scope.series ? { series: scope.series } : {}),
});

export type QueueItem = {
  card: Card;
  mode: ReviewMode;
  /** Present for text modes only. */
  direction?: Direction;
  stateId: string;
  fsrsState: number;
  /** Absent once a grade since the fetch has moved the schedule. */
  next?: Record<Rating, string> | undefined;
};
export type Queue = { total: number; items: QueueItem[] };
/** `GET /api/review/draw`, with cards in the shape the rest of the client reads. */
export type Draw = Omit<DrawOut, "cards"> & {
  cards: (Omit<DrawOut["cards"][number], "card"> & { card: Card })[];
};

export const reviewApi = {
  queue: (scope?: ReviewScope, round?: Round) => {
    const params = new URLSearchParams(scopeParams(scope));
    if (round) params.set("round", round);
    const search = params.toString();
    return request<Queue>(`/api/review/queue${search ? `?${search}` : ""}`);
  },
  rounds: () => request<RoundsOut>(`/api/review/rounds?tz=${encodeURIComponent(deviceTimezone())}`),
  /** What the review draws from; `tz` only matters until the review zone is known. */
  draw: (scope?: ReviewScope) =>
    request<Draw>(
      `/api/review/draw?${new URLSearchParams({ tz: deviceTimezone(), ...scopeParams(scope) })}`,
    ),
  /** Settle today: confirms a nothing-due day, or an exhausted one. Send from a visible page. */
  checkToday: () =>
    request<ReviewDayProgress>("/api/review/today", {
      method: "POST",
      body: JSON.stringify({ timezone: deviceTimezone() }),
    }),
  grade: (body: GradeInput) =>
    request<GradeOut>("/api/review/grade", {
      method: "POST",
      body: JSON.stringify({
        ...body,
        reviewedAt: (body.reviewedAt ?? new Date()).toISOString(),
        timezone: body.timezone ?? deviceTimezone(),
      }),
    }),
};
