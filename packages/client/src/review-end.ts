import { type Drawn, daySatisfied, roundOrder, type StreakOut } from "@lymi/core";
import { emberCount } from "@lymi/design";
import { streakWith } from "./review-day";
import { type DrawData, type DrawState, drawCards } from "./review-draw";

export { type DayOutcome, dayOutcome, drawableLeft, streakWith } from "./review-day";

export function streakAsOf(
  summary: StreakOut,
  attempts: number,
  satisfiedThen: boolean,
): StreakOut {
  const now = streakWith(summary, attempts, false);
  if (satisfiedThen || !daySatisfied(summary.today.outcome)) return now;
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

export function forgottenRound(data: DrawData, state: DrawState, deckId?: string): Drawn[] {
  return roundOrder(drawCards(data), state.log, state.day, { deckId, round: "forgotten" });
}

export type Stretch = "day" | "scope" | "list";

export type Ending = "goal" | "empty" | "left";

export interface EndInput {
  stretch: Stretch;
  ending: Ending;
  goal: number;
  from: number;
  attempts: number;
  satisfiedBefore: boolean;
  left: number;
  confirmed: boolean;
  elsewhere: number | null;
  forgotten: number;
}

export type ContinueNote =
  | { kind: "goal"; count: number }
  | { kind: "cards"; count: number }
  | { kind: "decks" };

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
  satisfied: boolean;
  streak: boolean;
  embers: number;
  offers: Offer[];
}

export function reviewEnd(input: EndInput): EndScreen | "unchecked" {
  const { stretch, ending, goal, from, attempts, left, confirmed, elsewhere } = input;
  const met = attempts >= goal;
  if (ending === "empty" && stretch !== "list" && !confirmed && !met) return "unchecked";

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

export type LegProof =
  | { stretch: "list"; walked: boolean }
  | { stretch: "day" | "scope"; confirmed: boolean };

export function legFinish(
  end: EndScreen | "unchecked" | null,
  ending: Ending,
  proof: LegProof,
): "goal" | "empty" | null {
  if (!end || end === "unchecked" || ending === "left") return null;
  if (ending === "goal") return "goal";
  return (proof.stretch === "list" ? proof.walked : proof.confirmed) ? "empty" : null;
}

export interface RoundFetch {
  updatedAt: number;
  idle: boolean;
  failed: boolean;
}

export interface RoundAsk {
  at: number;
  done: number;
}

export function roundWalk(input: {
  size: number;
  done: number;
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
