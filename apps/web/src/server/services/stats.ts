import { and, desc, eq, gte, isNull, lte, sql } from "@lymi/core/db";
import { schema } from "../db";
import type { ServiceContext } from "./context";
import { asked } from "./decks";

/**
 * Everything the Insights screen reads. One call, because the screen shows all of it at
 * once and four round trips to answer one question is four chances to look half-loaded.
 *
 * Days are bucketed in the learner's timezone, which the client sends as `tzOffset` in
 * minutes the way `Date.getTimezoneOffset` reports it. Everything stored is UTC.
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

/** Local midnight for `date` shifted into the learner's day, as a UTC instant. */
function localDayStart(at: number, tzOffset: number): number {
  const local = new Date(at - tzOffset * 60_000);
  return Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
}

function localKey(dayStart: number): string {
  return new Date(dayStart).toISOString().slice(0, 10);
}

/** The Monday on or before `dayStart`, so weeks line up with how a week is read. */
function weekStart(dayStart: number): number {
  const dow = (new Date(dayStart).getUTCDay() + 6) % 7;
  return dayStart - dow * DAY_MS;
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
  tzOffset: number,
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
    const dayStart = localDayStart(r.reviewedAt.getTime(), tzOffset);
    const day = localKey(dayStart);
    const key = `${r.cardId}:${r.direction}:${day}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const at = bucket === "month" ? day.slice(0, 7) : localKey(weekStart(dayStart));
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
async function lights({ db, userId }: ServiceContext, tzOffset: number): Promise<DayLight[]> {
  const [first] = await db
    .select({ at: schema.reviews.reviewedAt })
    .from(schema.reviews)
    .where(eq(schema.reviews.userId, userId))
    .orderBy(schema.reviews.reviewedAt)
    .limit(1);
  if (!first) return [];

  // Grouped in SQL rather than pulled row by row: this is the only query here whose cost
  // grows with every review ever made, and all it needs is the distinct days.
  const rows = await db
    .select({
      day: sql<string>`date((${schema.reviews.reviewedAt} - ${tzOffset * 60_000}) / 1000, 'unixepoch')`,
    })
    .from(schema.reviews)
    .where(eq(schema.reviews.userId, userId))
    .groupBy(sql`1`);

  const litDays = new Set(rows.map((r) => r.day));

  const start = localDayStart(first.at.getTime(), tzOffset);
  const today = localDayStart(Date.now(), tzOffset);
  const out: DayLight[] = [];
  for (let d = start; d <= today; d += DAY_MS) {
    const date = localKey(d);
    out.push({ date, lit: litDays.has(date) });
  }
  return out;
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

/** Roll days up per month, newest month last. Only months that have days are included. */
export function byMonth(days: DayLight[]): MonthTotal[] {
  const out: MonthTotal[] = [];
  for (const d of days) {
    const month = d.date.slice(0, 7);
    const last = out.at(-1);
    if (last?.month === month) {
      last.days++;
      if (d.lit) last.lit++;
    } else {
      out.push({ month, lit: d.lit ? 1 : 0, days: 1 });
    }
  }
  return out;
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
        and ${asked}
      where cards.user_id = ${userId}
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
async function forecast({ db, userId }: ServiceContext, tzOffset: number) {
  const today = localDayStart(Date.now(), tzOffset);
  const horizon = new Date(today + 7 * DAY_MS + tzOffset * 60_000);

  const rows = await db
    .select({ due: schema.cardStates.due })
    .from(schema.cardStates)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .where(
      and(
        eq(schema.cardStates.userId, userId),
        isNull(schema.cards.archivedAt),
        isNull(schema.decks.archivedAt),
        asked,
        lte(schema.cardStates.due, horizon),
      ),
    );

  const buckets = new Array<number>(7).fill(0);
  for (const r of rows) {
    const day = localDayStart(r.due.getTime(), tzOffset);
    const i = Math.max(0, Math.round((day - today) / DAY_MS));
    if (i < 7) buckets[i] = (buckets[i] ?? 0) + 1;
  }
  return buckets.map((count, i) => ({ date: localKey(today + i * DAY_MS), count }));
}

/** Four lapses is the threshold; six reviews is the guard so a young card cannot qualify. */
export const LEECH_LAPSES = 4;
export const LEECH_REVIEWS = 6;

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
      lapses: sql<number>`sum(case when ${schema.reviews.rating} = 1 then 1 else 0 end)`,
      reviews: sql<number>`count(${schema.reviews.id})`,
    })
    .from(schema.reviews)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.reviews.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .where(
      and(
        eq(schema.reviews.userId, userId),
        isNull(schema.cards.archivedAt),
        isNull(schema.decks.archivedAt),
      ),
    )
    .groupBy(schema.cards.id)
    .having(
      sql`sum(case when ${schema.reviews.rating} = 1 then 1 else 0 end) >= ${LEECH_LAPSES} and count(${schema.reviews.id}) >= ${LEECH_REVIEWS}`,
    )
    .orderBy(desc(sql`sum(case when ${schema.reviews.rating} = 1 then 1 else 0 end)`))
    .limit(limit);
}

/**
 * Everything Insights shows. `period` scopes retention only: the lights and the month bars
 * are always the whole history, because "since you started" is the only window that makes
 * sense for them and a five-column strip is not a picture.
 */
export async function insights(
  ctx: ServiceContext,
  opts: { period?: Period | undefined; tzOffset?: number | undefined } = {},
) {
  const tzOffset = opts.tzOffset ?? 0;
  const period = opts.period ?? 30;
  const since = period === 0 ? null : new Date(Date.now() - period * DAY_MS);

  const [recall, days, cards, due, keepsComingBack] = await Promise.all([
    retention(ctx, since, tzOffset, period === 0 ? "month" : "week"),
    lights(ctx, tzOffset),
    collection(ctx),
    forecast(ctx, tzOffset),
    leeches(ctx, 10),
  ]);

  const graded = recall.passed + recall.failed;
  const last30 = days.slice(-30);

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
    months: byMonth(days).slice(-12),
    cards,
    forecast: due,
    leeches: {
      lapses: LEECH_LAPSES,
      reviews: LEECH_REVIEWS,
      cards: keepsComingBack,
    },
  };
}
