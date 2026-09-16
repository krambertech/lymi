import { SLIPPING_LAPSES, SLIPPING_REVIEWS } from "@lymi/core";
import { and, desc, eq, gte, isNull, lte, sql } from "@lymi/core/db";
import { schema } from "../db";
import type { ServiceContext } from "./context";
import { addDays, dateFormatter, daysBetween, type LocalDateFormatter } from "./days";
import { asked } from "./decks";
import { memberOf } from "./members";
import { waitingCardsSql } from "./sections";
import { lapsesSql, reviewCountSql, slippingHaving, slippingReviewsWhere } from "./slipping";

/**
 * Everything the Insights screen reads. One call, because the screen shows all of it at
 * once and four round trips to answer one question is four chances to look half-loaded.
 *
 * Days are bucketed in the learner's IANA timezone, which the client sends as `tz`.
 * Everything stored is UTC. A fixed minute offset would be wrong for any history that
 * crosses a daylight-saving change: applying today's +03:00 to a review taken at 21:30 UTC
 * last January files it on the wrong local day, which fabricates and breaks runs.
 */

/** A day the learner reviewed, or did not. Lit is the only thing said about it. */
export interface DayLight {
  /** Local YYYY-MM-DD. */
  date: string;
  lit: boolean;
}

export interface MonthTotal {
  /** Local YYYY-MM. */
  month: string;
  /** Days with at least one review. */
  lit: number;
  /** Days in the month that have happened. The current month counts up to today. */
  days: number;
}

export type Period = 30 | 90 | 0;

const DAY_MS = 86_400_000;

