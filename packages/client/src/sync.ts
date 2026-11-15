import type { QueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Flushed } from "./writes";

/** What a new day or a replayed grade moves, refetched together. */
const DAY_KEYS = [["decks"], ["rounds"], ["streak"], ["queue"], ["insights"]];

function refreshDay(qc: QueryClient) {
  for (const queryKey of DAY_KEYS) void qc.invalidateQueries({ queryKey });
}

/** Refetches what a replay moved. A write its caller waited on is that caller's to refresh. */
export function afterFlush(qc: QueryClient, { sent, waited, graded }: Flushed) {
  if (sent - waited + graded > 0) refreshDay(qc);
}

/** What the turn of the day needs from the platform it runs on. */
export interface DayPlatform {
  /** Calls back when the app returns to the front, and returns how to stop. */
  onForeground: (back: () => void) => () => void;
  /** A learner who has not opened Lymi has not settled the day, so only the front asks the server to. */
  inFront: () => boolean;
}

/**
 * Turns the day at `dayEnd`, and returns how to stop. A timer does not run while the device sleeps,
 * so coming back after it turns the day too. An end already past is a draw kept from an earlier
 * day: opening refreshes and settles by itself, so only the draw needs fetching.
 */
export function startDayTurn(qc: QueryClient, dayEnd: number, platform: DayPlatform) {
  const turn = () => {
    refreshDay(qc);
    if (!platform.inFront()) return;
    void api
      .checkToday()
      .then(() => qc.invalidateQueries({ queryKey: ["streak"] }))
      .catch(() => {});
  };
  const left = dayEnd - Date.now();
  if (left <= 0) void qc.invalidateQueries({ queryKey: ["queue"] });
  const timer = left > 0 ? setTimeout(turn, Math.min(left + 50, 2_147_483_647)) : undefined;
  const stopWatching = platform.onForeground(() => {
    if (Date.now() >= dayEnd) turn();
  });
  return () => {
    clearTimeout(timer);
    stopWatching();
  };
}
