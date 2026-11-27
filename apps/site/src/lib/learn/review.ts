import { browserStore, isRecord } from "./browser-store";
import { shuffle } from "./quiz";

export const REVIEW_KEY = "lymi-estonian-review";
export const GAPS = [1, 3, 7, 21] as const;
export const RESTED = GAPS.length + 1;
export const MOST_ENTRIES = 3000;
export const WARM_UP_SIZE = 5;
export const SET_SIZE = 10;

export interface Entry {
  step: number;
  due: number | null;
  last: number;
}

export interface Review {
  items: Readonly<Record<string, Entry>>;
}

export const EMPTY_REVIEW: Review = { items: {} };

const ITEM_ID = /^[a-z0-9-]+\/[a-z0-9-]+$/;

export const itemId = (lesson: string, id: string) => `${lesson}/${id}`;
export const lessonOf = (id: string) => id.slice(0, id.indexOf("/"));

export function localDay(now: Date = new Date()): number {
  return Math.floor((now.getTime() - now.getTimezoneOffset() * 60_000) / 86_400_000);
}

const isDay = (value: unknown): value is number => Number.isInteger(value) && Number(value) >= 0;

function cleanEntry(raw: unknown): Entry | null {
  if (!isRecord(raw)) return null;
  const { step, due, last } = raw;
  if (!isDay(step) || step > RESTED || !isDay(last)) return null;
  if (step === RESTED) return { step, due: null, last };
  return isDay(due) ? { step, due, last } : null;
}

export function cleanReview(raw: Record<string, unknown>): Review {
  const items: Record<string, Entry> = {};
  for (const [id, value] of Object.entries(isRecord(raw.items) ? raw.items : {})) {
    const entry = ITEM_ID.test(id) ? cleanEntry(value) : null;
    if (entry) items[id] = entry;
  }
  return bounded({ items });
}

function bounded(review: Review): Review {
  const entries = Object.entries(review.items);
  if (entries.length <= MOST_ENTRIES) return review;
  const kept = entries
    .sort(
      ([, a], [, b]) => Number(a.step === RESTED) - Number(b.step === RESTED) || b.last - a.last,
    )
    .slice(0, MOST_ENTRIES);
  return { items: Object.fromEntries(kept) };
}

export function isDue(entry: Entry | undefined, today: number): boolean {
  if (!entry || entry.due === null) return false;
  return entry.due <= today || entry.last > today;
}

function rightEntry(before: Entry | undefined, today: number): Entry {
  if (before && !isDue(before, today)) return { ...before, last: today };
  const step = (before?.step ?? 0) + 1;
  const gap = GAPS[step - 1];
  return { step, due: gap === undefined ? null : today + gap, last: today };
}

export function recordAnswer(review: Review, id: string, right: boolean, today: number): Review {
  if (!ITEM_ID.test(id)) return review;
  const entry = right
    ? rightEntry(review.items[id], today)
    : { step: 0, due: today + 1, last: today };
  return bounded({ items: { ...review.items, [id]: entry } });
}

export function scheduleNew(review: Review, ids: readonly string[], today: number): Review {
  const fresh = ids.filter((id) => ITEM_ID.test(id) && !review.items[id]);
  if (fresh.length === 0) return review;
  const items = { ...review.items };
  for (const id of fresh) items[id] = { step: 0, due: today + 1, last: today };
  return bounded({ items });
}

export function forgetRemoved(
  review: Review,
  lesson: string,
  existing: ReadonlySet<string>,
): Review {
  const gone = Object.keys(review.items).filter(
    (id) => lessonOf(id) === lesson && !existing.has(id),
  );
  if (gone.length === 0) return review;
  const items = { ...review.items };
  for (const id of gone) delete items[id];
  return { items };
}

export function dueIds(review: Review, today: number, lessons: ReadonlySet<string>): string[] {
  return Object.entries(review.items)
    .filter(([id, entry]) => lessons.has(lessonOf(id)) && isDue(entry, today))
    .sort(([, a], [, b]) => a.step - b.step || (a.due ?? 0) - (b.due ?? 0))
    .map(([id]) => id);
}

export function nextDueDay(
  review: Review,
  today: number,
  lessons: ReadonlySet<string>,
): number | null {
  const days = Object.entries(review.items).flatMap(([id, entry]) =>
    lessons.has(lessonOf(id)) && entry.due !== null && entry.due > today ? [entry.due] : [],
  );
  return days.length ? Math.min(...days) : null;
}

export function warmUpIds(review: Review, today: number, lessons: ReadonlySet<string>): string[] {
  const due = dueIds(review, today, lessons);
  const oldest = Object.entries(review.items)
    .filter(
      ([id, entry]) => lessons.has(lessonOf(id)) && !isDue(entry, today) && entry.last < today,
    )
    .sort(([, a], [, b]) => a.last - b.last)
    .map(([id]) => id);
  return [...due, ...oldest].slice(0, WARM_UP_SIZE);
}

export interface Ruled {
  id: string;
  rule: string;
}

export function nextInTurn<T extends Ruled>(queue: readonly T[], last: T | undefined): number {
  const others = queue.map((each, i) => ({ each, i })).filter(({ each }) => each.id !== last?.id);
  const apart = others.filter(({ each }) => each.rule !== last?.rule);
  const counts = new Map<string, number>();
  for (const { rule } of queue) counts.set(rule, (counts.get(rule) ?? 0) + 1);
  const crowded = apart.find(({ each }) => (counts.get(each.rule) ?? 0) * 2 > queue.length);
  return (crowded ?? apart[0] ?? others[0])?.i ?? 0;
}

export function interleave<T extends Ruled>(items: readonly T[]): T[] {
  const queue = [...items];
  const out: T[] = [];
  while (queue.length) out.push(...queue.splice(nextInTurn(queue, out.at(-1)), 1));
  return out;
}

export function drawDrill<T extends Ruled>(
  items: readonly T[],
  review: Review,
  today: number,
  size: number = SET_SIZE,
): T[] {
  const turnOf = (item: T): number => {
    const entry = review.items[item.id];
    if (!entry) return 1;
    return isDue(entry, today) ? 0 : 2;
  };
  const oldestFirst = (a: T, b: T) => {
    const [x, y] = [review.items[a.id], review.items[b.id]];
    return x && y ? x.last - y.last || x.step - y.step : 0;
  };
  const mixed = interleave(shuffle(items));
  const drawn = [0, 1, 2].flatMap((turn) =>
    mixed.filter((item) => turnOf(item) === turn).sort(turn === 2 ? oldestFirst : () => 0),
  );
  return interleave(drawn.slice(0, size));
}

export const reviewStore = browserStore<Review>({
  key: REVIEW_KEY,
  version: 1,
  empty: EMPTY_REVIEW,
  clean: cleanReview,
});

export const currentReview = reviewStore.current;
export const useReview = reviewStore.use;

export function saveAnswer(
  id: string,
  right: boolean,
  today: number = localDay(),
  storage?: Storage | null,
): void {
  reviewStore.update((review) => recordAnswer(review, id, right, today), storage);
}

export function saveScheduled(
  ids: readonly string[],
  today: number = localDay(),
  storage?: Storage | null,
): void {
  reviewStore.update((review) => scheduleNew(review, ids, today), storage);
}

export function saveRemoved(
  lesson: string,
  existing: ReadonlySet<string>,
  storage?: Storage | null,
): void {
  reviewStore.update((review) => forgetRemoved(review, lesson, existing), storage);
}