/** The Monday on or before a local date, so weeks line up with how a week is read. */
function weekOf(date: string): string {
  const dow = (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  return addDays(date, -dow);
}

/** One point on the recall line: a week, or a month when the period is everything. */
export interface RecallPoint {
  /** Local YYYY-MM-DD for the week's Monday, or YYYY-MM for a month. */
  at: string;
  passed: number;
  failed: number;
  rate: number;
}

/**
 * True retention: of the reviews that came back, how many were remembered. Only the first
 * review of a card on a day counts, because the second is the same card seen again after a
 * lapse and counting it twice punishes the day you did the work. Rating 1 is a fail; 2, 3
 * and 4 pass. New cards are excluded — a card seen for the first time was never retained.
 */
async function retention(
  { db, userId }: ServiceContext,
  since: Date | null,
  fmt: LocalDateFormatter,
  bucket: "week" | "month",
): Promise<{ passed: number; failed: number; series: RecallPoint[] }> {
  const rows = await db
    .select({
      cardId: schema.reviews.cardId,
      direction: schema.reviews.direction,
      rating: schema.reviews.rating,
      reviewedAt: schema.reviews.reviewedAt,
    })
    .from(schema.reviews)
    .where(
      and(
        eq(schema.reviews.userId, userId),
        // State 0 is New: the card had never been seen, so there was nothing to retain.
        sql`${schema.reviews.state} != 0`,
        since ? gte(schema.reviews.reviewedAt, since) : undefined,
      ),
    )
    .orderBy(schema.reviews.reviewedAt);

  const seen = new Set<string>();
  const buckets = new Map<string, { passed: number; failed: number }>();
  let passed = 0;
  let failed = 0;
  for (const r of rows) {
    const day = fmt.format(r.reviewedAt);
    const key = `${r.cardId}:${r.direction}:${day}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const at = bucket === "month" ? day.slice(0, 7) : weekOf(day);
    const b = buckets.get(at) ?? { passed: 0, failed: 0 };
    if (r.rating === 1) {
      failed++;
      b.failed++;
    } else {
      passed++;
      b.passed++;
    }
    buckets.set(at, b);
  }

  // Only buckets that actually graded something. A week with no reviews is a gap in the
  // line, not a zero: nobody forgot anything, they were away.
  const series = [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([at, b]) => ({
      at,
      passed: b.passed,
      failed: b.failed,
      rate: b.passed / (b.passed + b.failed),
    }));

  return { passed, failed, series };
}

/**
 * One entry per local day from the first review to today. Feeds both the thirty-day strip
 * and the month bars, so the two can never disagree about what a day was.
 */
async function lights(
  { db, userId }: ServiceContext,
  fmt: LocalDateFormatter,
): Promise<DayLight[]> {
  // Grouped by UTC day, keeping the first and last review of each. Reviews inside one UTC
  // day span 24 hours, so they can touch at most two local days, and those two are the
  // local dates of the earliest and latest review. That keeps the query bounded by days
  // rather than by reviews while still resolving each timestamp in the learner's zone.
  const rows = await db
    .select({
      first: sql<number>`min(${schema.reviews.reviewedAt})`,
      last: sql<number>`max(${schema.reviews.reviewedAt})`,
    })
    .from(schema.reviews)
    .where(eq(schema.reviews.userId, userId))
    .groupBy(sql`date(${schema.reviews.reviewedAt} / 1000, 'unixepoch')`);

  if (rows.length === 0) return [];

  const litDays = new Set<string>();
  for (const r of rows) {
    litDays.add(fmt.format(new Date(r.first)));
    litDays.add(fmt.format(new Date(r.last)));
  }

  const start = [...litDays].sort()[0];
  const today = fmt.format(new Date());
  if (!start) return [];

  const out: DayLight[] = [];
  for (let i = 0, n = daysBetween(start, today); i <= n; i++) {
    const date = addDays(start, i);
    out.push({ date, lit: litDays.has(date) });
  }
  return out;
}

/**
 * The thirty local days ending today, always thirty of them. Days before the first review
 * are unlit rather than absent: a strip scaled to the days that exist makes a learner's
 * first day the same picture as a perfect month.
 */
export function lastThirty(days: DayLight[], today: string): DayLight[] {
  const lit = new Set(days.filter((d) => d.lit).map((d) => d.date));
  return Array.from({ length: 30 }, (_, i) => {
    const date = addDays(today, i - 29);
    return { date, lit: lit.has(date) };
  });
}

/** The longest unbroken run of lit days anywhere in `days`. */
export function longestRun(days: DayLight[]): number {
  let best = 0;
  let run = 0;
  for (const d of days) {
    run = d.lit ? run + 1 : 0;
    if (run > best) best = run;
  }
  return best;
}

/**
 * Roll days up per month, newest month last. Only months that have days are included.
 *
 * The denominator is the calendar month's elapsed days, not the days since the first
 * review, so every bar is drawn against the same frame and a learner's first day cannot
 * fill its month. The current month counts to today.
 */
export function byMonth(days: DayLight[], today: string): MonthTotal[] {
  const out: MonthTotal[] = [];
  for (const d of days) {
    const month = d.date.slice(0, 7);
    const last = out.at(-1);
    if (last?.month === month) {
      if (d.lit) last.lit++;
    } else {
      out.push({ month, lit: d.lit ? 1 : 0, days: elapsedInMonth(month, today) });
    }
  }
  return out;
}

/** Days of `month` that have happened: all of them, or the day of the month today is. */
function elapsedInMonth(month: string, today: string): number {
  const [y, m] = month.split("-").map(Number);
  if (month === today.slice(0, 7)) return Number(today.slice(8, 10));
  // Day zero of the next month is the last day of this one.
  return new Date(Date.UTC(y ?? 1970, m ?? 1, 0)).getUTCDate();
}

/** Cards by FSRS state, plus the ones that have no state yet because nothing asked them. */
async function collection({ db, userId }: ServiceContext) {
  // A card is counted once, at the least advanced of the directions it is actually asked
  // in: it is not Known until every direction is. Hardcoding `recognition` here would file
  // every card in a production-only deck under New.
  const rows = await db.all<{
    total: number;
    new_cards: number;
    learning: number;
    known: number;
  }>(sql`
    select
      count(*) as total,
      sum(case when rank = 0 then 1 else 0 end) as new_cards,
      sum(case when rank = 1 then 1 else 0 end) as learning,
      sum(case when rank = 2 then 1 else 0 end) as known
    from (
      select
        cards.id,
        min(case card_states.state when 2 then 2 when 1 then 1 when 3 then 1 else 0 end) as rank
      from cards
      join decks on decks.id = cards.deck_id
      left join card_states
        on card_states.card_id = cards.id
        and card_states.user_id = ${userId}
        and ${asked}
      where ${memberOf(userId)}
        and cards.archived_at is null
        and decks.archived_at is null
      group by cards.id
    )
  `);

  const totals = rows[0];
  return {
    total: totals?.total ?? 0,
    new: totals?.new_cards ?? 0,
    learning: totals?.learning ?? 0,
    known: totals?.known ?? 0,
  };
}

/**
 * Cards due on each of the next seven local days, today first. Anything already overdue is
 * counted into today, because that is when the learner will meet it.
 */
async function forecast(ctx: ServiceContext, fmt: LocalDateFormatter) {
  const { db, userId } = ctx;
  const today = fmt.format(new Date());
  // Cards in a locked section wait, as they do in the draw, so the forecast never promises them.
  const waiting = await waitingCardsSql(ctx);
  // One extra day of slack so a due time late on day seven is not cut off by the zone.
  const horizon = new Date(Date.parse(`${addDays(today, 8)}T00:00:00Z`) + DAY_MS);

  const rows = await db
    .select({ due: schema.cardStates.due })
    .from(schema.cardStates)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .where(
      and(
        eq(schema.cardStates.userId, userId),
        memberOf(userId),
        isNull(schema.cards.archivedAt),
        isNull(schema.decks.archivedAt),
        asked,
        lte(schema.cardStates.due, horizon),
        waiting ? sql`not ${waiting}` : undefined,
      ),
    );

  const buckets = new Array<number>(7).fill(0);
  for (const r of rows) {
    // Anything already overdue counts into today, because that is when it will be met.
    const i = Math.max(0, daysBetween(today, fmt.format(r.due)));
    if (i < 7) buckets[i] = (buckets[i] ?? 0) + 1;
  }
  return buckets.map((count, i) => ({ date: addDays(today, i), count }));
}

/**
 * Cards that keep coming back. Anki suspends at eight lapses, which is both blunt and late
 * for a deck someone chose word by word. The rule is returned with the list so the screen
 * can say what put a card there.
 */
async function leeches({ db, userId }: ServiceContext, limit: number) {
  return db
    .select({
      id: schema.cards.id,
      deckId: schema.cards.deckId,
      term: schema.cards.term,
      meaning: schema.cards.meaning,
      language: schema.cards.language,
      lapses: lapsesSql,
      reviews: reviewCountSql,
    })
    .from(schema.reviews)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.reviews.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .leftJoin(schema.reviewUndos, eq(schema.reviewUndos.reviewId, schema.reviews.id))
    .where(slippingReviewsWhere(userId))
    .groupBy(schema.cards.id)
    .having(slippingHaving)
    .orderBy(desc(lapsesSql))
    .limit(limit);
}

/**
 * Everything Insights shows. `period` scopes retention only: the lights and the month bars
 * are always the whole history, because "since you started" is the only window that makes
 * sense for them and a five-column strip is not a picture.
 */
export async function insights(
  ctx: ServiceContext,
  opts: { period?: Period | undefined; zone?: string | undefined } = {},
) {
  const fmt = dateFormatter(opts.zone ?? "UTC");
  const period = opts.period ?? 30;
  const since = period === 0 ? null : new Date(Date.now() - period * DAY_MS);

  const [recall, days, cards, due, keepsComingBack] = await Promise.all([
    retention(ctx, since, fmt, period === 0 ? "month" : "week"),
    lights(ctx, fmt),
    collection(ctx),
    forecast(ctx, fmt),
    leeches(ctx, 10),
  ]);

  const graded = recall.passed + recall.failed;
  const today = fmt.format(new Date());
  const last30 = lastThirty(days, today);

  return {
    period,
    recall: {
      passed: recall.passed,
      failed: recall.failed,
      /** Null rather than zero when nothing has come back yet: no data is not 0%. */
      rate: graded > 0 ? recall.passed / graded : null,
      series: recall.series,
    },
    consistency: {
      days: last30,
      lit: last30.filter((d) => d.lit).length,
      longestRun: longestRun(days),
      litAllTime: days.filter((d) => d.lit).length,
      daysAllTime: days.length,
    },
    /** Twelve months at most. Older than that and the strip stops being readable. */
    months: byMonth(days, today).slice(-12),
    cards,
    forecast: due,
    leeches: {
      lapses: SLIPPING_LAPSES,
      reviews: SLIPPING_REVIEWS,
      cards: keepsComingBack,
    },
  };
}
