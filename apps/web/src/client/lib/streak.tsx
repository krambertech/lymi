import { useLingui } from "@lingui/react/macro";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  StreakButton,
  type StreakButtonProps,
  type StreakPanelProps,
  StreakPlace as StreakPlaceView,
  type StreakSummary,
} from "../components/streak";
import { NAV } from "../views/shell";
import { api, type Settings } from "./api";
import { settingsQuery, streakQuery } from "./queries";

type GoalStatus = StreakPanelProps["goalStatus"];

/**
 * Changes the daily goal on the tap, in the streak and in settings. Writes run one after another,
 * and only the latest choice's response updates the caches; if it fails, both go back to where
 * the first one began.
 */
export function useDailyGoal() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<GoalStatus>();
  const latest = useRef(0);
  const before = useRef<{
    streak: StreakSummary | undefined;
    settings: Settings | undefined;
  } | null>(null);

  // A finished day keeps the goal it was finished against; an open one takes the new goal.
  const setGoal = (dailyGoal: number) => {
    qc.setQueryData<StreakSummary>(
      streakQuery.queryKey,
      (s) =>
        s && {
          ...s,
          goal: dailyGoal,
          today:
            s.today.outcome === "goal_met" || s.today.outcome === "exhausted"
              ? s.today
              : { ...s.today, goal: dailyGoal },
        },
    );
    qc.setQueryData<Settings>(settingsQuery.queryKey, (s) => s && { ...s, dailyGoal });
  };

  const mutation = useMutation({
    // One queue for every goal control, so requests reach the server in the order they were
    // chosen and the last choice is also the last write. Optimistic updates still run at once.
    scope: { id: "daily-goal" },
    mutationFn: ({ dailyGoal }: { dailyGoal: number; id: number }) =>
      api.updateSettings({ dailyGoal }),
    onMutate: async ({ dailyGoal }) => {
      setStatus("saving");
      before.current ??= {
        streak: qc.getQueryData<StreakSummary>(streakQuery.queryKey),
        settings: qc.getQueryData<Settings>(settingsQuery.queryKey),
      };
      await Promise.all([
        qc.cancelQueries({ queryKey: streakQuery.queryKey }),
        qc.cancelQueries({ queryKey: settingsQuery.queryKey }),
      ]);
      setGoal(dailyGoal);
    },
    onSuccess: (settings, { id }) => {
      if (id !== latest.current) return;
      before.current = null;
      qc.setQueryData(settingsQuery.queryKey, settings);
      setGoal(settings.dailyGoal);
      setStatus("saved");
    },
    onError: (_error, { id }) => {
      if (id !== latest.current) return;
      if (before.current?.streak) qc.setQueryData(streakQuery.queryKey, before.current.streak);
      if (before.current?.settings)
        qc.setQueryData(settingsQuery.queryKey, before.current.settings);
      before.current = null;
      // An earlier choice may have landed on the server, so ask it rather than trust the rollback.
      void qc.invalidateQueries({ queryKey: settingsQuery.queryKey });
      void qc.invalidateQueries({ queryKey: streakQuery.queryKey });
      setStatus("error");
    },
  });

  const change = (dailyGoal: number) => {
    latest.current += 1;
    mutation.mutate({ dailyGoal, id: latest.current });
  };
  return { change, status };
}

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

/** The streak pill with its data. The views take it as a slot so the design page can pass a static one. */
export function Streak({ variant, className }: Pick<StreakButtonProps, "variant" | "className">) {
  const streak = useQuery(streakQuery);
  const [, setOpen] = useStreakOpen();
  // A skeleton that never resolves is worse than no pill, e.g. offline with nothing cached.
  if (streak.isError && !streak.data) return null;
  return (
    <StreakButton
      variant={variant}
      className={className}
      summary={streak.data}
      onOpen={() => setOpen(true)}
    />
  );
}

/** The one streak place in the app, however many pills and cards open it. */
export function StreakPlace() {
  const streak = useQuery(streakQuery);
  const goal = useDailyGoal();
  const [open, setOpen] = useStreakOpen();
  const { t, i18n } = useLingui();
  const { pathname } = useLocation();
  // The streak opens from a tab's bar, so back names that tab; from a link onto any other screen it says Back.
  const tab = NAV.find((n) => pathname === n.to);
  if (!streak.data) return null;
  return (
    <StreakPlaceView
      open={open}
      returnsTo={tab ? i18n._(tab.label) : t`Back`}
      onOpenChange={setOpen}
      summary={streak.data}
      onGoalChange={goal.change}
      goalStatus={goal.status}
    />
  );
}
