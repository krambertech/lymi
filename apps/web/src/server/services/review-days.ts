import type { DeviceTimezoneInput, ReviewTimezoneInput } from "@lymi/core";
import { newId } from "@lymi/core";
import { and, eq, isNotNull, isNull, ne, sql } from "@lymi/core/db";
import type { ReviewDay } from "@lymi/core/schema";
import { audit } from "../audit";
import { schema } from "../db";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { addDays, dateFormatter, daysBetween } from "./days";
import { drawableCount } from "./draw";
import { ensureSettings, getSettings } from "./settings";

/**
 * The daily review goal and the streak are one mechanic: a learner-local day counts when its
 * goal's attempts land, or when every eligible review was done below it. The accepted rules are
 * in docs/proposals/daily-review-goal-and-rolling-queue.md.
 */

export type Outcome = ReviewDay["outcome"];

export interface DayProgress {
  date: string;
  attempts: number;
  goal: number;
  outcome: Outcome;
}

const satisfies = (outcome: Outcome) => outcome === "goal_met" || outcome === "exhausted";

/**
 * The zone that decides where a day begins. The first zone a client reports becomes the
 * automatic one; after that only a visible page (`reportDeviceTimezone`) or Settings moves it,
 * so an offline replay or a background tab never shifts the boundary.
 */
export async function reviewZone(ctx: ServiceContext, reported?: string | undefined) {
  const settings = await getSettings(ctx);
  if (settings.reviewTimezone) return settings.reviewTimezone;
  if (!reported || !isZone(reported)) return "UTC";
  // An integration's zone is a guess about where the learner is; it reads with it but never stores it.
  if (ctx.actor !== "user") return reported;
  await ensureSettings(ctx);
  await ctx.db
    .update(schema.userSettings)
    .set({ reviewTimezone: reported, reviewTimezoneUpdatedAt: new Date(), updatedAt: new Date() })
    .where(
      and(eq(schema.userSettings.userId, ctx.userId), isNull(schema.userSettings.reviewTimezone)),
    );
  return (await getSettings(ctx)).reviewTimezone ?? reported;
}

function isZone(zone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone }).format();
    return true;
  } catch {
    return false;
  }
}

/** A visible page's device zone. Moves the day boundary only while the mode is automatic. */
export async function reportDeviceTimezone(ctx: ServiceContext, input: DeviceTimezoneInput) {
  await ensureSettings(ctx);
  await ctx.db
    .update(schema.userSettings)
    .set({
      reviewTimezone: input.timezone,
      reviewTimezoneUpdatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.userSettings.userId, ctx.userId),
        eq(schema.userSettings.reviewTimezoneMode, "automatic"),
      ),
    );
  return getSettings(ctx);
}

/** Settings: keep one zone, or go back to following the device. */
export async function setReviewTimezone(ctx: ServiceContext, input: ReviewTimezoneInput) {
  await ensureSettings(ctx);
  await ctx.db
    .update(schema.userSettings)
    .set(
      input.mode === "manual"
        ? { reviewTimezoneMode: "manual", reviewTimezone: input.timezone, updatedAt: new Date() }
        : { reviewTimezoneMode: "automatic", updatedAt: new Date() },
    )
    .where(eq(schema.userSettings.userId, ctx.userId));
  return getSettings(ctx);
}

/** The day's row, created with the goal and zone it will be measured against. */
export async function openDay(
  ctx: ServiceContext,
  date: string,
  zone: string,
  goal: number,
): Promise<ReviewDay> {
  await ctx.db
    .insert(schema.reviewDays)
    .values({ id: newId(), userId: ctx.userId, date, goal, timezone: zone })
    .onConflictDoNothing();
  const [day] = await ctx.db
    .select()
    .from(schema.reviewDays)
    .where(and(eq(schema.reviewDays.userId, ctx.userId), eq(schema.reviewDays.date, date)));
  if (!day) throw new Error("review_days insert did not land");
  return day;
}

/** Accepted attempts on a day: its reviews less the ones taken back. */
async function attemptsOn(ctx: ServiceContext, dayId: string): Promise<number> {
  const [{ n } = { n: 0 }] = await ctx.db
    .select({ n: sql<number>`count(*)` })
    .from(schema.reviews)
    .leftJoin(schema.reviewUndos, eq(schema.reviewUndos.reviewId, schema.reviews.id))
    .where(and(eq(schema.reviews.reviewDayId, dayId), isNull(schema.reviewUndos.reviewId)));
  return n;
}

