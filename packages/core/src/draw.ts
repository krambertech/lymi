import { State } from "ts-fsrs";
import type { Rating } from "./types";

/**
 * The review draw, ADR 0019. Nothing about a review is stored: the next card is a pure
 * function of the drawable modes, today's log, the scope and the learner-local day. Every
 * number is a named constant so the docs page and the simulations can read them.
 */

/** Every fifth ordinary draw is a new card while both groups are drawable. */
export const NEW_CARD_SLOT_EVERY = 5;
/** Every fourth new-card slot takes the oldest unseen card instead of a weighted one. */
export const OLDEST_UNSEEN_SLOT_EVERY = 4;
/** Attempts before a missed mode returns, by return number. After the last it waits a day. */
export const RETURN_GAPS = [3, 6, 12] as const;
/** Each gap moves by up to this many attempts either way. */
export const RETURN_JITTER = 1;
/** A mode left learning from an earlier day is served this many attempts apart. */
export const CARRY_OVER_EVERY = 3;
/** Review odds are retrievability at the start of the day to this power. */
export const REVIEW_ODDS_POWER = 4;
/** An unseen card's odds halve every this many days since it was added. */
export const UNSEEN_HALF_LIFE_DAYS = 7;

const DAY_MS = 86_400_000;
const MIN_WEIGHT = 1e-6;

export type ModeKey = string;

export interface DrawMode {
  mode: ModeKey;
  /** FSRS state: 0 New, 1 Learning, 2 Review, 3 Relearning. */
  state: State;
  due: Date;
  /** Retrievability at the start of the day; 0 for a mode never reviewed. */
  retrievability: number;
  /** When the mode began to exist for this learner. */
  added: Date;
  /** False when the card lacks the field this mode shows before reveal. Such a mode is skipped. */
  hasCue: boolean;
}

/** One card's asked modes, in the order they are introduced. */
export interface DrawCard {
  cardId: string;
  deckId: string;
  modes: DrawMode[];
}

/** One accepted, non-undone grade from today, in every scope. */
export interface DrawLogEntry {
  cardId: string;
  mode: ModeKey;
  rating: Rating;
  /** FSRS state before the grade. */
  stateBefore: State;
  at: Date;
}

/** The learner-local day: its date and the instants it runs between. */
export interface DayWindow {
  date: string;
  start: Date;
  /** The start of the next day, exclusive. */
  end: Date;
}

export interface DrawScope {
  deckId?: string | undefined;
}

export type DrawKind = "return" | "carry" | "review" | "unseen";

export interface Drawn {
  cardId: string;
  mode: ModeKey;
  kind: DrawKind;
}

/** The one spelling of a card-and-mode key, shared by every map that looks a mode up. */
export const drawKey = (cardId: string, mode: ModeKey) => `${cardId} ${mode}`;

/**
 * Whether a grade leaves the mode in learning or relearning under the one-step scheduler:
 * Forgot always does, Hard does unless the mode was in Review. The client classifies its
 * outbox grades with the same rule, so the log needs no FSRS state after the grade.
 */
export function missed(rating: Rating, stateBefore: State): boolean {
  return rating === 1 || (rating === 2 && stateBefore !== State.Review);
}

/** What each grade was when it was drawn: a repeat of a mode is a return, whatever its state. */
function classify(log: readonly DrawLogEntry[]): DrawKind[] {
  const seen = new Set<string>();
  return log.map((entry) => {
    const k = drawKey(entry.cardId, entry.mode);
    let kind: DrawKind;
    if (seen.has(k)) kind = "return";
    else if (entry.stateBefore === State.Learning || entry.stateBefore === State.Relearning) {
      kind = "carry";
    } else kind = entry.stateBefore === State.New ? "unseen" : "review";
    seen.add(k);
    return kind;
  });
}

interface PendingReturn {
  cardId: string;
  mode: ModeKey;
  /** How many misses today, which is also the return number. */
  misses: number;
  /** Position in the log of the latest miss. */
  missedAt: number;
}

