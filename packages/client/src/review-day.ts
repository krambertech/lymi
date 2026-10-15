import { drawableCount, type StreakOut } from "@lymi/core";
import { type DrawData, type DrawState, drawCards, drawLog } from "./review-draw";

export type DayOutcome = "goal_met" | "exhausted" | "nothing_due";

/** How a review that stopped leaves the day, by the server's rules in `settleDay`. */
export function dayOutcome(attempts: number, goal: number): DayOutcome {
  if (attempts >= goal) return "goal_met";
  return attempts > 0 ? "exhausted" : "nothing_due";
}

/**
 * Today's outcome as a status line reads it. A day confirmed as nothing due keeps protecting the
 * streak, but once cards are due, such as a deck added after the first visit, it reads as open.
 */
export function shownOutcome(
  outcome: StreakOut["today"]["outcome"],
  due: number,
): StreakOut["today"]["outcome"] {
  return outcome === "nothing_due" && due > 0 ? "open" : outcome;
}

const satisfied = (outcome: StreakOut["today"]["outcome"]) =>
  outcome === "goal_met" || outcome === "exhausted";

/**
 * The streak once today's attempts are in, before the refetch that confirms them lands. The run
 * grows by one only when today turns satisfied, so a summary that already counts today is kept.
 */
export function streakWith(summary: StreakOut, attempts: number, counts: boolean): StreakOut {
  const { today } = summary;
  const already = satisfied(today.outcome);
  const now = already || counts;
  const outcome = already
    ? today.outcome
    : counts
      ? dayOutcome(attempts, today.goal) === "goal_met"
        ? "goal_met"
        : "exhausted"
      : today.outcome;
  const current = now && !already ? summary.current + 1 : summary.current;
  const day = {
    date: today.date,
    attempts,
    goal: today.goal,
    satisfied: now,
    outcome,
  };
  const listed = summary.days.some((d) => d.date === today.date);
  return {
    ...summary,
    current,
    longest: Math.max(summary.longest, current),
    today: { ...today, attempts, outcome },
    days: listed
      ? summary.days.map((d) =>
          d.date === today.date ? { ...d, attempts, satisfied: d.satisfied || now, outcome } : d,
        )
      : [...summary.days, day],
  };
}

/** Cards the draw still holds in scope, the number Today shows beside it. */
export function drawableLeft(data: DrawData, state: DrawState, deckId: string | undefined): number {
  const cards = drawCards(data);
  const scope = { deckId };
  if (data.day.date !== state.day.date) return drawableCount(cards, state.log, state.day, scope);
  // The fetch holds only the front of the order; the server's total counts the cards behind it
  // too, and they bring a waiting return in reach, so the count behind is settled with them.
  const log = drawLog(data, [], state.day);
  let behind = Math.max(0, data.total - drawableCount(cards, log, state.day, scope));
  behind = Math.max(0, data.total - drawableCount(cards, log, state.day, scope, behind));
  return drawableCount(cards, state.log, state.day, scope, behind) + behind;
}