/**
 * Work out where a day stands after something changed it. A grade or a lower goal can only
 * complete a day; Undo can reopen one, back to "nothing due" if that was confirmed first.
 * Exhaustion is judged only for today, because only today's queue is the day's queue.
 */
export async function settleDay(
  ctx: ServiceContext,
  day: ReviewDay,
  change: "grade" | "undo" | "goal" | "check",
  now = new Date(),
): Promise<DayProgress> {
  const attempts = await attemptsOn(ctx, day.id);
  const isToday = day.date === dateFormatter(day.timezone).format(now);
  const empty =
    isToday &&
    attempts > 0 &&
    attempts < day.goal &&
    (await drawableCount(ctx, { now, zone: day.timezone })) === 0;

  let outcome: Outcome;
  if (attempts >= day.goal) outcome = "goal_met";
  else if (empty) outcome = "exhausted";
  else if (change === "undo") outcome = day.zeroDueConfirmedAt ? "nothing_due" : "open";
  else outcome = day.outcome;

  if (outcome !== day.outcome) {
    await ctx.db
      .update(schema.reviewDays)
      .set({ outcome, updatedAt: now })
      .where(eq(schema.reviewDays.id, day.id));
  }
  return { date: day.date, attempts, goal: day.goal, outcome };
}

/**
 * Opening Lymi settles today. With nothing eligible and no attempts yet, the day is confirmed
 * as nothing due, which protects the streak without adding to it; with attempts and nothing
 * left, it is exhausted. A visit is what protects a zero-due day: without one it is missed.
 */
export async function checkToday(ctx: ServiceContext, reported?: string | undefined) {
  const zone = await reviewZone(ctx, reported);
  const settings = await getSettings(ctx);
  const now = new Date();
  const date = dateFormatter(zone).format(now);
  const due = await drawableCount(ctx, { now, zone });
  const [existing] = await ctx.db
    .select()
    .from(schema.reviewDays)
    .where(and(eq(schema.reviewDays.userId, ctx.userId), eq(schema.reviewDays.date, date)));

  if (due > 0 && !existing) {
    return { date, attempts: 0, goal: settings.dailyGoal, outcome: "open" as const };
  }
  const day = existing ?? (await openDay(ctx, date, zone, settings.dailyGoal));
  if (due === 0 && (await attemptsOn(ctx, day.id)) === 0 && day.outcome === "open") {
    await ctx.db
      .update(schema.reviewDays)
      .set({ zeroDueConfirmedAt: now, outcome: "nothing_due", updatedAt: now })
      .where(eq(schema.reviewDays.id, day.id));
    return { date, attempts: 0, goal: day.goal, outcome: "nothing_due" as const };
  }
  return settleDay(ctx, day, "check", now);
}

/**
 * A new goal applies to today while today is still open, and to every day after. A day that is
 * already complete stays complete: continuing or changing the goal never takes it back.
 */
export async function applyGoalToToday(ctx: ServiceContext, goal: number) {
  const settings = await getSettings(ctx);
  const zone = settings.reviewTimezone ?? "UTC";
  const date = dateFormatter(zone).format(new Date());
  const [day] = await ctx.db
    .select()
    .from(schema.reviewDays)
    .where(and(eq(schema.reviewDays.userId, ctx.userId), eq(schema.reviewDays.date, date)));
  if (!day || satisfies(day.outcome) || day.goal === goal) return;
  await ctx.db
    .update(schema.reviewDays)
    .set({ goal, updatedAt: new Date() })
    .where(eq(schema.reviewDays.id, day.id));
  await settleDay(ctx, { ...day, goal }, "goal");
}

/** What a grade replaced, so Undo can restore it exactly. */
export interface StateBefore {
  fsrs: string;
  due: number;
  state: number;
  lastReview: number | null;
}

/**
 * The undo write, as one transaction in which each statement re-checks that the grade is still
 * the card's latest. A grade that lands after the caller read the state therefore survives: no
 * undo row is written and the state is left as that newer grade set it.
 */
