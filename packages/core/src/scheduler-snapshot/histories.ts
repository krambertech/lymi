import type { Rating } from "../types";
import { type GradeAt, type History, iso, scheduleOf } from "./snapshot";

/**
 * The seed `histories.json` was drawn from. Times follow the scheduler of the day they were
 * drawn, so drawing again after a scheduler change gives different histories: never redraw them
 * in the pull request that changes the scheduler.
 */
export const SEED = 20261118;

const SECOND_MS = 1000;
const MINUTE_MS = 60 * SECOND_MS;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;
const EPOCH = Date.parse("2026-01-05T00:00:00Z");

/** mulberry32: small, seedable and the same in every runtime. */
function generator(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Weights = [Rating, number][];

const STEADY: Weights = [
  [1, 6],
  [2, 12],
  [3, 70],
  [4, 12],
];
const FORGETFUL: Weights = [
  [1, 45],
  [2, 20],
  [3, 30],
  [4, 5],
];
const ANY: Weights = [
  [1, 25],
  [2, 25],
  [3, 25],
  [4, 25],
];

export function generateHistories(seed: number = SEED): Record<string, History> {
  const random = generator(seed);
  const between = (min: number, max: number) => min + random() * (max - min);
  const int = (min: number, max: number) => Math.floor(between(min, max + 1));
  const chance = (p: number) => random() < p;
  const rating = (weights: Weights): Rating => {
    let roll = random() * weights.reduce((sum, [, w]) => sum + w, 0);
    for (const [r, w] of weights) {
      roll -= w;
      if (roll < 0) return r;
    }
    return 3;
  };
  /** A start on a random day of the first quarter, to the minute. */
  const start = () => EPOCH + int(0, 90) * DAY_MS + int(6 * 60, 23 * 60) * MINUTE_MS;

  /** When the card falls due after these grades, as the scheduler sees it now. */
  const dueAfter = (history: History, at: number) =>
    Date.parse(scheduleOf({ ...history, previewAt: iso(at) }).due);

  /** A learner who comes back around the due date: minutes late in a learning step, days around a review. */
  const nextVisit = (last: number, due: number) => {
    const at =
      due - last < DAY_MS
        ? due + int(0, 30) * MINUTE_MS
        : due + Math.round(between(-0.3, 1.5) * DAY_MS);
    return Math.max(at, last + MINUTE_MS);
  };

  const histories: Record<string, History> = {};
  const add = (kind: string, n: number, make: () => History) => {
    for (let i = 1; i <= n; i++) histories[`${kind}-${String(i).padStart(3, "0")}`] = make();
  };

  /** Grades given on each visit around the due date, then the buttons shown on the next visit. */
  const play = (
    history: History,
    first: number,
    n: number,
    weights: Weights,
    visit = nextVisit,
  ) => {
    let at = first;
    for (let i = 0; i < n; i++) {
      history.grades.push([iso(at), rating(weights)]);
      at = visit(at, dueAfter(history, at));
    }
    history.previewAt = iso(chance(0.2) ? at - int(1, 48) * HOUR_MS : at);
    return history;
  };

  add("new", 12, () => {
    const s = start();
    return { start: iso(s), grades: [], previewAt: iso(s + int(0, 72 * 60) * MINUTE_MS) };
  });

  add("first", 24, () => {
    const s = start();
    const history: History = { start: iso(s), grades: [], previewAt: "" };
    const at = s + int(1, 72 * 60) * MINUTE_MS;
    history.grades.push([iso(at), (1 + (Object.keys(histories).length % 4)) as Rating]);
    history.previewAt = iso(nextVisit(at, dueAfter(history, at)));
    return history;
  });

  add("steady", 60, () => {
    const s = start();
    return play(
      { start: iso(s), grades: [], previewAt: "" },
      s + int(1, 600) * MINUTE_MS,
      int(3, 10),
      STEADY,
    );
  });

  add("forgot", 40, () => {
    const s = start();
    return play(
      { start: iso(s), grades: [], previewAt: "" },
      s + int(1, 600) * MINUTE_MS,
      int(4, 14),
      FORGETFUL,
    );
  });

  add("gaps", 40, () => {
    const s = start();
    const away = (last: number, due: number) =>
      chance(0.5)
        ? last + Math.min(Math.max(due - last, DAY_MS) * Math.round(between(3, 10)), 1000 * DAY_MS)
        : last + int(60, 900) * DAY_MS;
    return play(
      { start: iso(s), grades: [], previewAt: "" },
      s + int(1, 600) * MINUTE_MS,
      int(2, 8),
      STEADY,
      away,
    );
  });

  add("same-day", 40, () => {
    const s = start();
    const history: History = { start: iso(s), grades: [], previewAt: "" };
    let at = s + int(1, 600) * MINUTE_MS;
    for (let burst = int(1, 3); burst > 0; burst--) {
      for (let n = int(2, 6); n > 0; n--) {
        history.grades.push([iso(at), rating(ANY)]);
        // Mostly seconds to minutes apart, sometimes hours, as in a round or a second look.
        at += Math.round(SECOND_MS * Math.exp(between(0, Math.log(6 * 3600))));
      }
      at += int(1, 9) * DAY_MS;
    }
    const last = Date.parse((history.grades.at(-1) as GradeAt)[0]);
    history.previewAt = iso(last + int(1, 3600) * SECOND_MS);
    return history;
  });

  add("clock", 8, () => {
    const s = start();
    const history = play(
      { start: iso(s), grades: [], previewAt: "" },
      s + int(1, 600) * MINUTE_MS,
      int(2, 6),
      STEADY,
    );
    const last = Date.parse((history.grades.at(-1) as GradeAt)[0]);
    // A device clock behind the last grade.
    history.previewAt = iso(last - int(1, 600) * SECOND_MS);
    return history;
  });

  add("imported", 40, () => {
    const s = start();
    const variant = random();
    const reviews: GradeAt[] = [];
    let at = s - int(30, 720) * DAY_MS;
    for (let n = variant < 0.15 ? 0 : int(1, 12); n > 0 && at < s - DAY_MS; n--) {
      reviews.push([iso(at), rating(STEADY)]);
      // Two grades at one moment, of which replay keeps the lower.
      if (chance(0.08)) reviews.push([iso(at), rating(ANY)]);
      at += int(1, 60) * DAY_MS + int(0, 600) * MINUTE_MS;
    }
    // A grade dated after the import, which replay leaves out.
    if (chance(0.1)) reviews.push([iso(s + int(1, 30) * DAY_MS), rating(ANY)]);
    const lastReview = reviews.length
      ? Date.parse((reviews.at(-1) as GradeAt)[0])
      : s - int(1, 200) * DAY_MS;
    const imported: NonNullable<History["imported"]> = { reviews };
    if (chance(0.6)) imported.due = iso(Math.min(lastReview, s) + int(-30, 120) * DAY_MS);
    if (reviews.length === 0 && chance(0.8)) {
      imported.memory = {
        stability: Math.round(between(0.5, 200) * 100) / 100,
        difficulty: Math.round(between(1, 10) * 100) / 100,
        lastReview: iso(lastReview),
      };
    }
    if (reviews.length > 0 && chance(0.1)) imported.unstarted = true;

    const history: History = { start: iso(s), imported, grades: [], previewAt: "" };
    const first = Math.max(s + MINUTE_MS, dueAfter(history, s));
    if (chance(0.5)) return play(history, first, int(1, 3), STEADY);
    history.previewAt = iso(first);
    return history;
  });

  return histories;
}
