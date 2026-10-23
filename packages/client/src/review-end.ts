import { type Drawn, roundOrder, type StreakOut } from "@lymi/core";
import { emberCount } from "@lymi/design";
import { streakWith } from "./review-day";
import { type DrawData, type DrawState, drawCards } from "./review-draw";

export { type DayOutcome, dayOutcome, drawableLeft, streakWith } from "./review-day";

const satisfied = (outcome: StreakOut["today"]["outcome"]) =>
  outcome === "goal_met" || outcome === "exhausted";

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

/** What proves a leg ran out: a list every card of which is graded or dropped, or a confirmed draw. */
export type LegProof =
  | { stretch: "list"; walked: boolean }
  | { stretch: "day" | "scope"; confirmed: boolean };

/**
 * How an end shown on screen finishes its leg for analytics, or null while it does not. A round or
 * chosen list is done only once every card in it is graded or dropped, whatever the draw still
 * holds: a page of a longer round running out while the next loads, or after it failed, is not
 * the round's end. An empty draw or scope needs a confirmed draw. docs/analytics.md.
 */
export function legFinish(
  end: EndScreen | "unchecked" | null,
  ending: Ending,
  proof: LegProof,
): "goal" | "empty" | null {
  if (!end || end === "unchecked" || ending === "left") return null;
  if (ending === "goal") return "goal";
  return (proof.stretch === "list" ? proof.walked : proof.confirmed) ? "empty" : null;
}
