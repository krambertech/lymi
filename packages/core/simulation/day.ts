import { type DayWindow, type DrawKind, draw, drawKey } from "../src/draw";
import { emptyState } from "../src/fsrs";
import { type Attempt, DAY_MS, playDay, rng, type SimMode, toDrawCards, utcDay } from "./learner";

/** One attempt as the docs page draws it: which card, what kind of draw, and whether it missed. */
export interface DayTile {
  /** The card's number in the order the day first showed it, so a return reads as the same card. */
  card: number;
  kind: DrawKind;
  missed: boolean;
}

function tiles(attempts: readonly Attempt[], numbers = new Map<string, number>()): DayTile[] {
  return attempts.map((a) => {
    const key = drawKey(a.cardId, a.mode);
    if (!numbers.has(key)) numbers.set(key, numbers.size + 1);
    return { card: numbers.get(key) as number, kind: a.kind, missed: a.missed };
  });
}

function numbered(attempts: readonly Attempt[]): Map<string, number> {
  const numbers = new Map<string, number>();
  tiles(attempts, numbers);
  return numbers;
}

/** A learner who added a lesson a week and reviewed to the goal every day before `day`. */
function learnerBefore(
  day: DayWindow,
  seed: number,
  days: number,
  lesson: number,
  every: number,
  goal: number,
): SimMode[] {
  const random = rng(seed * 31);
  const modes: SimMode[] = [];
  for (let d = days; d > 0; d--) {
    const past = utcDay(day.start.getTime() - d * DAY_MS);
    if ((days - d) % every === 0) {
      for (let i = 0; i < lesson; i++) {
        const cardId = `c${modes.length}`;
        const added = past.start;
        modes.push({
          cardId,
          deckId: "d",
          mode: MODE,
          card: emptyState(added),
          added,
          hasCue: true,
        });
      }
    }
    playDay(modes, past, random, goal);
  }
  return modes;
}

const MODE = "term_to_meaning";

const copy = (modes: SimMode[]) => modes.map((m) => ({ ...m, card: { ...m.card } }));

export const DAY_STUDY = {
  seed: 11,
  /** Days played at the goal before the day shown, from a first lesson of `lesson` cards. */
  history: 45,
  lesson: 120,
  lessonEveryDays: 7,
  goal: 50,
  /** The review stops after this many attempts, with misses still waiting to return. */
  stopAfter: 20,
  date: "2026-09-14",
} as const;

/**
 * A generated collection played for one day at the default goal, then the same morning played
 * again and stopped partway. The stopped review is picked up later the same day from its log, and
 * what was left learning is carried into the next morning.
 */
export function dayStudy() {
  const { seed, history, lesson, lessonEveryDays, goal, stopAfter, date } = DAY_STUDY;
  const day = utcDay(Date.parse(`${date}T12:00:00Z`));
  const morning = learnerBefore(day, seed, history, lesson, lessonEveryDays, goal);

  const full = playDay(copy(morning), day, rng(seed), goal);

  // The same morning and the same grades, stopped partway: nothing is saved but the log.
  const stopped = copy(morning);
  const random = rng(seed);
  const before = playDay(stopped, day, random, stopAfter);
  const resumedNext = draw(toDrawCards(stopped, day), before.log, day);
  const uninterrupted = full.attempts[stopAfter];
  const waiting = new Set(
    before.attempts.filter((a) => a.missed).map((a) => drawKey(a.cardId, a.mode)),
  );
  for (const a of before.attempts) if (!a.missed) waiting.delete(drawKey(a.cardId, a.mode));

  // Not picked up today: tomorrow those misses are cards left learning from an earlier day.
  const tomorrow = utcDay(day.end.getTime() + 12 * 3_600_000);
  const next = playDay(stopped, tomorrow, rng(seed + 1), 15);

  return {
    goal,
    stopAfter,
    day: tiles(full.attempts),
    resumed: {
      same:
        resumedNext !== null &&
        uninterrupted !== undefined &&
        resumedNext.cardId === uninterrupted.cardId &&
        resumedNext.mode === uninterrupted.mode,
      waiting: waiting.size,
    },
    // Numbered on from the full day, so a card that shows up in both keeps its number.
    tomorrow: tiles(next.attempts, numbered(full.attempts)),
  };
}

export type DayStudy = ReturnType<typeof dayStudy>;