export async function restoreIfLatest(
  ctx: ServiceContext,
  u: { reviewId: string; stateId: string; reviewedAt: Date; before: StateBefore; now: Date },
) {
  await ctx.db.batch([
    ctx.db
      .insert(schema.reviewUndos)
      .select(
        ctx.db
          .select({
            reviewId: sql<string>`${u.reviewId}`.as("review_id"),
            userId: sql<string>`${ctx.userId}`.as("user_id"),
            undoneAt: sql<number>`${u.now.getTime()}`.as("undone_at"),
          })
          .from(schema.cardStates)
          .where(
            and(
              eq(schema.cardStates.id, u.stateId),
              eq(schema.cardStates.lastReview, u.reviewedAt),
            ),
          ),
      )
      .onConflictDoNothing(),
    ctx.db
      .update(schema.cardStates)
      .set({
        fsrs: u.before.fsrs,
        due: new Date(u.before.due),
        state: u.before.state,
        lastReview: u.before.lastReview === null ? null : new Date(u.before.lastReview),
        updatedAt: u.now,
      })
      .where(
        and(
          eq(schema.cardStates.id, u.stateId),
          eq(schema.cardStates.lastReview, u.reviewedAt),
          sql`exists (select 1 from review_undos where review_id = ${u.reviewId} and undone_at = ${u.now.getTime()})`,
        ),
      ),
  ]);
}

/**
 * Take one attempt back. Only the latest grade of a card's direction can be undone, because
 * restoring an older state would erase the grades after it. The review row stays; the undo
 * removes it from the day's count and the day settles again.
 */
export async function undoReview(ctx: ServiceContext, reviewId: string): Promise<DayProgress> {
  const [review] = await ctx.db
    .select({
      review: schema.reviews,
      undone: schema.reviewUndos.reviewId,
      state: schema.cardStates,
    })
    .from(schema.reviews)
    .innerJoin(schema.cardStates, eq(schema.cardStates.id, schema.reviews.cardStateId))
    .leftJoin(schema.reviewUndos, eq(schema.reviewUndos.reviewId, schema.reviews.id))
    .where(and(eq(schema.reviews.id, reviewId), eq(schema.reviews.userId, ctx.userId)));
  if (!review) throw notFound("Review");

  const dayId = review.review.reviewDayId;
  const [day] = dayId
    ? await ctx.db.select().from(schema.reviewDays).where(eq(schema.reviewDays.id, dayId))
    : [];

  if (!review.undone) {
    const before = review.review.stateBefore
      ? (JSON.parse(review.review.stateBefore) as StateBefore)
      : null;
    const latest = review.state.lastReview?.getTime() === review.review.reviewedAt.getTime();
    if (!before || !latest) {
      throw new ServiceError("conflict", "Only the latest grade of a card can be undone.");
    }
    const now = new Date();
    await restoreIfLatest(ctx, {
      reviewId,
      stateId: review.state.id,
      reviewedAt: review.review.reviewedAt,
      before,
      now,
    });
    const [undo] = await ctx.db
      .select({ undoneAt: schema.reviewUndos.undoneAt })
      .from(schema.reviewUndos)
      .where(eq(schema.reviewUndos.reviewId, reviewId));
    if (!undo) {
      throw new ServiceError("conflict", "Only the latest grade of a card can be undone.");
    }
    if (undo.undoneAt.getTime() === now.getTime()) {
      await audit(ctx.db, {
        userId: ctx.userId,
        actor: ctx.actor,
        action: "undo_grade",
        entity: "review",
        entityId: review.review.cardId,
        payload: { reviewId, direction: review.review.direction },
      });
    }
  }

  if (!day) {
    const settings = await getSettings(ctx);
    const date = dateFormatter(settings.reviewTimezone ?? "UTC").format(new Date());
    return { date, attempts: 0, goal: settings.dailyGoal, outcome: "open" };
  }
  return settleDay(ctx, day, "undo");
}

/** A day on the streak calendar. */
export interface StreakDay {
  date: string;
  attempts: number;
  /** The goal the day was measured against. Null for a day from before goals. */
  goal: number | null;
  satisfied: boolean;
  nothingDue: boolean;
}

