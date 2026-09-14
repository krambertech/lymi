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

/** How many attempts the draw still holds in scope, counted up to `limit`, if every grade went well. */
export function drawableUpTo(
  data: DrawData,
  state: DrawState,
  deckId: string | undefined,
  limit: number,
): number {
  return drawOrder(drawCards(data), state.log, state.day, { deckId }, limit).length;
}

/**
 * What a stretch of the review counts against: `goal` is the draw up to the daily goal, `more` is
 * the draw for another round after it, and `list` is a fixed set such as forgotten cards.
 */
export type Stretch = "goal" | "more" | "list";

export interface EndInput {
  stretch: Stretch;
  goal: number;
  /** Today's attempts when the stretch began. */
  from: number;
  /** Today's attempts now, in every scope. */
  attempts: number;
  /** Today already counted for the streak before the stretch began. */
  satisfiedBefore: boolean;
  /** Attempts still drawable in the review's scope, counted up to at least the goal's remainder and a round. */
  left: number;
  /** A fetch begun after the last grade agrees with `left`. */
  confirmed: boolean;
  /** The review is of one deck. */
  scoped: boolean;
  /** Cards in scope whose latest grade today is Forgot. */
  forgotten: number;
  /** The learner's other decks with how many cards each has to review, or null while unknown. */
  otherDecks: readonly { id: string; name: string; due: number }[] | null;
}

export type Offer =
  | { kind: "goal"; count: number }
  | { kind: "forgotten"; count: number }
  | { kind: "more"; count: number }
  | { kind: "deck"; id: string; name: string; count: number };

export type Celebration = "full" | "light" | "none";

export interface EndScreen {
  heading: "goal_reached" | "nothing_left" | "nothing_due" | "round_done";
  /** `full` when the goal's own stretch finished the day, `light` when another stretch did. */
  celebration: Celebration;
  /** Today counts for the streak once this stretch is in. */
  satisfied: boolean;
  /** Nothing left is about the review's deck alone, since other decks still have cards. */
  namesDeck: boolean;
  /** The large number: today's attempts, or this stretch's. */
  count: "day" | "round";
  /** The ways on, in order. Done is always offered beside them. */
  offers: Offer[];
}

/** Other decks the end of a deck review lists at most. */
export const OTHER_DECKS = 3;

/**
 * The end of a stretch, by where the day stands; PRODUCT.md, "Daily Review Goal". `unchecked` is a
 * draw that ran dry below the goal without a fetch to confirm it, which proves nothing about the day.
 */
export function reviewEnd(input: EndInput): EndScreen | "unchecked" {
  const { stretch, goal, from, attempts, left, scoped } = input;
  const met = attempts >= goal;
  const empty = left === 0;
  if (empty && !input.confirmed && !met && stretch !== "list") return "unchecked";

  const ranOut = empty && input.confirmed;
  // A deck running out is the whole day only once the other decks are known to be empty too.
  const elsewhere = scoped && (input.otherDecks?.some((d) => d.due > 0) ?? true);
  const satisfied = met || (ranOut && !elsewhere && attempts > 0);
  const turned = satisfied && !input.satisfiedBefore && attempts > from;
  const heading: EndScreen["heading"] =
    ranOut && attempts === 0
      ? "nothing_due"
      : met && from < goal
        ? "goal_reached"
        : ranOut
          ? "nothing_left"
          : "round_done";

  const offers: Offer[] = [];
  if (!met && left > 0) offers.push({ kind: "goal", count: Math.min(left, goal - attempts) });
  if (input.forgotten > 0) offers.push({ kind: "forgotten", count: input.forgotten });
  if (met && left > 0) offers.push({ kind: "more", count: Math.min(left, EXTRA_ROUND) });
  if (scoped && ranOut && !met) {
    const decks = (input.otherDecks ?? [])
      .filter((d) => d.due > 0)
      .sort((a, b) => b.due - a.due)
      .slice(0, OTHER_DECKS);
    for (const d of decks) offers.push({ kind: "deck", id: d.id, name: d.name, count: d.due });
  }

  return {
    heading,
    celebration: turned ? (stretch === "goal" ? "full" : "light") : "none",
    satisfied,
    namesDeck: heading === "nothing_left" && elsewhere,
    count: stretch === "goal" ? "day" : "round",
    offers,
  };
}