/** Modes whose latest grade today left them in learning, earliest miss first. */
function pendingReturns(log: readonly DrawLogEntry[]): PendingReturn[] {
  const pending = new Map<string, PendingReturn>();
  log.forEach((entry, index) => {
    const k = drawKey(entry.cardId, entry.mode);
    if (!missed(entry.rating, entry.stateBefore)) {
      pending.delete(k);
      return;
    }
    pending.set(k, {
      cardId: entry.cardId,
      mode: entry.mode,
      misses: (pending.get(k)?.misses ?? 0) + 1,
      missedAt: index,
    });
  });
  return [...pending.values()].sort((a, b) => a.missedAt - b.missedAt);
}

/** FNV-1a with a final avalanche, so nearby ids do not draw nearby keys. */
function hash32(input: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/** A number in (0, 1) fixed for the day, the card and the mode, so every scope agrees. */
function unit(date: string, cardId: string, mode: ModeKey, salt = ""): number {
  return (hash32(`${date}|${cardId}|${mode}|${salt}`) + 0.5) / 4_294_967_296;
}

/** The gap a return waits for, counted in attempts after the miss. */
export function returnGap(date: string, cardId: string, mode: ModeKey, misses: number): number {
  const base = RETURN_GAPS[Math.min(misses, RETURN_GAPS.length) - 1] as number;
  const jitter = Math.floor(unit(date, cardId, mode, `return${misses}`) * (2 * RETURN_JITTER + 1));
  return base + jitter - RETURN_JITTER;
}

/** Efraimidis–Spirakis: a larger key wins, and a weight of w makes an item w times as likely. */
export function weightedKey(date: string, cardId: string, mode: ModeKey, weight: number): number {
  return Math.log(unit(date, cardId, mode)) / Math.max(MIN_WEIGHT, weight);
}

export interface Candidate {
  cardId: string;
  mode: DrawMode;
}

/**
 * How a group is ordered: a larger key is drawn first. Production always uses `DRAW_POLICY`;
 * the simulations pass another to compare it with the orders ADR 0019 rejected.
 */
export interface DrawPolicy {
  reviewKey: (c: Candidate, day: DayWindow) => number;
  unseenKey: (c: Candidate, day: DayWindow) => number;
  /** Every this many new-card slots takes the oldest unseen card. */
  oldestSlotEvery: number;
}

export const DRAW_POLICY: DrawPolicy = {
  reviewKey: (c, day) =>
    weightedKey(day.date, c.cardId, c.mode.mode, c.mode.retrievability ** REVIEW_ODDS_POWER),
  unseenKey: (c, day) => {
    const ageDays = Math.max(0, day.start.getTime() - c.mode.added.getTime()) / DAY_MS;
    return weightedKey(day.date, c.cardId, c.mode.mode, 0.5 ** (ageDays / UNSEEN_HALF_LIFE_DAYS));
  },
  oldestSlotEvery: OLDEST_UNSEEN_SLOT_EVERY,
};

const reachedReview = (mode: DrawMode | undefined) =>
  mode !== undefined && (mode.state === State.Review || mode.state === State.Relearning);

/**
 * Everything about a day that does not depend on the log: which modes are eligible and the
 * order of each group. Built once and read at every attempt, since the keys are the day's.
 */
interface Plan {
  day: DayWindow;
  /** Every mode of every card in scope, so a pending return is found whatever its due. */
  modes: Map<string, Candidate>;
  carries: Candidate[];
  reviews: Candidate[];
  /** Unseen modes by weighted key, and by age for the oldest-card slot. */
  recent: Candidate[];
  oldest: Candidate[];
  oldestSlotEvery: number;
}

const sortedBy = <T>(items: T[], keyOf: (item: T) => number, descending = false) =>
  items
    .map((item) => ({ item, key: keyOf(item) }))
    .sort((a, b) => (descending ? b.key - a.key : a.key - b.key))
    .map(({ item }) => item);

function plan(
  cards: readonly DrawCard[],
  day: DayWindow,
  scope: DrawScope,
  policy: DrawPolicy,
): Plan {
  const { date } = day;
  const modes = new Map<string, Candidate>();
  const carries: Candidate[] = [];
  const reviews: Candidate[] = [];
  const unseen: Candidate[] = [];
  for (const card of cards) {
    if (scope.deckId && card.deckId !== scope.deckId) continue;
    for (const mode of card.modes) {
      modes.set(drawKey(card.cardId, mode.mode), { cardId: card.cardId, mode });
    }
    const asked = card.modes.filter((mode) => mode.hasCue);
    asked.forEach((mode, index) => {
      if (mode.due.getTime() >= day.end.getTime()) return;
      const candidate = { cardId: card.cardId, mode };
      if (mode.state === State.New) {
        // Modes start one at a time: the next waits until the one before reaches Review.
        if (index === 0 || reachedReview(asked[index - 1])) unseen.push(candidate);
      } else if (mode.state === State.Review) reviews.push(candidate);
      else carries.push(candidate);
    });
  }
  const tie = (c: Candidate) => unit(date, c.cardId, c.mode.mode);
  const byDue = (a: Candidate, b: Candidate) =>
    a.mode.due.getTime() - b.mode.due.getTime() || tie(a) - tie(b);
  const byAge = (a: Candidate, b: Candidate) =>
    a.mode.added.getTime() - b.mode.added.getTime() || tie(a) - tie(b);
  return {
    day,
    modes,
    carries: [...carries].sort(byDue),
    reviews: sortedBy(reviews, (c) => policy.reviewKey(c, day), true),
    recent: sortedBy(unseen, (c) => policy.unseenKey(c, day), true),
    oldest: [...unseen].sort(byAge),
    oldestSlotEvery: policy.oldestSlotEvery,
  };
}

interface Returning extends PendingReturn {
  reached: boolean;
}

/** Returns still owed today in this scope, earliest miss first; past the cap they are left out. */
function returning(p: Plan, log: readonly DrawLogEntry[]): Returning[] {
  return pendingReturns(log).flatMap((pending) => {
    if (pending.misses > RETURN_GAPS.length) return [];
    if (!p.modes.has(drawKey(pending.cardId, pending.mode))) return [];
    const since = log.length - pending.missedAt - 1;
    const reached = since >= returnGap(p.day.date, pending.cardId, pending.mode, pending.misses);
    return [{ ...pending, reached }];
  });
}

const pick = (c: Candidate, kind: DrawKind): Drawn => ({
  cardId: c.cardId,
  mode: c.mode.mode,
  kind,
});

/**
 * The next card from a plan. Each attempt takes the first of: a return whose gap is reached;
 * a mode left learning from an earlier day, spaced every few attempts or at once when nothing
 * else is drawable; an ordinary draw; the earliest pending return. Null when the day is done.
 */
function next(p: Plan, log: readonly DrawLogEntry[]): Drawn | null {
  const returns = returning(p, log);
  const reached = returns.find((r) => r.reached);
  if (reached) return { cardId: reached.cardId, mode: reached.mode, kind: "return" };

  // A card reviewed today waits for tomorrow, whichever mode it was.
  const reviewed = new Set(log.map((entry) => entry.cardId));
  const fresh = (c: Candidate) => !reviewed.has(c.cardId);
  const carry = p.carries.find(fresh);
  const review = p.reviews.find(fresh);
  const kinds = classify(log);

  const slots = kinds.filter((k) => k === "unseen").length;
  const oldestSlot = slots % p.oldestSlotEvery === p.oldestSlotEvery - 1;
  const unseen = (oldestSlot ? p.oldest : p.recent).find(fresh);

  if (carry) {
    const lastCarry = kinds.lastIndexOf("carry");
    const since = lastCarry === -1 ? Number.POSITIVE_INFINITY : log.length - lastCarry;
    if (since >= CARRY_OVER_EVERY || (!review && !unseen)) return pick(carry, "carry");
  }

  const ordinary = kinds.filter((k) => k === "review" || k === "unseen").length;
  const newSlot = ordinary % NEW_CARD_SLOT_EVERY === NEW_CARD_SLOT_EVERY - 1;
  if (unseen && (newSlot || !review)) return pick(unseen, "unseen");
  if (review) return pick(review, "review");

  const earliest = returns[0];
  return earliest ? { cardId: earliest.cardId, mode: earliest.mode, kind: "return" } : null;
}

/** The next card, or null when the day is exhausted. The rules are on `next`. */
export function draw(
  cards: readonly DrawCard[],
  log: readonly DrawLogEntry[],
  day: DayWindow,
  scope: DrawScope = {},
): Drawn | null {
  return next(plan(cards, day, scope, DRAW_POLICY), log);
}

/**
 * `draw` with the day's plan built once, for a caller that draws many times from the same
 * morning's cards. The simulations use it to play a year, and to swap in a rejected policy.
 */
export function drawer(
  cards: readonly DrawCard[],
  day: DayWindow,
  scope: DrawScope = {},
  policy: DrawPolicy = DRAW_POLICY,
): (log: readonly DrawLogEntry[]) => Drawn | null {
  const p = plan(cards, day, scope, policy);
  return (log) => next(p, log);
}

/**
 * The order a review would take if every grade succeeded: the queue as a list. A real grade
 * of Forgot inserts a return, so a client that draws itself recomputes after each grade.
 */
export function drawOrder(
  cards: readonly DrawCard[],
  log: readonly DrawLogEntry[],
  day: DayWindow,
  scope: DrawScope = {},
  limit = Number.POSITIVE_INFINITY,
): Drawn[] {
  const p = plan(cards, day, scope, DRAW_POLICY);
  const simulated = [...log];
  const out: Drawn[] = [];
  while (out.length < limit) {
    const drawn = next(p, simulated);
    if (!drawn) break;
    out.push(drawn);
    simulated.push({
      cardId: drawn.cardId,
      mode: drawn.mode,
      rating: 3,
      stateBefore: p.modes.get(drawKey(drawn.cardId, drawn.mode))?.mode.state ?? State.Review,
      at: day.start,
    });
  }
  return out;
}

/** Cards with at least one drawable mode. The queue's total, the deck counts and exhaustion. */
export function drawableCount(
  cards: readonly DrawCard[],
  log: readonly DrawLogEntry[],
  day: DayWindow,
  scope: DrawScope = {},
): number {
  const p = plan(cards, day, scope, DRAW_POLICY);
  const reviewed = new Set(log.map((entry) => entry.cardId));
  const ids = new Set<string>();
  for (const group of [p.carries, p.reviews, p.recent]) {
    for (const c of group) if (!reviewed.has(c.cardId)) ids.add(c.cardId);
  }
  for (const r of returning(p, log)) ids.add(r.cardId);
  return ids.size;
}

/** Modes whose latest grade today is Forgot. Review forgotten shows each once. */
export function forgottenToday(log: readonly DrawLogEntry[]): { cardId: string; mode: ModeKey }[] {
  const latest = new Map<string, DrawLogEntry>();
  for (const entry of log) latest.set(drawKey(entry.cardId, entry.mode), entry);
  return [...latest.values()]
    .filter((entry) => entry.rating === 1)
    .map(({ cardId, mode }) => ({ cardId, mode }));
}

/** The groups Today offers to review on their own, beside the day's draw. */
export const ROUNDS = ["forgotten", "new", "slipping"] as const;
export type Round = (typeof ROUNDS)[number];

export interface RoundScope extends DrawScope {
  round: Round;
  /** Cards that keep slipping, found from their whole review history. Only that round reads it. */
  slipping?: ReadonlySet<string> | undefined;
}

/**
 * A round: one Today group in the order it is reviewed, each card once. Forgotten cards come
 * in the mode they were forgotten in, even past their returns. New cards take the next unseen
 * modes oldest first, as the draw introduces them. A slipping card comes in its weakest known
 * mode whether or not it is due, weakest first, and is graded like any review.
 */
export function roundOrder(
  cards: readonly DrawCard[],
  log: readonly DrawLogEntry[],
  day: DayWindow,
  scope: RoundScope,
  limit = Number.POSITIVE_INFINITY,
): Drawn[] {
  const inScope = cards.filter((card) => !scope.deckId || card.deckId === scope.deckId);
  const out: Drawn[] = [];
  const taken = new Set<string>();
  const push = (cardId: string, mode: ModeKey, kind: DrawKind) => {
    if (taken.has(cardId) || out.length >= limit) return;
    taken.add(cardId);
    out.push({ cardId, mode, kind });
  };
  const reviewed = new Set(log.map((entry) => entry.cardId));

  switch (scope.round) {
    case "forgotten": {
      const known = new Set(
        inScope.flatMap((card) => card.modes.map((mode) => drawKey(card.cardId, mode.mode))),
      );
      for (const f of forgottenToday(log)) {
        if (known.has(drawKey(f.cardId, f.mode))) push(f.cardId, f.mode, "return");
      }
      break;
    }
    case "new":
      for (const c of plan(cards, day, scope, DRAW_POLICY).oldest) {
        if (!reviewed.has(c.cardId)) push(c.cardId, c.mode.mode, "unseen");
      }
      break;
    case "slipping": {
      const weakest = inScope.flatMap((card) => {
        if (!scope.slipping?.has(card.cardId) || reviewed.has(card.cardId)) return [];
        const [mode] = card.modes
          .filter((m) => m.hasCue && reachedReview(m))
          .sort((a, b) => a.retrievability - b.retrievability);
        return mode ? [{ cardId: card.cardId, mode }] : [];
      });
      const tie = (c: Candidate) => unit(day.date, c.cardId, c.mode.mode);
      weakest.sort((a, b) => a.mode.retrievability - b.mode.retrievability || tie(a) - tie(b));
      for (const c of weakest) push(c.cardId, c.mode.mode, "review");
      break;
    }
    default: {
      const _exhaustive: never = scope.round;
      return _exhaustive;
    }
  }
  return out;
}

const DATE_PARTS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
};

