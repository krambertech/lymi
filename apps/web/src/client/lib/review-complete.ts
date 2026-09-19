import { type Drawn, drawableCount, roundOrder, type StreakOut } from "@lymi/core";
import { type DrawData, type DrawState, drawCards } from "./review-draw";

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

/**
 * The streak as it stood earlier today, from a summary that may count today already: the run and
 * today's light are taken back when today was not satisfied then, so the end can show them turn.
 */
export function streakAsOf(
  summary: StreakOut,
  attempts: number,
  satisfiedThen: boolean,
): StreakOut {
  const now = streakWith(summary, attempts, false);
  if (satisfiedThen || !satisfied(summary.today.outcome)) return now;
  const outcome = "open";
  return {
    ...now,
    current: Math.max(0, now.current - 1),
    today: { ...now.today, outcome },
    days: now.days.map((d) =>
      d.date === now.today.date ? { ...d, satisfied: false, outcome } : d,
    ),
  };
}

/** The cards Review forgotten walks: each mode whose latest grade today is Forgot, once. */
export function forgottenRound(data: DrawData, state: DrawState, deckId?: string): Drawn[] {
  return roundOrder(drawCards(data), state.log, state.day, { deckId, round: "forgotten" });
}

/** Cards the draw still holds in scope, the number Today shows beside it. */
export function drawableLeft(data: DrawData, state: DrawState, deckId: string | undefined): number {
  return drawableCount(drawCards(data), state.log, state.day, { deckId });
}

/**
 * What a stretch of the review draws from: the whole day, one deck or series, or a fixed list
 * such as a round from Today or the forgotten cards. ADR 0021.
 */
export type Stretch = "day" | "scope" | "list";

/** How a stretch ended: at the goal, by running out, or by the learner leaving. */
export type Ending = "goal" | "empty" | "left";

export interface EndInput {
  stretch: Stretch;
  ending: Ending;
  goal: number;
  /** Today's attempts at the last end screen, or when the page opened. */
  from: number;
  /** Today's attempts now, in every scope. */
  attempts: number;
  /** Today already counted for the streak at the last end screen, or when the page opened. */
  satisfiedBefore: boolean;
  /** Cards still drawable in the review's own scope, which is the whole day when it has none. */
  left: number;
  /** A fetch begun after the last grade agrees with `left`. */
  confirmed: boolean;
  /** Cards due in decks outside the review's scope, or null while unknown. */
  elsewhere: number | null;
  /** Cards in scope whose latest grade today is Forgot. */
  forgotten: number;
}

/** Continue picks up the stretch the learner left, or starts the day's draw. */
export type Offer =
  | { kind: "continue"; to: "resume" | "day" }
  | { kind: "forgotten"; count: number };

export interface EndScreen {
  heading:
    | "nothing_due"
    | "goal_reached"
    | "day_done"
    | "scope_done"
    | "round_done"
    | "review_done";
  /** Today counts for the streak once this stretch is in. */
  satisfied: boolean;
  /** Today turned satisfied since the last screen, so its light flares and the run ticks. */
  streak: boolean;
  /** Embers off the flame for the reviews added since the last screen. */
  embers: number;
  /** The ways on besides Done, in order. */
  offers: Offer[];
  /** Continue is the primary button, since the day is open and it has somewhere to go. */
  continueLeads: boolean;
  /** The line under the number while Continue leads: how many more to the goal, or to the end of the day. */
  nudge: { kind: "goal" | "day"; count: number } | null;
}

/** Embers at a share of the goal added; between the points the count follows a line. */
const EMBERS: readonly (readonly [number, number])[] = [
  [0, 3],
  [0.25, 6],
  [0.5, 9],
  [1, 14],
  [2, 20],
];

export function emberCount(added: number, goal: number): number {
  if (added <= 0) return 0;
  const share = added / Math.max(goal, 1);
  const upper = EMBERS.findIndex(([at]) => at >= share);
  if (upper === -1) return EMBERS[EMBERS.length - 1]?.[1] ?? 0;
  const [x1, y1] = EMBERS[upper] ?? [0, 0];
  const [x0, y0] = EMBERS[upper - 1] ?? [x1, y1];
  return Math.round(x1 === x0 ? y1 : y0 + ((y1 - y0) * (share - x0)) / (x1 - x0));
}

/** The end of a stretch by where the day stands, or `unchecked`; ADR 0021. */
export function reviewEnd(input: EndInput): EndScreen | "unchecked" {
  const { stretch, ending, goal, from, attempts, left, confirmed, elsewhere } = input;
  const met = attempts >= goal;
  // Running out offline, or after a failed refresh, proves nothing about the day unless the goal is met.
  if (ending === "empty" && stretch !== "list" && !confirmed && !met) return "unchecked";

  // Unknown other decks count as holding cards, so the day is never claimed early.
  const dayLeft = left + (elsewhere ?? 1);
  const dayEmpty = left === 0 && confirmed && elsewhere === 0;
  const satisfied = met || (dayEmpty && attempts > 0);
  const heading: EndScreen["heading"] =
    dayEmpty && attempts === 0
      ? "nothing_due"
      : met && (from < goal || ending === "goal")
        ? "goal_reached"
        : dayEmpty
          ? "day_done"
          : ending === "empty" && stretch === "scope" && confirmed
            ? "scope_done"
            : ending === "empty" && stretch === "list"
              ? "round_done"
              : "review_done";

  const offers: Offer[] = [];
  if (ending === "left") offers.push({ kind: "continue", to: "resume" });
  else if (dayLeft > 0) offers.push({ kind: "continue", to: "day" });
  if (input.forgotten > 0) offers.push({ kind: "forgotten", count: input.forgotten });

  const continueLeads = !satisfied && offers.some((o) => o.kind === "continue");
  const toGoal = goal - attempts;
  return {
    heading,
    satisfied,
    streak: satisfied && !input.satisfiedBefore && attempts > from,
    embers: emberCount(attempts - from, goal),
    offers,
    continueLeads,
    nudge: !continueLeads
      ? null
      : elsewhere !== null && dayLeft > 0 && dayLeft < toGoal
        ? { kind: "day", count: dayLeft }
        : { kind: "goal", count: toGoal },
  };
}
