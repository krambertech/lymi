import { daySatisfied, drawKey, type Rating, type Round } from "@lymi/core";
import type { ProductAnalyticsEvent } from "@lymi/core/analytics";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import {
  type DeckSummary,
  deviceTimezone,
  type QueueItem,
  type ReviewScope,
  scopeKey,
} from "../api";
import { withoutDropped } from "../dropped-grades";
import { gradeStore, type Recorded, recordGrade, retireGrades, undoGrade } from "../grades";
import {
  decksQuery,
  drawQuery,
  queueQuery,
  sectionsQuery,
  seriesQuery,
  streakQuery,
} from "../queries";
import { drawableLeft } from "../review-day";
import { drawState, type LocalGrade } from "../review-draw";
import type { Offer } from "../review-end";
import {
  cardKey,
  type FlowInputs,
  type FlowView,
  flowReducer,
  flowView,
  type GradeExtras,
  gradeRecord,
  type LastGrade,
  LOOKAHEAD,
  type Mark,
  offerEvent,
  type Pinned,
  REFRESH_AFTER,
  startFlow,
} from "./core";
import { ReviewLegs } from "./legs";

/** What the review needs from the platform it runs on; keep one per platform, outside any component. */
export interface ReviewPlatform {
  track: (event: ProductAnalyticsEvent) => void;
  newId: () => string;
  /** Calls back when the app returns to the front, and returns how to stop. */
  onForeground: (back: () => void) => () => void;
  /** Calls back when the whole app goes away mid-review, and returns how to stop. */
  onExit?: (gone: () => void) => () => void;
}

export interface ReviewFlow extends FlowView {
  data: FlowInputs["data"];
  state: FlowInputs["state"];
  left: number;
  /** Nothing loaded and the fetch failed: say so, rather than wait on a blank screen. */
  failed: boolean;
  decks: DeckSummary[] | undefined;
  /** The deck, section or series the review is scoped to, once known. */
  scopeName: string | undefined;
  /** Grades `item`, or does nothing for a position already graded; `answered` resolves with a refusal to tell the learner about. */
  grade: (
    item: QueueItem,
    rating: Rating,
    extras: GradeExtras,
  ) => { record: LocalGrade; answered: Promise<"refused" | "gone" | null> } | null;
  /** Takes the last grade back. `kept` says the server kept it anyway; `stepped` that the review moved on again. */
  undo: () => { kept: Promise<{ kept: boolean; stepped: boolean }> } | null;
  /** Takes a card out of the review at once, or brings it back. */
  archive: (cardId: string, pin?: Pinned) => void;
  restore: (cardId: string, pin?: Pinned) => void;
  /** Leaving partway ends on the end screen; false when nothing was added since the last one. */
  pause: () => boolean;
  /** Takes an end screen's offer; `day` means the screen should open the day's draw. */
  offer: (offer: Offer) => { to: "here" | "day"; mark: Mark } | null;
  refetchDraw: () => void;
  retry: () => void;
}

const NO_GRADES: never[] = [];
const fresh = (q: { isFetchedAfterMount: boolean; fetchStatus: string }) =>
  q.isFetchedAfterMount || q.fetchStatus !== "fetching";

/**
 * One review on any platform: what comes next, grades and their outcomes, legs, the goal's stop, the
 * end screen, the day's turn and leg analytics. The screen draws it. docs/review.md.
 */