/**
 * The current run and the longest. Today adds once satisfied and is otherwise skipped, so an
 * unfinished morning shows yesterday's run; a nothing-due day keeps a run without adding to it;
 * any other day breaks it.
 */
export function summariseStreak(days: StreakDay[], today: string) {
  const byDate = new Map(days.map((d) => [d.date, d]));
  const keeps = (d: StreakDay | undefined) => !!d && (d.satisfied || d.nothingDue);

  let current = 0;
  let date = today;
  if (!byDate.get(today)?.satisfied) date = addDays(today, -1);
  for (; keeps(byDate.get(date)); date = addDays(date, -1)) {
    if (byDate.get(date)?.satisfied) current++;
  }

  let longest = 0;
  let run = 0;
  let previous: string | undefined;
  for (const d of [...days].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!keeps(d)) {
      run = 0;
      previous = undefined;
      continue;
    }
    if (previous && daysBetween(previous, d.date) !== 1) run = 0;
    if (d.satisfied) run++;
    previous = d.date;
    if (run > longest) longest = run;
  }

  return {
    current,
    longest,
    reviewedDays: days.filter((d) => d.attempts > 0).length,
  };
}

/**
 * Everything the streak shows: today against its goal, the runs, and every day that had an
 * attempt or a nothing-due confirmation. Pre-goal reviews have no day row and keep their old
 * meaning, so history from before goals still reads as the streak it was.
 */
export async function streak(ctx: ServiceContext, opts: { zone?: string | undefined } = {}) {
  const zone = await reviewZone(ctx, opts.zone);
  const fmt = dateFormatter(zone);
  const settings = await getSettings(ctx);

  const [rows, counted, legacy] = await Promise.all([
    ctx.db.select().from(schema.reviewDays).where(eq(schema.reviewDays.userId, ctx.userId)),
    ctx.db
      .select({ dayId: schema.reviews.reviewDayId, n: sql<number>`count(*)` })
      .from(schema.reviews)
      .leftJoin(schema.reviewUndos, eq(schema.reviewUndos.reviewId, schema.reviews.id))
      .where(
        and(
          eq(schema.reviews.userId, ctx.userId),
          isNotNull(schema.reviews.reviewDayId),
          isNull(schema.reviewUndos.reviewId),
        ),
      )
      .groupBy(schema.reviews.reviewDayId),
    // Quarter hours: every zone's offset is a whole number of them, so no bucket straddles a
    // local midnight and the query stays bounded by sessions rather than by reviews.
    ctx.db
      .select({
        at: sql<number>`min(${schema.reviews.reviewedAt})`,
        n: sql<number>`count(*)`,
      })
      .from(schema.reviews)
      .where(
        and(
          eq(schema.reviews.userId, ctx.userId),
          isNull(schema.reviews.reviewDayId),
          // An imported recall has no day either, but it was never measured against a goal.
          ne(schema.reviews.source, "import"),
        ),
      )
      .groupBy(sql`${schema.reviews.reviewedAt} / 900000`),
  ]);

  const attemptsByDay = new Map(counted.map((c) => [c.dayId, c.n]));
  const days = new Map<string, StreakDay>();
  for (const r of legacy) {
    const date = fmt.format(new Date(r.at));
    const d = days.get(date) ?? {
      date,
      attempts: 0,
      goal: null,
      satisfied: true,
      nothingDue: false,
    };
    d.attempts += r.n;
    days.set(date, d);
  }
  for (const row of rows) {
    const d = days.get(row.date);
    const attempts = attemptsByDay.get(row.id) ?? 0;
    days.set(row.date, {
      date: row.date,
      attempts: attempts + (d?.attempts ?? 0),
      goal: row.goal,
      satisfied: satisfies(row.outcome) || !!d?.satisfied,
      nothingDue: row.outcome === "nothing_due",
    });
  }

  const today = fmt.format(new Date());
  const todayRow = rows.find((r) => r.date === today);
  const list = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));
  return {
    today: {
      date: today,
      attempts: todayRow ? (attemptsByDay.get(todayRow.id) ?? 0) : 0,
      goal: todayRow?.goal ?? settings.dailyGoal,
      outcome: todayRow?.outcome ?? ("open" as const),
    },
    goal: settings.dailyGoal,
    ...summariseStreak(list, today),
    days: list,
  };
}
