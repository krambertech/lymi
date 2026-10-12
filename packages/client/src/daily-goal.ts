import type { StreakOut } from "@lymi/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api, type Settings } from "./api";
import { settingsQuery, streakQuery } from "./queries";

/** "Saved" after a goal change lands, or the error that stopped it. */
export type GoalStatus = "saving" | "saved" | "error";

/**
 * Changes the daily goal on the tap, in the streak and in settings. Writes run one after another,
 * and only the latest choice's response updates the caches; if it fails, both go back to where
 * the first one began.
 */
export function useDailyGoal() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<GoalStatus | undefined>();
  const latest = useRef(0);
  const before = useRef<{
    streak: StreakOut | undefined;
    settings: Settings | undefined;
  } | null>(null);

  // A finished day keeps the goal it was finished against; an open one takes the new goal.
  const setGoal = (dailyGoal: number) => {
    qc.setQueryData<StreakOut>(
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
        streak: qc.getQueryData<StreakOut>(streakQuery.queryKey),
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
