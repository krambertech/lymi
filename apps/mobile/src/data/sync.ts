import { useLingui } from "@lingui/react/macro";
import { api } from "@lymi/client/api";
import { retireGrades } from "@lymi/client/grades";
import { claimWrites, flushWrites, onNotice } from "@lymi/client/writes";
import { useQueryClient } from "@tanstack/react-query";
import { addNetworkStateListener } from "expo-network";
import { useEffect } from "react";
import { Alert, AppState } from "react-native";
import { useDraw } from "./queries";

/** What a new day or a replayed grade moves, refetched together. */
const DAY_KEYS = [["decks"], ["rounds"], ["streak"], ["queue"]];

/**
 * Keeps the signed-in learner's device in step with the server, as the web's root does: queued
 * grades and writes replay at sign-in, on reconnect and on return to the front; opening the app
 * settles today; and the learner's midnight starts a new day's counts.
 */
export function Sync({ learnerId }: { learnerId: string }) {
  const { t } = useLingui();
  const qc = useQueryClient();

  useEffect(() => {
    claimWrites(learnerId);
    const flush = () => {
      void flushWrites().then((flushed) => {
        if (flushed.sent > 0) void qc.invalidateQueries({ queryKey: ["decks"] });
        if (flushed.sent + flushed.graded > 0) {
          for (const queryKey of DAY_KEYS) void qc.invalidateQueries({ queryKey });
        }
      });
    };
    // Opening Lymi is what settles a day: the zone first, then whether today is nothing-due or exhausted.
    const settle = () =>
      void api
        .reportTimezone()
        .then(() => api.checkToday())
        .then(() => qc.invalidateQueries({ queryKey: ["streak"] }))
        .catch(() => {});
    flush();
    settle();
    const front = AppState.addEventListener("change", (state) => {
      if (state !== "active") return;
      flush();
      settle();
    });
    const network = addNetworkStateListener((state) => {
      if (state.isConnected) flush();
    });
    return () => {
      front.remove();
      network.remove();
    };
  }, [learnerId, qc]);

  // A write made offline that the server would not take is said once, naming what it was.
  useEffect(
    () =>
      onNotice((notice) => {
        const label = notice.label;
        if (notice.reason === "skipped") {
          const deckName = notice.deckName;
          Alert.alert(
            t`“${label}” was already in ${deckName}, so the copy added offline was left out.`,
          );
        } else {
          const reason = notice.message;
          Alert.alert(
            label
              ? t`A change to “${label}” made offline couldn’t be saved. ${reason}`
              : t`A change made offline couldn’t be saved. ${reason}`,
          );
        }
        void qc.invalidateQueries({ queryKey: ["decks"] });
        void qc.invalidateQueries({ queryKey: ["cards"] });
      }),
    [qc, t],
  );

  const day = useDraw().data?.day;
  // Sent grades from an earlier day are no longer in any draw.
  useEffect(() => {
    if (day) retireGrades(day.start);
  }, [day]);

  // The learner's midnight, from the review zone, starts a new day: due counts, rounds and the streak move on.
  const end = day ? new Date(day.end).getTime() : undefined;
  useEffect(() => {
    if (end === undefined) return;
    const turn = () => {
      for (const queryKey of DAY_KEYS) void qc.invalidateQueries({ queryKey });
      void api
        .checkToday()
        .then(() => qc.invalidateQueries({ queryKey: ["streak"] }))
        .catch(() => {});
    };
    const timer = setTimeout(turn, Math.min(Math.max(end - Date.now(), 0) + 50, 2_147_483_647));
    // A timer does not run while the phone sleeps, so coming back after midnight turns the day too.
    const front = AppState.addEventListener("change", (state) => {
      if (state === "active" && Date.now() >= end) turn();
    });
    return () => {
      clearTimeout(timer);
      front.remove();
    };
  }, [end, qc]);

  return null;
}
