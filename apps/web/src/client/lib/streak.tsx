import { useLingui } from "@lingui/react/macro";
import { useDailyGoal } from "@lymi/client/daily-goal";
import { type DayPlatform, startDayTurn } from "@lymi/client/sync";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect } from "react";
import {
  StreakButton,
  type StreakButtonProps,
  StreakPlace as StreakPlaceView,
} from "../components/streak";
import { api } from "./api";
import { useScreenName } from "./document-title";
import { decksQuery, drawQuery, streakQuery } from "./queries";

/**
 * Opening Lymi is what settles a day: a visible page reports its zone, then asks the server
 * whether today is nothing-due or exhausted. Background tabs never do either.
 */
export function useSettleToday(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const settle = () => {
      if (document.visibilityState !== "visible") return;
      void api
        .reportTimezone()
        .then(() => api.checkToday())
        .then(() => qc.invalidateQueries({ queryKey: streakQuery.queryKey }))
        .catch(() => {});
    };
    settle();
    document.addEventListener("visibilitychange", settle);
    return () => document.removeEventListener("visibilitychange", settle);
  }, [enabled, qc]);
}

export const WEB_DAY: DayPlatform = {
  onForeground(back) {
    const onVisible = () => {
      if (document.visibilityState === "visible") back();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  },
  inFront: () => document.visibilityState === "visible",
};

/**
 * The learner's midnight, from the review zone, starts a new day on any screen. A kept draw is
 * enough to read: one from an earlier day fetches today's as soon as it is seen.
 */
export function useDayTurn(enabled: boolean) {
  const qc = useQueryClient();
  const { data: end } = useQuery({
    ...drawQuery({}),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
    select: (draw) => draw.day.end,
  });
  // A disabled query still reads the kept draw, and a page that is no visit must not settle a day.
  useEffect(
    () =>
      !enabled || end === undefined
        ? undefined
        : startDayTurn(qc, new Date(end).getTime(), WEB_DAY),
    [enabled, end, qc],
  );
}

/**
 * The streak's open state, in the URL. Opening pushes one entry so Back closes it; closing replaces
 * that entry, so Back after a close does not open it again. The open card works the same way.
 */
export function useStreakOpen() {
  const { streak } = useSearch({ from: "__root__" });
  const navigate = useNavigate();
  const setOpen = (open: boolean) => {
    if (open === (streak === true)) return;
    void navigate({
      to: ".",
      search: (prev) => ({ ...prev, streak: open ? true : undefined }),
      replace: !open,
      // Only the overlay changes, so the page under it keeps its scroll position.
      resetScroll: false,
    });
  };
  return [streak === true, setOpen] as const;
}

/** Cards due across every deck, the number Today shows. */
function useDueToday() {
  const decks = useQuery(decksQuery);
  return decks.data?.reduce((n, d) => n + d.due, 0) ?? 0;
}

/** The streak pill with its data. The views take it as a slot so the design page can pass a static one. */
export function Streak({ variant, className }: Pick<StreakButtonProps, "variant" | "className">) {
  const streak = useQuery(streakQuery);
  const due = useDueToday();
  const [, setOpen] = useStreakOpen();
  // A skeleton that never resolves is worse than no pill, e.g. offline with nothing cached.
  if (streak.isError && !streak.data) return null;
  return (
    <StreakButton
      variant={variant}
      className={className}
      summary={streak.data}
      due={due}
      onOpen={() => setOpen(true)}
    />
  );
}

/** The one streak place in the app, however many pills and cards open it. */
export function StreakPlace() {
  const streak = useQuery(streakQuery);
  const due = useDueToday();
  const goal = useDailyGoal();
  const [open, setOpen] = useStreakOpen();
  const { t } = useLingui();
  // Back names the screen under the streak, whichever screen opened it; until that screen has a name it says Back.
  const under = useScreenName();
  if (!streak.data) return null;
  return (
    <StreakPlaceView
      open={open}
      returnsTo={under ?? t`Back`}
      onOpenChange={setOpen}
      summary={streak.data}
      due={due}
      onGoalChange={goal.change}
      goalStatus={goal.status}
    />
  );
}
