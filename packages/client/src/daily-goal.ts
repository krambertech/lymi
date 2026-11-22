import { daySatisfied, type StreakOut } from "@lymi/core";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { api, type Settings } from "./api";
import { settingsQuery, streakQuery } from "./queries";

export type GoalStatus = "saving" | "saved" | "error";

export function useDailyGoal() {
  const qc = useQueryClient();
  const [status, setStatus] = useState<GoalStatus | undefined>();
  const latest = useRef(0);
  const before = useRef<{
    streak: StreakOut | undefined;
    settings: Settings | undefined;
  } | null>(null);

  const setGoal = (dailyGoal: number) => {
    qc.setQueryData<StreakOut>(
      streakQuery.queryKey,
      (s) =>
        s && {
          ...s,
          goal: dailyGoal,
          today: daySatisfied(s.today.outcome) ? s.today : { ...s.today, goal: dailyGoal },
        },
    );
    qc.setQueryData<Settings>(settingsQuery.queryKey, (s) => s && { ...s, dailyGoal });
  };

  const mutation = useMutation({
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
