import {
  type DayWindow,
  type DrawCard,
  type DrawLogEntry,
  type Drawn,
  dayWindow,
  draw,
  drawKey,
  drawOrder,
  missed,
  modeKey,
  type Rating,
  type ReviewMode,
} from "@lymi/core";
import type { Draw, QueueItem } from "./api";

// The review draws its next card on the device from the fetched draw and its own grades, ADR 0019.

const NEW = 0;
const LEARNING = 1;
const REVIEW = 2;
const RELEARNING = 3;

/** A grade made on this device that the fetched log may not hold yet. */
export interface LocalGrade {
  cardId: string;
  mode: ReviewMode;
  rating: Rating;
  /** ISO time of the grade, which is also how the server's log names it. */
  reviewedAt: string;
  /** FSRS state before the grade, fixed when it was made. */
  stateBefore?: number | undefined;
}

export type DrawData = Draw;

const logKey = (cardId: string, mode: string, at: string | Date) =>
  `${drawKey(cardId, mode)} ${new Date(at).getTime()}`;

/** The day a draw runs in now: the fetched one, or the next when the clock has crossed midnight. */
export function currentDay(data: DrawData, now: Date): DayWindow {
  const start = new Date(data.day.start);
  const end = new Date(data.day.end);
  if (now >= start && now < end) return { date: data.day.date, start, end };
  return dayWindow(now, data.day.zone);
}

export function drawCards(data: DrawData): DrawCard[] {
  return data.cards.map(({ card, modes, slipping }) => ({
    cardId: card.id,
    deckId: card.deckId,
    slipping,
    modes: modes.map((m) => ({
      mode: modeKey(m.mode),
      state: m.fsrsState,
      due: new Date(m.due),
      retrievability: m.retrievability,
      added: new Date(m.added),
      hasCue: m.hasCue,
    })),
  }));
}

function cachedState(data: DrawData, cardId: string, key: string): number {
  const entry = data.cards.find((c) => c.card.id === cardId);
  return entry?.modes.find((m) => modeKey(m.mode) === key)?.fsrsState ?? REVIEW;
}

/** The state before a mode's next grade: the fetched one first, then learning after a miss or Review otherwise. */
export function stateBefore(
  data: DrawData,
  log: readonly DrawLogEntry[],
  cardId: string,
  mode: ReviewMode,
): number {
  const key = modeKey(mode);
  const earlier = log.filter((e) => e.cardId === cardId && e.mode === key);
  const last = earlier[earlier.length - 1];
  if (!last) return cachedState(data, cardId, key);
  if (!missed(last.rating, last.stateBefore)) return REVIEW;
  const first = earlier[0]?.stateBefore ?? REVIEW;
  return first === NEW || first === LEARNING ? LEARNING : RELEARNING;
}

/** Today's log: the fetched grades plus local ones it lacks, leaving out any from before `day`. */
export function drawLog(
  data: DrawData,
  grades: readonly LocalGrade[],
  day: DayWindow,
): DrawLogEntry[] {
  const inDay = (at: Date) => at >= day.start && at < day.end;
  const fetched = data.log.map((e) => ({
    cardId: e.cardId,
    mode: modeKey(e.mode),
    rating: e.rating,
    stateBefore: e.stateBefore,
    at: new Date(e.at),
  }));
  const known = new Set(fetched.map((e) => logKey(e.cardId, e.mode, e.at)));
  const log = fetched.filter((e) => inDay(e.at));
  const local = grades
    .filter((g) => !known.has(logKey(g.cardId, modeKey(g.mode), g.reviewedAt)))
    .map((g) => ({ grade: g, at: new Date(g.reviewedAt) }))
    .filter(({ at }) => inDay(at))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  for (const { grade, at } of local) {
    // A grade queued before this module stored `stateBefore` is classified from the log so far.
    const before = grade.stateBefore ?? stateBefore(data, log, grade.cardId, grade.mode);
    const entry = {
      cardId: grade.cardId,
      mode: modeKey(grade.mode),
      rating: grade.rating,
      stateBefore: before,
      at,
    };
    const index = log.findIndex((e) => e.at > at);
    if (index === -1) log.push(entry);
    else log.splice(index, 0, entry);
  }
  return log;
}

/** A drawn mode as the review screen shows it, or null when its card is not in the fetched data. */
export function reviewItem(
  data: DrawData,
  log: readonly DrawLogEntry[],
  drawn: Pick<Drawn, "cardId" | "mode">,
): QueueItem | null {
  const entry = data.cards.find((c) => c.card.id === drawn.cardId);
  const mode = entry?.modes.find((m) => modeKey(m.mode) === drawn.mode);
  if (!entry || !mode) return null;
  const fetched = new Set(data.log.map((e) => logKey(e.cardId, modeKey(e.mode), e.at)));
  const graded = log.filter((e) => e.cardId === drawn.cardId && e.mode === drawn.mode);
  const since = graded.filter((e) => !fetched.has(logKey(e.cardId, e.mode, e.at)));
  const last = graded[graded.length - 1];
  // A grade since the fetch moved the state, so the fetched schedule no longer applies.
  const fsrsState =
    since.length === 0 || !last
      ? mode.fsrsState
      : missed(last.rating, last.stateBefore)
        ? stateBefore(data, log, drawn.cardId, mode.mode)
        : REVIEW;
  return {
    card: entry.card,
    mode: mode.mode,
    ...(mode.direction ? { direction: mode.direction } : {}),
    stateId: mode.stateId,
    fsrsState,
    next: since.length === 0 ? mode.next : undefined,
  };
}

export interface DrawState {
  day: DayWindow;
  log: DrawLogEntry[];
  /** Accepted, non-undone grades today in every scope, the header's count. */
  attempts: number;
  next: Drawn | null;
  /** The cards after `next`, for fetching pictures ahead. */
  upcoming: QueueItem[];
}

export function drawState(
  data: DrawData,
  grades: readonly LocalGrade[],
  now: Date,
  deckId: string | undefined,
  lookahead = 0,
): DrawState {
  const day = currentDay(data, now);
  const log = drawLog(data, grades, day);
  const cards = drawCards(data);
  const scope = { deckId };
  const next = draw(cards, log, day, scope);
  const upcoming =
    lookahead > 0
      ? drawOrder(cards, log, day, scope, lookahead + 1).flatMap(
          (d) => reviewItem(data, log, d) ?? [],
        )
      : [];
  return { day, log, attempts: log.length, next, upcoming };
}