/** A formatter for the zone, or for UTC when the zone is unknown. */
function formatter(zone: string): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat("en-CA", { ...DATE_PARTS, timeZone: zone });
  } catch {
    return new Intl.DateTimeFormat("en-CA", { ...DATE_PARTS, timeZone: "UTC" });
  }
}

function wallClock(instant: Date, fmt: Intl.DateTimeFormat) {
  const parts = fmt.formatToParts(instant);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const [year, month, day] = [value("year"), value("month"), value("day")];
  return {
    date: `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    wall: Date.UTC(year, month - 1, day, value("hour"), value("minute"), value("second")),
  };
}

/** Resolves an instant to its local calendar date. Falls back to UTC for an unknown zone. */
export function localDate(instant: Date, zone: string): string {
  return wallClock(instant, formatter(zone)).date;
}

/**
 * The instant a local date begins: the first the zone formats as that date. The offset at
 * midnight is a first guess, checked against the formatter; a zone that changes clocks at
 * midnight, such as America/Santiago, has no 00:00 that night, so the answer is searched.
 */
export function startOfLocalDay(date: string, zone: string): Date {
  const fmt = formatter(zone);
  const [year, month, day] = date.split("-").map(Number);
  const wall = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  const on = (t: number) => wallClock(new Date(t), fmt).date >= date;
  const guess = wall - (wallClock(new Date(wall), fmt).wall - wall);
  if (on(guess) && !on(guess - 1)) return new Date(guess);
  let low = wall - DAY_MS;
  let high = wall + DAY_MS;
  while (high - low > 1) {
    const mid = Math.floor((low + high) / 2);
    if (on(mid)) high = mid;
    else low = mid;
  }
  return new Date(high);
}

/** The learner-local day an instant falls in. */
export function dayWindow(now: Date, zone: string): DayWindow {
  const date = localDate(now, zone);
  const [year, month, day] = date.split("-").map(Number);
  const following = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + 1))
    .toISOString()
    .slice(0, 10);
  return { date, start: startOfLocalDay(date, zone), end: startOfLocalDay(following, zone) };
}
