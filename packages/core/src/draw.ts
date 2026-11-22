import { State } from "ts-fsrs";
import type { Rating } from "./types";

export const NEW_CARD_SLOT_EVERY = 5;
export const OLDEST_UNSEEN_SLOT_EVERY = 4;
export const RETURN_GAP = 20;
export const RETURN_JITTER = 2;
export const CARRY_OVER_EVERY = 3;
export const REVIEW_ODDS_POWER = 4;
export const UNSEEN_HALF_LIFE_DAYS = 7;
export const IMPORTANT_ODDS = 4;

const DAY_MS = 86_400_000;
const MIN_WEIGHT = 1e-6;

export type ModeKey = string;

export interface DrawMode {
  mode: ModeKey;
  state: State;
  due: Date;
  retrievability: number;
  added: Date;
  hasCue: boolean;
}

export interface DrawCard {
  cardId: string;
  deckId: string;
  important?: boolean | undefined;
  modes: DrawMode[];
}

export interface DrawLogEntry {
  cardId: string;
  mode: ModeKey;
  rating: Rating;
  stateBefore: State;
  at: Date;
}

export interface DayWindow {
  date: string;
  start: Date;
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

export const drawKey = (cardId: string, mode: ModeKey) => `${cardId} ${mode}`;

export function missed(rating: Rating, stateBefore: State): boolean {
  return rating === 1 || (rating === 2 && stateBefore !== State.Review);
}

export const owesReturn = (rating: Rating) => rating === 1;

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
  misses: number;
  missedAt: number;
}

