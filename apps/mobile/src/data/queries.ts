import { deviceTimezone, type ReviewScope } from "@lymi/client/api";
import {
  gradeStore,
  type Recorded,
  recordGrade,
  type Undone,
  undoGrade,
} from "@lymi/client/grades";
import {
  activityQuery,
  archivedCardPagesQuery,
  archivedDecksQuery,
  deckCardsQuery,
  decksQuery,
  drawQuery,
  insightsQuery,
  queueQuery,
  roundsQuery,
  sectionsQuery,
  seriesQuery,
  streakQuery,
} from "@lymi/client/queries";
import { drawableLeft, streakToday } from "@lymi/client/review-day";
import {
  type DrawData,
  type DrawState,
  drawState,
  type LocalGrade,
} from "@lymi/client/review-draw";
import { writes } from "@lymi/client/writes";
import { type CardInput, DEFAULT_DAILY_GOAL, type Round, type StreakOut } from "@lymi/core";
import { lanternFor, streakFlameFor } from "@lymi/design";
import {
  onlineManager,
  type UseQueryResult,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { addDays, lastSevenDays } from "../ui/days";
import { withoutDropped } from "./dropped";

// Each screen reads one resource under the web's query key, so a grade refreshes only what it moves.

export const useDecks = () => useQuery(decksQuery);
/** The decks a card can be added to: only an owner adds cards, as on the web. */
export const useOwnedDecks = () =>
  useQuery({ ...decksQuery, select: (decks) => decks.filter((d) => d.role === "owner") });
export const useArchivedDecks = () => useQuery(archivedDecksQuery);
export const useArchivedCards = () => useInfiniteQuery(archivedCardPagesQuery);
export const useDeckCards = (deckId: string) => useQuery(deckCardsQuery(deckId));
export const useSections = (deckId: string | undefined) =>
  useQuery({ ...sectionsQuery(deckId ?? ""), enabled: !!deckId });
export const useStreak = () => useQuery(streakQuery);
export const useRounds = () => useQuery(roundsQuery);
export const useInsights = (period: 30 | 90 | 0) => useQuery(insightsQuery(period));
export const useActivity = () => useInfiniteQuery(activityQuery);
/** What the review draws from, ADR 0019. Unscoped, it also holds today's log for the day's count. */
export const useDraw = (scope: ReviewScope = {}) => useQuery(drawQuery(scope));
/** A round from Today, or cards chosen in a deck, is a fixed list the server orders, walked in order. */
export const useRoundQueue = (
  round: Round | undefined,
  scope: ReviewScope,
  cards?: readonly string[],
) => useQuery({ ...queueQuery(scope, round, cards), enabled: !!round || !!cards });
/** The learner's series, to name a series a review is scoped to. */
export const useSeriesList = (enabled: boolean) => useQuery({ ...seriesQuery, enabled });

const isOnline = () => onlineManager.isOnline();

/**
 * When a screen shows what was kept rather than what Lymi has now: offline, or a refresh that
 * could not land. Undefined while what it shows is current.
 */
export function useKeptSince(query: UseQueryResult): Date | undefined {
  const online = useSyncExternalStore(onlineManager.subscribe, isOnline, isOnline);
  const kept =
    query.data !== undefined && (!online || query.fetchStatus === "paused" || query.isError);
  return kept ? new Date(query.dataUpdatedAt) : undefined;
}

const NO_GRADES: never[] = [];
/** Today's grades from this device, queued or sent, the moment each is made. */
export const useGrades = () =>
  useSyncExternalStore(gradeStore.subscribe, gradeStore.snapshot, () => NO_GRADES);

/** The time, moved on at the end of the learner's day and whenever the app returns to the front. */
export function useNow(dayEnd: Date | undefined) {
  const [now, setNow] = useState(() => new Date());
  const end = dayEnd?.getTime();
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(new Date());
    });
    return () => listener.remove();
  }, []);
  useEffect(() => {
    if (end === undefined) return;
    const timer = setTimeout(
      () => setNow(new Date()),
      Math.min(Math.max(end - Date.now(), 0) + 50, 2_147_483_647),
    );
    return () => clearTimeout(timer);
  }, [end]);
  return [now, setNow] as const;
}

