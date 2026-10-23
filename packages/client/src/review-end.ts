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

/**
 * What Continue holds, said beside it: the reviews to the goal where it stops there, the cards it
 * runs through otherwise (cards, since a forgotten card's return adds a review but not a card), or
 * that it moves on to other decks. Null when the other decks are not known yet.
 */
export type ContinueNote =
  | { kind: "goal"; count: number }
  | { kind: "cards"; count: number }
  | { kind: "decks" };

/** Continue picks up the stretch the learner left, or starts the day's draw. */
export type Offer =
  | { kind: "continue"; to: "resume" | "day"; note: ContinueNote | null }
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

  const cards = (count: number): ContinueNote | null =>
    count > 0 ? { kind: "cards", count } : null;
  // The day's draw stops at the goal while it is open, unless the day runs out first.
  const dayNote = (): ContinueNote | null =>
    !satisfied && !(elsewhere !== null && dayLeft < goal - attempts)
      ? { kind: "goal", count: goal - attempts }
      : elsewhere !== null
        ? cards(dayLeft)
        : null;
  const offers: Offer[] = [];
  if (ending === "left")
    offers.push({
      kind: "continue",
      to: "resume",
      // A deck or series runs to its own end, past the goal; `left` is not a round's own count.
      note: stretch === "day" ? dayNote() : stretch === "scope" ? cards(left) : null,
    });
  else if (dayLeft > 0)
    offers.push({
      kind: "continue",
      to: "day",
      note: stretch === "scope" ? { kind: "decks" } : dayNote(),
    });
  if (input.forgotten > 0) offers.push({ kind: "forgotten", count: input.forgotten });

  return {
    heading,
    satisfied,
    streak: satisfied && !input.satisfiedBefore && attempts > from,
    embers: emberCount(attempts - from, goal),
    offers,
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

/** The round's own fetch as a list leg sees it. */
export interface RoundFetch {
  /** When its data last landed. */
  updatedAt: number;
  /** No fetch running or waiting. */
  idle: boolean;
  /** The last fetch failed, or the device is offline. */
  failed: boolean;
}

/** A refetch asked for once the page in hand ran out: when the data had last landed, and the cards done then. */
export interface RoundAsk {
  at: number;
  done: number;
}

/**
 * Where a list leg stands once the cards in hand are used up. The server sends a round a page at a
 * time, so an emptied page owes one refetch of the round. The round is walked when its graded and
 * dropped cards cover its size, or when that refetch lands with nothing left: a card can leave the
 * round meanwhile (archived, deleted or graded on another device), and no page brings it back. A
 * failed or offline fetch proves neither, so the end shows without the round being walked.
 */
export function roundWalk(input: {
  size: number;
  /** Cards graded or dropped in this leg. */
  done: number;
  /** Cards still in hand to review. */
  left: number;
  ask: RoundAsk | null;
  fetch: RoundFetch;
}): { walked: boolean; owed: boolean; refetch: boolean } {
  const { size, done, left, ask, fetch } = input;
  const asked = ask !== null && ask.done === done;
  const dry =
    left === 0 && asked && fetch.idle && !fetch.failed && fetch.updatedAt > (ask?.at ?? Infinity);
  const walked = done >= size || dry;
  const owed = left === 0 && !walked && !fetch.failed;
  return { walked, owed, refetch: owed && fetch.idle && !asked };
}
