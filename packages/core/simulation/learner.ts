import { State } from "ts-fsrs";
import {
  type DayWindow,
  type DrawCard,
  type DrawLogEntry,
  type Drawn,
  type DrawPolicy,
  drawer,
  drawKey,
  missed,
} from "../src/draw";
import { emptyState, type FsrsCard, retrievability, schedule } from "../src/fsrs";
import type { Rating } from "../src/types";

export const DAY_MS = 86_400_000;

/** A small seeded generator, so every run can be replayed from its seed. */
export function rng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

export type Random = ReturnType<typeof rng>;

/** One asked mode of one card, with the FSRS state the real scheduler gave it. */
export interface SimMode {
  cardId: string;
  deckId: string;
  mode: string;
  card: FsrsCard;
  added: Date;
  hasCue: boolean;
}

/** The UTC day that holds an instant, so a run is the same on every machine. */
export function utcDay(at: number): DayWindow {
  const start = at - (at % DAY_MS);
  return {
    date: new Date(start).toISOString().slice(0, 10),
    start: new Date(start),
    end: new Date(start + DAY_MS),
  };
}

/**
 * A collection on the morning of `day`: cards added over the past months and graded on earlier
 * days through the real scheduler. About one card in five is asked both ways, and some lack a
 * meaning, so sibling and missing-cue rules have something to do.
 */
export function collection(seed: number, day: DayWindow, size: number): SimMode[] {
  const random = rng(seed);
  const modes: SimMode[] = [];
  for (let i = 0; i < size; i++) {
    const cardId = `c${i}`;
    const deckId = `d${i % 3}`;
    const ageDays = Math.floor(random() * 120);
    const added = new Date(day.start.getTime() - ageDays * DAY_MS - 9 * 3_600_000);
    const hasMeaning = random() > 0.1;
    const both = random() < 0.2;
    const order = both ? ["meaning_to_term", "term_to_meaning"] : ["term_to_meaning"];
    for (const mode of order) {
      let card = emptyState(added);
      const reviews = random() < 0.3 ? 0 : 1 + Math.floor(random() * 6);
      let at = added.getTime();
      for (let r = 0; r < reviews; r++) {
        at = Math.max(at + DAY_MS, card.due.getTime()) + Math.floor(random() * 3) * DAY_MS;
        if (at >= day.start.getTime() - 3_600_000) break;
        const rating = (
          random() < 0.15 ? 1 : random() < 0.2 ? 2 : random() < 0.9 ? 3 : 4
        ) as Rating;
        card = schedule(card, rating, new Date(at)).card;
      }
      modes.push({
        cardId,
        deckId,
        mode,
        card,
        added,
        hasCue: mode === "meaning_to_term" ? hasMeaning : true,
      });
    }
  }
  return modes;
}

/** What the drawable-modes endpoint would return for these modes on this day. */
export function toDrawCards(modes: readonly SimMode[], day: DayWindow): DrawCard[] {
  const byCard = new Map<string, DrawCard>();
  for (const m of modes) {
    const card = byCard.get(m.cardId) ?? { cardId: m.cardId, deckId: m.deckId, modes: [] };
    card.modes.push({
      mode: m.mode,
      state: m.card.state,
      due: m.card.due,
      retrievability: retrievability(m.card, day.start),
      added: m.added,
      hasCue: m.hasCue,
    });
    byCard.set(m.cardId, card);
  }
  return [...byCard.values()];
}

/** How the simulated learner recalls. The chances are guesses, stated on the docs page. */
export const RECALL = {
  /** A card never seen before. */
  unseen: 0.5,
  /** A card that returns after a miss today, or was left learning yesterday. */
  again: 0.75,
  /** Of the recalls, how many are graded Hard and Easy; the rest are Good. */
  hard: 0.1,
  easy: 0.1,
} as const;

/** A grade for one attempt: a review is recalled with its retrievability right now. */
export function grade(random: Random, sim: SimMode, kind: Drawn["kind"], at: Date): Rating {
  const chance =
    kind === "return" || kind === "carry"
      ? RECALL.again
      : sim.card.state === State.New
        ? RECALL.unseen
        : retrievability(sim.card, at);
  if (random() >= chance) return 1;
  const roll = random();
  return roll < RECALL.hard ? 2 : roll < RECALL.hard + RECALL.easy ? 4 : 3;
}

export interface Attempt extends Drawn {
  rating: Rating;
  missed: boolean;
}

/**
 * Play attempts on one day through the real draw and scheduler, until `goal` attempts or the day
 * is exhausted. The draw reads the morning's cards, as the client does between reloads; a mode
 * graded today is left to the log, which is all `draw` consults for it.
 */
export function playDay(
  modes: SimMode[],
  day: DayWindow,
  random: Random,
  goal: number,
  options: { log?: DrawLogEntry[]; policy?: DrawPolicy } = {},
) {
  const log = options.log ?? [];
  const graded = new Set(log.map((e) => e.cardId));
  // Only modes that could come up today, so a year of cards does not slow every attempt.
  const end = day.end.getTime();
  const live = modes.filter((m) => m.card.due.getTime() < end || graded.has(m.cardId));
  const byKey = new Map(live.map((m) => [drawKey(m.cardId, m.mode), m]));
  const next = drawer(toDrawCards(live, day), day, {}, options.policy);
  const attempts: Attempt[] = [];
  let clock = day.start.getTime() + 9 * 3_600_000 + log.length * 20_000;
  while (attempts.length < goal) {
    const drawn = next(log);
    if (!drawn) break;
    const sim = byKey.get(drawKey(drawn.cardId, drawn.mode)) as SimMode;
    clock += 20_000;
    const at = new Date(clock);
    const rating = grade(random, sim, drawn.kind, at);
    const stateBefore = sim.card.state;
    sim.card = schedule(sim.card, rating, at).card;
    log.push({ cardId: drawn.cardId, mode: drawn.mode, rating, stateBefore, at });
    attempts.push({ ...drawn, rating, missed: missed(rating, stateBefore) });
  }
  return { log, attempts };
}