/** The draw's state now, with this device's grades in it; `lookahead` cards after the next are listed too. */
export function useDrawState(
  scope: ReviewScope,
  data: (DrawData & { fetchedAt?: number }) | undefined,
  lookahead = 0,
) {
  const all = useGrades();
  const grades = useMemo(() => withoutDropped(all, data), [all, data]);
  const [now, setNow] = useNow(data ? new Date(data.day.end) : undefined);
  const state: DrawState | undefined = useMemo(
    () => (data ? drawState(data, grades, now, scope.deck, lookahead) : undefined),
    [data, grades, now, scope.deck, lookahead],
  );
  return { state, grades, setNow };
}

const satisfied = (outcome: StreakOut["today"]["outcome"]) =>
  outcome === "goal_met" || outcome === "exhausted";

/** Today against the goal, as the lantern, the flame and the seven lights read it. */
export function useDay() {
  const streak = useStreak().data;
  const draw = useDraw().data;
  const { state } = useDrawState({}, draw);
  const left = useMemo(
    () => (draw && state ? drawableLeft(draw, state, undefined) : undefined),
    [draw, state],
  );
  const data = streak && state ? streakToday(streak, state) : streak;
  const reviewsToday = data?.today.attempts ?? state?.attempts ?? 0;
  const goal = data?.today.goal ?? data?.goal ?? draw?.goal ?? DEFAULT_DAILY_GOAL;
  // Finishing everything due counts the day, even below the goal.
  const dayDone = !!data && satisfied(data.today.outcome);
  const today = state?.day.date ?? data?.today.date;
  const byDate = new Map(data?.days.map((d) => [d.date, d]));
  const rest = new Set(data?.restDays);
  const dates = lastSevenDays(today);
  const week = dates.map((date) => byDate.get(date)?.attempts ?? 0);
  const { out, progress } = lanternFor(data);
  return {
    /** The streak with this device's grades in it; undefined until the first read. */
    summary: data,
    /** The seven lights as the web draws them: each day's own goal, whether it counted, and rest. */
    lights: {
      /** Each glass's review-local date, so its weekday is the account's, not the phone's. */
      dates,
      days: week,
      satisfied: dates.map((date, i) => (i === 6 ? dayDone : !!byDate.get(date)?.satisfied)),
      rest: dates.map((date) => rest.has(date)),
      goals: dates.map((date, i) => (i === 6 ? goal : (byDate.get(date)?.goal ?? null))),
    },
    /** The morning after a rest day, the one time Today mentions it. */
    restedYesterday: !!today && rest.has(addDays(today, -1)),
    streak: data?.current ?? 0,
    reviewsToday,
    goal,
    dayDone,
    week,
    /** Cards the day's draw still holds, counted on the device, so it stays true offline. */
    left,
    /** Moves with every grade as it is made; the lantern breathes and sparks on it. */
    fed: reviewsToday,
    /** The lantern by the web's rule: out with no streak and no review yet, and today's growth. */
    out,
    progress,
    /** The streak flame: out, lit or full exactly when the lantern is. */
    flame: data ? streakFlameFor(data) : ("lit" as const),
  };
}

/**
 * Keeps a grade on the device at once and sends it after any queued before it, ADR 0023; once it
 * is answered, what a grade moves refreshes: due counts and deck cards, the rounds, the streak.
 */
export function useGrade() {
  const qc = useQueryClient();
  return (grade: LocalGrade): Promise<Recorded> =>
    recordGrade({ ...grade, timezone: deviceTimezone() }).then((outcome) => {
      for (const queryKey of [decksQuery.queryKey, roundsQuery.queryKey, streakQuery.queryKey]) {
        void qc.invalidateQueries({ queryKey: [...queryKey] });
      }
      return outcome;
    });
}

/** Takes back a grade through the outbox, then refreshes what it had moved. */
export function useUndoGrade() {
  const qc = useQueryClient();
  return (grade: LocalGrade): Promise<Undone> =>
    undoGrade(grade).then((outcome) => {
      for (const queryKey of [["queue"], ["decks"], ["rounds"], ["streak"]]) {
        void qc.invalidateQueries({ queryKey });
      }
      return outcome;
    });
}

/** Adds through the write outbox, so a card made offline shows at once and lands later. */
export function useAddCard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CardInput) => writes.addCard(input),
    // The outbox already sends and waits; Query must not hold it back while offline.
    networkMode: "always",
    onSuccess: () => void qc.invalidateQueries({ queryKey: [...roundsQuery.queryKey] }),
  });
}

export type Standing = "new" | "learning" | "known";

/** How the learner reads an FSRS state: Review is Known, and Relearning is Learning again. */
export function standing(fsrsState: number | undefined): Standing {
  if (fsrsState === 2) return "known";
  return fsrsState === 1 || fsrsState === 3 ? "learning" : "new";
}
