import {
  type Direction,
  type DrawOut,
  type GradeInput,
  type GradeOut,
  type Rating,
  type ReviewDayProgress,
  ReviewMode,
  type Round,
  type RoundsOut,
  type UndoOut,
} from "@lymi/core";
import type { Card } from "./cards";
import { deviceTimezone, request } from "./request";

export type ReviewScope = {
  deck?: string | undefined;
  series?: string | undefined;
  section?: string | undefined;
};
export const scopeKey = (scope: ReviewScope = {}) =>
  scope.section
    ? `section:${scope.section}`
    : scope.deck
      ? `deck:${scope.deck}`
      : scope.series
        ? `series:${scope.series}`
        : "all";
const scopeParams = (scope: ReviewScope = {}) => ({
  ...(scope.deck ? { deck: scope.deck } : {}),
  ...(scope.series ? { series: scope.series } : {}),
  ...(scope.section ? { section: scope.section } : {}),
});

export type QueueItem = {
  card: Card;
  mode: ReviewMode;
  direction?: Direction;
  stateId: string;
  fsrsState: number;
  next?: Record<Rating, string> | undefined;
  slipping?: boolean | undefined;
};
export type Queue = { total: number; items: QueueItem[] };
export type Draw = Omit<DrawOut, "cards"> & {
  cards: (Omit<DrawOut["cards"][number], "card"> & { card: Card })[];
};

const askable = (mode: unknown) => ReviewMode.safeParse(mode).success;

export const GRADE_TIMEOUT = 20_000;

export const reviewApi = {
  queue: async (scope?: ReviewScope, round?: Round, cards?: readonly string[]) => {
    const params = new URLSearchParams(scopeParams(scope));
    if (round) params.set("round", round);
    if (cards) params.set("cards", cards.join(","));
    const search = params.toString();
    const queue = await request<Queue>(`/api/review/queue${search ? `?${search}` : ""}`);
    return { ...queue, items: queue.items.filter((item) => askable(item.mode)) };
  },
  rounds: () => request<RoundsOut>(`/api/review/rounds?tz=${encodeURIComponent(deviceTimezone())}`),
  draw: async (scope?: ReviewScope) => {
    const draw = await request<Draw>(
      `/api/review/draw?${new URLSearchParams({ tz: deviceTimezone(), ...scopeParams(scope) })}`,
    );
    const cards = draw.cards
      .map((entry) => ({ ...entry, modes: entry.modes.filter((m) => askable(m.mode)) }))
      .filter((entry) => entry.modes.length > 0);
    return { ...draw, cards };
  },
  checkToday: () =>
    request<ReviewDayProgress>("/api/review/today", {
      method: "POST",
      body: JSON.stringify({ timezone: deviceTimezone() }),
    }),
  grade: (body: GradeInput) =>
    request<GradeOut>("/api/review/grade", {
      method: "POST",
      timeout: GRADE_TIMEOUT,
      body: JSON.stringify({
        ...body,
        reviewedAt: (body.reviewedAt ?? new Date()).toISOString(),
        timezone: body.timezone ?? deviceTimezone(),
      }),
    }),
  undoReview: (reviewId: string) =>
    request<UndoOut>("/api/review/undo", {
      method: "POST",
      timeout: GRADE_TIMEOUT,
      body: JSON.stringify({ reviewId }),
    }),
};