export function useReviewFlow(
  scope: ReviewScope,
  round: Round | undefined,
  cards: readonly string[] | undefined,
  platform: ReviewPlatform,
): ReviewFlow {
  const qc = useQueryClient();
  const { deck, series, section } = scope;
  const stableScope = useMemo(() => ({ deck, series, section }), [deck, series, section]);
  const [flow, dispatch] = useReducer(flowReducer, undefined, startFlow);

  const draw = useQuery(drawQuery(stableScope));
  const listed = !!round || !!cards;
  const list = useQuery({ ...queueQuery(stableScope, round, cards), enabled: listed });
  const decks = useQuery(decksQuery);
  const seriesList = useQuery({ ...seriesQuery, enabled: !!series });
  const scopeSections = useQuery({ ...sectionsQuery(deck ?? ""), enabled: !!section });
  const streak = useQuery(streakQuery);
  const allGrades = useSyncExternalStore(
    gradeStore.subscribe,
    gradeStore.snapshot,
    () => NO_GRADES,
  );
  const [now, setNow] = useState(() => new Date());

  // A cached draw can predate the last grade, so the first card waits for this mount's fetch.
  const { archived } = flow;
  const settled = fresh(draw);
  const data = useMemo(() => {
    const fetched = settled ? draw.data : undefined;
    if (!fetched || archived.size === 0) return fetched;
    return { ...fetched, cards: fetched.cards.filter((c) => !archived.has(c.card.id)) };
  }, [settled, draw.data, archived]);
  const grades = useMemo(() => withoutDropped(allGrades, data), [allGrades, data]);
  const state = useMemo(
    () => (data ? drawState(data, grades, now, deck, LOOKAHEAD) : undefined),
    [data, grades, now, deck],
  );
  const left = useMemo(
    () => (data && state ? drawableLeft(data, state, deck) : 0),
    [data, state, deck],
  );

  const roundList = fresh(list) ? list.data : undefined;
  const streakSettled = fresh(streak);
  const today = streak.data?.today;
  const scopeSection = section
    ? scopeSections.data?.sections.find((s) => s.id === section)
    : undefined;
  const inputs: FlowInputs = {
    scope: stableScope,
    list: cards ? "chosen" : round ? "round" : null,
    data,
    state,
    left,
    drawFetching: draw.isFetching,
    unreachable: draw.fetchStatus === "paused" || draw.isError,
    round: roundList,
    roundFetch: {
      updatedAt: list.dataUpdatedAt,
      idle: list.fetchStatus === "idle",
      failed: list.isError || list.fetchStatus === "paused",
    },
    lastChange: Math.max(0, ...grades.map((g) => new Date(g.reviewedAt).getTime())),
    decks: decks.data,
    scopeSection,
    // The persisted list can predate this visit, so it waits for this mount's fetch like the draw.
    decksLoading:
      ((!!deck || !!series) && !decks.isFetchedAfterMount && decks.fetchStatus === "fetching") ||
      (!!series && !seriesList.data && seriesList.fetchStatus === "fetching") ||
      (!!section && !scopeSections.isFetchedAfterMount && scopeSections.fetchStatus === "fetching"),
    streakSettled,
    daySatisfied: !!today && today.date === state?.day.date && daySatisfied(today.outcome),
  };
  const view = flowView(flow, inputs);

  const { steps, askRound, owesDrawFetch, legReport } = view;
  const stepKey = JSON.stringify(steps);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a step is the same step until its text changes.
  useEffect(() => {
    for (const step of steps) dispatch(step);
  }, [stepKey]);
  const askKey = askRound ? `${askRound.at}:${askRound.done}` : null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: one ask per emptied page.
  useEffect(() => {
    if (!askRound) return;
    dispatch({ type: "asked", ask: askRound });
    void list.refetch();
  }, [askKey]);
  useEffect(() => {
    if (owesDrawFetch) void draw.refetch();
  }, [owesDrawFetch, draw.refetch]);

  // Sent grades from an earlier day are no longer in any draw.
  const fetchedDayStart = draw.data?.day.start;
  useEffect(() => {
    if (fetchedDayStart) retireGrades(fetchedDayStart);
  }, [fetchedDayStart]);

  // A new local day resets the order and the count; returning to the app catches a timer that slept.
  const dayEnd = state?.day.end.getTime();
  useEffect(
    () =>
      platform.onForeground(() => {
        setNow(new Date());
        if (dayEnd !== undefined && Date.now() >= dayEnd) {
          void qc.invalidateQueries({ queryKey: ["queue"] });
        }
      }),
    [dayEnd, qc, platform],
  );
  useEffect(() => {
    if (dayEnd === undefined) return;
    const wait = Math.min(Math.max(dayEnd - Date.now(), 0) + 50, 2_147_483_647);
    const timer = setTimeout(() => {
      setNow(new Date());
      void qc.invalidateQueries({ queryKey: ["queue"] });
    }, wait);
    return () => clearTimeout(timer);
  }, [dayEnd, qc]);

  const legs = useRef<ReviewLegs | null>(null);
  if (!legs.current) legs.current = new ReviewLegs(platform.track, platform.newId);
  useEffect(() => legs.current?.setStreak(streak.data), [streak.data]);
  const { key, date, scope: legScope, before, done, count } = legReport;
  const { presenting, stopped, paused, finished } = legReport;
  useEffect(() => {
    legs.current?.step({
      key,
      date,
      scope: legScope,
      before,
      done,
      count,
      presenting,
      stopped,
      paused,
      finished,
    });
  }, [key, date, legScope, before, done, count, presenting, stopped, paused, finished]);
  // A strict remount closes nothing: the leg is left only if no mount came back by the next tick.
  const mounts = useRef(0);
  useEffect(() => {
    const mount = ++mounts.current;
    const stopWatching = platform.onExit?.(() => legs.current?.leave("pagehide"));
    return () => {
      stopWatching?.();
      queueMicrotask(() => {
        if (mounts.current === mount) legs.current?.leave();
      });
    };
  }, [platform]);

  const refreshStreak = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ["streak"] });
  }, [qc]);
  const refreshCounts = useCallback(() => {
    for (const queryKey of [["decks"], ["rounds"], ["insights"]]) {
      void qc.invalidateQueries({ queryKey });
    }
  }, [qc]);
  const refreshDay = useCallback(() => {
    refreshStreak();
    refreshCounts();
  }, [refreshStreak, refreshCounts]);

  // Each position in the review takes one grade, however fast the taps come.
  const gradedAt = useRef(-1);
  const undone = useRef(new Set<string>());

  const grade: ReviewFlow["grade"] = (item, rating, extras) => {
    if (!data || !state || gradedAt.current === flow.position) return null;
    gradedAt.current = flow.position;
    const record = gradeRecord(data, state, item, rating, new Date().toISOString(), extras);
    const runningShort = state.upcoming.length <= LOOKAHEAD;
    const last: LastGrade = { item, grade: record, listed: view.leg?.kind !== "draw" };
    const recorded = recordGrade({ ...record, timezone: deviceTimezone() });
    dispatch({ type: "graded", last });
    setNow(new Date());
    const answered = recorded.then((outcome: Recorded) => {
      if (outcome === "queued" || undone.current.has(record.reviewedAt)) {
        refreshDay();
        return null;
      }
      dispatch({ type: "settled", last, outcome });
      // A dropped grade leaves the fetched data behind, and so does a long run of sent ones.
      const behind = gradeStore
        .snapshot()
        .filter((g) => new Date(g.reviewedAt).getTime() >= data.fetchedAt).length;
      if (outcome !== "sent") {
        refreshDay();
        void qc.invalidateQueries({ queryKey: ["queue"] });
      } else if (behind >= REFRESH_AFTER || runningShort) {
        // The end waits on this fetch and draws the streak, so the slow counts wait: all of them share one database.
        refreshStreak();
        void qc
          .invalidateQueries(
            { queryKey: ["queue", scopeKey(stableScope)] },
            { cancelRefetch: false },
          )
          .finally(refreshCounts);
      } else refreshDay();
      return outcome === "refused" || outcome === "gone" ? outcome : null;
    });
    return { record, answered: answered.finally(() => dispatch({ type: "sent" })) };
  };

  const undo: ReviewFlow["undo"] = () => {
    const last = flow.last;
    if (!last) return null;
    undone.current.add(last.grade.reviewedAt);
    dispatch({ type: "undone", last });
    gradedAt.current = -1;
    const kept = undoGrade(last.grade).then((outcome) => {
      refreshDay();
      void qc.invalidateQueries({ queryKey: ["queue"] });
      if (outcome !== "kept") return { kept: false, stepped: false };
      undone.current.delete(last.grade.reviewedAt);
      const stepped = gradedAt.current === -1;
      dispatch({ type: "undoRefused", last, step: stepped });
      setNow(new Date());
      return { kept: true, stepped };
    });
    return { kept };
  };

  /** Every mode of the card this leg holds, so the round's count drops with it. */
  const legKeys = (cardId: string) => {
    const leg = view.leg;
    if (leg?.kind === "list") {
      return (roundList?.items ?? []).filter((i) => i.card.id === cardId).map(cardKey);
    }
    if (leg?.kind === "forgotten") {
      return leg.items.filter((d) => d.cardId === cardId).map((d) => drawKey(d.cardId, d.mode));
    }
    return [];
  };
  const archive: ReviewFlow["archive"] = (cardId, pin) =>
    dispatch({ type: "archived", cardId, keys: legKeys(cardId), pin });
  const restore: ReviewFlow["restore"] = (cardId, pin) =>
    dispatch({ type: "restored", cardId, keys: legKeys(cardId), pin });

  const pause = () => {
    if (!view.current || !view.added) return false;
    dispatch({ type: "paused" });
    return true;
  };

  const offer: ReviewFlow["offer"] = (taken) => {
    const event = offerEvent(taken, view, inputs);
    if (!event) return null;
    // The day's draw is a review without a scope, which starts over from where the day stands.
    if (taken.kind === "continue" && taken.to !== "resume" && (deck || series)) {
      return { to: "day", mark: event.mark };
    }
    dispatch(event);
    return { to: "here", mark: event.mark };
  };

  const seriesName = series ? seriesList.data?.find((s) => s.id === series)?.name : undefined;
  const deckName = deck ? decks.data?.find((d) => d.id === deck)?.name : undefined;
  return {
    ...view,
    data,
    state,
    left,
    failed:
      (!data && draw.isError && !draw.isFetching) ||
      (listed && !roundList && list.isError && !list.isFetching),
    decks: decks.data,
    scopeName: section ? scopeSection?.name : (deckName ?? seriesName),
    grade,
    undo,
    archive,
    restore,
    pause,
    offer,
    refetchDraw: () => void draw.refetch(),
    retry: () => {
      void draw.refetch();
      if (listed) void list.refetch();
    },
  };
}
