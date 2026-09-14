import { type Drawn, drawOrder, roundOrder, type StreakOut } from "@lymi/core";
import { type DrawData, type DrawState, drawCards } from "./review-draw";

/** Attempts in one more round once a review has stopped. PRODUCT.md, "Daily Review Goal". */
export const EXTRA_ROUND = 10;

export type DayOutcome = "goal_met" | "exhausted" | "nothing_due";

/** How a review that stopped leaves the day, by the server's rules in `settleDay`. */
export function dayOutcome(attempts: number, goal: number): DayOutcome {
  if (attempts >= goal) return "goal_met";
  return attempts > 0 ? "exhausted" : "nothing_due";
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
    nothingDue: false,
  };
  const listed = summary.days.some((d) => d.date === today.date);
  return {
    ...summary,
    current,
    longest: Math.max(summary.longest, current),
    today: { ...today, attempts, outcome },
    days: listed
      ? summary.days.map((d) =>
          d.date === today.date ? { ...d, attempts, satisfied: d.satisfied || now } : d,
        )
      : [...summary.days, day],
  };
}

/** The cards Review forgotten walks: each mode whose latest grade today is Forgot, once. */
export function forgottenRound(data: DrawData, state: DrawState, deckId?: string): Drawn[] {
  return roundOrder(drawCards(data), state.log, state.day, { deckId, round: "forgotten" });
}

/** How many attempts another round would hold if every grade went well. */
export function nextRoundSize(data: DrawData, state: DrawState, deckId?: string): number {
  return drawOrder(drawCards(data), state.log, state.day, { deckId }, EXTRA_ROUND).length;
}
