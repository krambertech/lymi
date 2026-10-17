import {
  type Direction,
  DRAW_CARDS_MAX,
  type DrawInput,
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

/**
 * What a review draws from: every deck, one deck or one of its sections, one of the learner's
 * series, or chosen cards of a deck, such as what its filters show.
 */
export type ReviewScope = {
  deck?: string | undefined;
  series?: string | undefined;
  section?: string | undefined;
  cards?: readonly string[] | undefined;
};

/** A short, stable name for a set of ids, whatever their order. FNV-1a. */
function idsHash(ids: readonly string[]): string {
  let hash = 0x811c9dc5;
  for (const char of [...ids].sort().join(",")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${ids.length}.${(hash >>> 0).toString(36)}`;
}

/** One cache key per scope, so a series review and a deck review never share a draw. */
export const scopeKey = (scope: ReviewScope = {}) =>
  scope.cards
    ? `cards:${scope.deck ?? ""}:${idsHash(scope.cards)}`
    : scope.section
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
  /** Present for text modes only. */
  direction?: Direction;
  stateId: string;
  fsrsState: number;
  /** Absent once a grade since the fetch has moved the schedule. */
  next?: Record<Rating, string> | undefined;
  /** Often forgotten, so review offers to write a memory hook. */
  slipping?: boolean | undefined;
};
export type Queue = { total: number; items: QueueItem[] };
/** `GET /api/review/draw`, with cards in the shape the rest of the client reads. */
export type Draw = Omit<DrawOut, "cards"> & {
  cards: (Omit<DrawOut["cards"][number], "card"> & { card: Card })[];
};

/**
 * Whether this release can ask a mode. `ReviewMode` is open, so one the web added later is left
 * out of the review rather than shown as a mode it is not. ADR 0032.
 */
const askable = (mode: unknown) => ReviewMode.safeParse(mode).success;

export const reviewApi = {
  /** A round from Today, cards chosen in one deck, or the day's order. */
  queue: async (scope?: ReviewScope, round?: Round, cards?: readonly string[]) => {
    const params = new URLSearchParams(scopeParams(scope));
    if (round) params.set("round", round);
    if (cards) params.set("cards", cards.join(","));
    const search = params.toString();
    const queue = await request<Queue>(`/api/review/queue${search ? `?${search}` : ""}`);
    return { ...queue, items: queue.items.filter((item) => askable(item.mode)) };
  },
  rounds: () => request<RoundsOut>(`/api/review/rounds?tz=${encodeURIComponent(deviceTimezone())}`),
  /** What the review draws from; `tz` only matters until the review zone is known. */
  draw: async (scope?: ReviewScope) => {
    // Chosen cards can be too many for a query string, so they go in a body.
    const draw = scope?.cards
      ? await request<Draw>("/api/review/draw", {
          method: "POST",
          body: JSON.stringify({
            // Past the most one draw names, the deck's order keeps the first, so a huge filter still has its review.
            cards: scope.cards.slice(0, DRAW_CARDS_MAX),
            ...(scope.deck ? { deck: scope.deck } : {}),
            tz: deviceTimezone(),
          } satisfies DrawInput),
        })
      : await request<Draw>(
          `/api/review/draw?${new URLSearchParams({ tz: deviceTimezone(), ...scopeParams(scope) })}`,
        );
    // The log keeps every grade, so today's attempts still count one in a mode left out.
    const cards = draw.cards
      .map((entry) => ({ ...entry, modes: entry.modes.filter((m) => askable(m.mode)) }))
      .filter((entry) => entry.modes.length > 0);
    return { ...draw, cards };
  },
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
  /** Takes back the latest grade of a card's mode; an older one is 409. */
  undoReview: (reviewId: string) =>
    request<UndoOut>("/api/review/undo", { method: "POST", body: JSON.stringify({ reviewId }) }),
};