function pendingReturns(log: readonly DrawLogEntry[], rule: ReturnRule): PendingReturn[] {
  const pending = new Map<string, PendingReturn>();
  log.forEach((entry, index) => {
    const k = drawKey(entry.cardId, entry.mode);
    if (!rule.owes(entry.rating, entry.stateBefore)) {
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

function unit(date: string, cardId: string, mode: ModeKey, salt = ""): number {
  return (hash32(`${date}|${cardId}|${mode}|${salt}`) + 0.5) / 4_294_967_296;
}

export function returnGap(
  date: string,
  cardId: string,
  mode: ModeKey,
  misses = 1,
  rule: ReturnRule = RETURN_RULE,
): number {
  const base = rule.gaps[Math.min(misses, rule.gaps.length) - 1] as number;
  const jitter = Math.floor(unit(date, cardId, mode, `return${misses}`) * (2 * rule.jitter + 1));
  return base + jitter - rule.jitter;
}

export function weightedKey(date: string, cardId: string, mode: ModeKey, weight: number): number {
  return Math.log(unit(date, cardId, mode)) / Math.max(MIN_WEIGHT, weight);
}

export interface Candidate {
  cardId: string;
  important?: boolean | undefined;
  mode: DrawMode;
}

export interface ReturnRule {
  gaps: readonly number[];
  jitter: number;
  owes: (rating: Rating, stateBefore: State) => boolean;
  early: boolean;
}

export const RETURN_RULE: ReturnRule = {
  gaps: [RETURN_GAP],
  jitter: RETURN_JITTER,
  owes: owesReturn,
  early: false,
};

export interface DrawPolicy {
  reviewKey: (c: Candidate, day: DayWindow) => number;
  unseenKey: (c: Candidate, day: DayWindow) => number;
  oldestSlotEvery: number;
  returns: ReturnRule;
}

export function weightedPolicy(importantOdds: number): DrawPolicy {
  const odds = (c: Candidate) => (c.important ? importantOdds : 1);
  return {
    reviewKey: (c, day) =>
      weightedKey(
        day.date,
        c.cardId,
        c.mode.mode,
        c.mode.retrievability ** REVIEW_ODDS_POWER * odds(c),
      ),
    unseenKey: (c, day) => {
      const ageDays = Math.max(0, day.start.getTime() - c.mode.added.getTime()) / DAY_MS;
      const recency = 0.5 ** (ageDays / UNSEEN_HALF_LIFE_DAYS);
      return weightedKey(day.date, c.cardId, c.mode.mode, recency * odds(c));
    },
    oldestSlotEvery: OLDEST_UNSEEN_SLOT_EVERY,
    returns: RETURN_RULE,
  };
}

export const DRAW_POLICY: DrawPolicy = weightedPolicy(IMPORTANT_ODDS);

const reachedReview = (mode: DrawMode | undefined) =>
  mode !== undefined && (mode.state === State.Review || mode.state === State.Relearning);

interface Plan {
  day: DayWindow;
  modes: Map<string, Candidate>;
  carries: Candidate[];
  reviews: Candidate[];
  recent: Candidate[];
  oldest: Candidate[];
  oldestSlotEvery: number;
  returns: ReturnRule;
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
      const candidate = { cardId: card.cardId, important: card.important, mode };
      if (mode.state === State.New) {
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
    returns: policy.returns,
  };
}

interface Returning extends PendingReturn {
  since: number;
  gap: number;
  reached: boolean;
}

function returning(p: Plan, log: readonly DrawLogEntry[]): Returning[] {
  return pendingReturns(log, p.returns).flatMap((pending) => {
    if (pending.misses > p.returns.gaps.length) return [];
    if (!p.modes.has(drawKey(pending.cardId, pending.mode))) return [];
    const since = log.length - pending.missedAt - 1;
    const gap = returnGap(p.day.date, pending.cardId, pending.mode, pending.misses, p.returns);
    return [{ ...pending, since, gap, reached: since >= gap }];
  });
}

const pick = (c: Candidate, kind: DrawKind): Drawn => ({
  cardId: c.cardId,
  mode: c.mode.mode,
  kind,
});

function next(p: Plan, log: readonly DrawLogEntry[]): Drawn | null {
  const returns = returning(p, log);
  const reached = returns.find((r) => r.reached);
  if (reached) return { cardId: reached.cardId, mode: reached.mode, kind: "return" };

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
  if (!p.returns.early) return null;

  const last = log[log.length - 1]?.cardId;
  const earliest = returns.find((r) => r.cardId !== last);
  return earliest ? { cardId: earliest.cardId, mode: earliest.mode, kind: "return" } : null;
}

export function draw(
  cards: readonly DrawCard[],
  log: readonly DrawLogEntry[],
  day: DayWindow,
  scope: DrawScope = {},
): Drawn | null {
  return next(plan(cards, day, scope, DRAW_POLICY), log);
}

export function drawer(
  cards: readonly DrawCard[],
  day: DayWindow,
  scope: DrawScope = {},
  policy: DrawPolicy = DRAW_POLICY,
): (log: readonly DrawLogEntry[]) => Drawn | null {
  const p = plan(cards, day, scope, policy);
  return (log) => next(p, log);
}

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

export function drawableCount(
  cards: readonly DrawCard[],
  log: readonly DrawLogEntry[],
  day: DayWindow,
  scope: DrawScope = {},
  beyond = 0,
): number {
  const p = plan(cards, day, scope, DRAW_POLICY);
  if (!next(p, log)) return 0;
  const reviewed = new Set(log.map((entry) => entry.cardId));
  const ids = new Set<string>();
  for (const group of [p.carries, p.reviews, p.recent]) {
    for (const c of group) if (!reviewed.has(c.cardId)) ids.add(c.cardId);
  }
  let ahead = ids.size + beyond;
  const waiting = returning(p, log).sort((a, b) => a.gap - a.since - (b.gap - b.since));
  for (const r of waiting) {
    if (r.since + ahead < r.gap) break;
    ids.add(r.cardId);
    ahead++;
  }
  return ids.size;
}

export function forgottenToday(log: readonly DrawLogEntry[]): { cardId: string; mode: ModeKey }[] {
  const latest = new Map<string, DrawLogEntry>();
  for (const entry of log) latest.set(drawKey(entry.cardId, entry.mode), entry);
  return [...latest.values()]
    .filter((entry) => entry.rating === 1)
    .map(({ cardId, mode }) => ({ cardId, mode }));
}

export const ROUNDS = ["forgotten", "new", "slipping"] as const;
export type Round = (typeof ROUNDS)[number];

export interface RoundScope extends DrawScope {
  round: Round;
  slipping?: ReadonlySet<string> | undefined;
}

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
    case "new": {
      const untouched = new Set(
        inScope
          .filter((card) => card.modes.every((m) => m.state === State.New))
          .map((card) => card.cardId),
      );
      for (const c of plan(cards, day, scope, DRAW_POLICY).oldest) {
        if (untouched.has(c.cardId) && !reviewed.has(c.cardId)) {
          push(c.cardId, c.mode.mode, "unseen");
        }
      }
      break;
    }
    case "slipping": {
      const weakest = inScope.flatMap((card) => {
        if (!scope.slipping?.has(card.cardId) || reviewed.has(card.cardId)) return [];
        const [mode] = card.modes
          .filter((m) => m.hasCue && m.state !== State.New)
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

export function localDate(instant: Date, zone: string): string {
  return wallClock(instant, formatter(zone)).date;
}

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

export function dayWindow(now: Date, zone: string): DayWindow {
  const date = localDate(now, zone);
  const [year, month, day] = date.split("-").map(Number);
  const following = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, (day ?? 1) + 1))
    .toISOString()
    .slice(0, 10);
  return { date, start: startOfLocalDay(date, zone), end: startOfLocalDay(following, zone) };
}
