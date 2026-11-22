import type { QueryClient } from "@tanstack/react-query";
import { api } from "./api";
import type { Flushed } from "./writes";

const DAY_KEYS = [["decks"], ["rounds"], ["streak"], ["queue"], ["insights"]];

const AFTER_DAY_END_MS = 50;
const LONGEST_TIMER_MS = 2_147_483_647;

function refreshDay(qc: QueryClient) {
  for (const queryKey of DAY_KEYS) void qc.invalidateQueries({ queryKey });
}

export function afterFlush(qc: QueryClient, { sent, waited, graded }: Flushed) {
  if (sent - waited + graded > 0) refreshDay(qc);
}

export interface DayPlatform {
  onForeground: (back: () => void) => () => void;
  inFront: () => boolean;
}

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
  const timer =
    left > 0 ? setTimeout(turn, Math.min(left + AFTER_DAY_END_MS, LONGEST_TIMER_MS)) : undefined;
  const stopWatching = platform.onForeground(() => {
    if (Date.now() >= dayEnd) turn();
  });
  return () => {
    clearTimeout(timer);
    stopWatching();
  };
}
