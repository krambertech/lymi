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
  type ReviewAid,
  type ReviewMode,
} from "@lymi/core";
import type { Draw, QueueItem } from "./api";

const NEW = 0;
const LEARNING = 1;
const REVIEW = 2;
const RELEARNING = 3;

export interface LocalGrade {
  cardId: string;
  mode: ReviewMode;
  rating: Rating;
  reviewedAt: string;
  stateBefore?: number | undefined;
  aid?: ReviewAid | undefined;
  recallMs?: number | undefined;
  gradeMs?: number | undefined;
  readingsFaded?: number | undefined;
  undone?: boolean | undefined;
}

export type DrawData = Draw;

const logKey = (cardId: string, mode: string, at: string | Date) =>
  `${drawKey(cardId, mode)} ${new Date(at).getTime()}`;

export function currentDay(data: DrawData, now: Date): DayWindow {
  const start = new Date(data.day.start);
  const end = new Date(data.day.end);
  if (now >= start && now < end) return { date: data.day.date, start, end };
  return dayWindow(now, data.day.zone);
}

export function drawCards(data: DrawData): DrawCard[] {
  return data.cards.map(({ card, modes }) => ({
    cardId: card.id,
    deckId: card.deckId,
    important: card.important,
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
  const undone = new Set(
    grades.filter((g) => g.undone).map((g) => logKey(g.cardId, modeKey(g.mode), g.reviewedAt)),
  );
  const known = new Set(fetched.map((e) => logKey(e.cardId, e.mode, e.at)));
  const log = fetched.filter((e) => inDay(e.at) && !undone.has(logKey(e.cardId, e.mode, e.at)));
  const local = grades
    .filter((g) => !g.undone && !known.has(logKey(g.cardId, modeKey(g.mode), g.reviewedAt)))
    .map((g) => ({ grade: g, at: new Date(g.reviewedAt) }))
    .filter(({ at }) => inDay(at))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
  for (const { grade, at } of local) {
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
    slipping: entry.slipping,
  };
}

export interface DrawState {
  day: DayWindow;
  log: DrawLogEntry[];
  attempts: number;
  next: Drawn | null;
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
