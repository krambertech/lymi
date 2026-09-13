import type { GradeInput, ReviewModeKey } from "@lymi/core";
import {
  deserializeState,
  legacyDirection,
  modeKey,
  modeOf,
  modesFromDirections,
  newId,
  preview,
  schedule,
  serializeState,
  stateDirection,
} from "@lymi/core";
import { and, asc, eq, gte, sql } from "@lymi/core/db";
import { audit } from "../audit";
import { schema } from "../db";
import { presentCards } from "./card-view";
import { notFound, type ServiceContext } from "./context";
import { dateFormatter } from "./days";
import { dueWhere } from "./due";
import { memberOf } from "./members";
import { stateMode } from "./modes";
import {
  type DayProgress,
  openDay,
  reviewZone,
  type StateBefore,
  settleDay,
  streak as streakSummary,
} from "./review-days";
import { getSettings } from "./settings";

/**
 * Select the oldest cards due now, then shuffle equal-priority ties. The scheduler preview
 * stays available to API clients even though the first-party review UI keeps it out of sight.
 */
export async function reviewQueue(
  { db, userId }: ServiceContext,
  opts: { deckId?: string | undefined; limit?: number | undefined } = {},
) {
  const limit = Math.min(opts.limit ?? 50, 200);
  const now = new Date();
  const where = dueWhere(userId, now, opts.deckId);

  const rows = await db
    .select({ card: schema.cards, state: schema.cardStates })
    .from(schema.cardStates)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .where(where)
    .orderBy(asc(schema.cardStates.due))
    .limit(limit * 2);

  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(distinct ${schema.cardStates.cardId})` })
    .from(schema.cardStates)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .where(where);

  const uniqueRows = oneDirectionPerCard(rows).slice(0, limit);
  const shuffledRows = shuffleEqualPriorityItems(uniqueRows, ({ state }) => state.due.getTime());
  const cards = await presentCards(
    db,
    shuffledRows.map(({ card }) => card),
  );
  const items = shuffledRows.map(({ state }, index) => {
    const next = preview(deserializeState(state.fsrs), now);
    const key = stateMode(state);
    const direction = legacyDirection(key);
    return {
      card: cards[index] as (typeof cards)[number],
      mode: modeOf(key),
      // An older app reads only `direction`, so a picture mode leaves it out rather than let
      // that app grade the text sibling.
      ...(direction ? { direction } : {}),
      stateId: state.id,
      fsrsState: state.state,
      next: {
        1: next[1].toISOString(),
        2: next[2].toISOString(),
        3: next[3].toISOString(),
        4: next[4].toISOString(),
      },
    };
  });

  return { total, items };
}

/** Keep sibling directions out of a session so seeing one cannot reveal the other. */
export function oneDirectionPerCard<T extends { card: { id: string } }>(rows: T[]): T[] {
  const seen = new Set<string>();
  return rows.filter(({ card }) => {
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });
}

/** Shuffle ties without letting a lower-priority card jump the queue. */
export function shuffleEqualPriorityItems<T>(
  items: readonly T[],
  priorityOf: (item: T) => number,
  random = Math.random,
): T[] {
  const shuffled: T[] = [];
  for (let start = 0; start < items.length; ) {
    const priority = priorityOf(items[start] as T);
    let end = start + 1;
    while (end < items.length && priorityOf(items[end] as T) === priority) end += 1;
    const group = items.slice(start, end);
    for (let i = group.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      [group[i], group[j]] = [group[j] as T, group[i] as T];
    }
    shuffled.push(...group);
    start = end;
  }
  return shuffled;
}

/**
 * Apply one grade. Only the learner grades; integrations never reach this function.
 * Idempotent enough for offline replay: a review older than the state's last review is a no-op.
 * Every accepted grade is one attempt toward the learner-local day it happened on, fixed now.
 */
export async function gradeCard(ctx: ServiceContext, input: GradeInput) {
  const { db, userId, actor } = ctx;
  const { cardId, rating } = input;
  const key = gradedMode(input);
  const direction = stateDirection(key);
  const reviewedAt = input.reviewedAt ?? new Date();

  const [row] = await db
    .select({ state: schema.cardStates })
    .from(schema.cardStates)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .where(
      and(
        eq(schema.cardStates.cardId, cardId),
        eq(schema.cardStates.userId, userId),
        eq(schema.cardStates.direction, direction),
        memberOf(userId),
      ),
    );
  if (!row) throw notFound("Card");
  const state = row.state;

  const zone = await reviewZone(ctx, input.timezone);
  const settings = await getSettings(ctx);
  const date = dateFormatter(zone).format(reviewedAt);

  if (state.lastReview && state.lastReview.getTime() >= reviewedAt.getTime()) {
    const [existing] = await db
      .select()
      .from(schema.reviewDays)
      .where(and(eq(schema.reviewDays.userId, userId), eq(schema.reviewDays.date, date)));
    const day: DayProgress = existing
      ? await settleDay(ctx, existing, "check")
      : { date, attempts: 0, goal: settings.dailyGoal, outcome: "open" };
    return {
      ok: true as const,
      duplicate: true as const,
      due: state.due.toISOString(),
      state: state.state,
      reviewId: null,
      day,
    };
  }

  const result = schedule(deserializeState(state.fsrs), rating, reviewedAt);
  const reviewDay = await openDay(ctx, date, zone, settings.dailyGoal);
  const reviewId = newId();
  const before: StateBefore = {
    fsrs: state.fsrs,
    due: state.due.getTime(),
    state: state.state,
    lastReview: state.lastReview?.getTime() ?? null,
  };

  await db.batch([
    db
      .update(schema.cardStates)
      .set({
        due: result.card.due,
        state: result.card.state,
        fsrs: serializeState(result.card),
        lastReview: reviewedAt,
        updatedAt: new Date(),
      })
      .where(eq(schema.cardStates.id, state.id)),
    db.insert(schema.reviews).values({
      id: reviewId,
      userId,
      cardId,
      cardStateId: state.id,
      direction,
      mode: key,
      rating,
      state: result.log.state,
      elapsedDays: result.log.elapsedDays,
      scheduledDays: result.log.scheduledDays,
      stabilityAfter: result.card.stability,
      difficultyAfter: result.card.difficulty,
      reviewedAt,
      source: "web",
      reviewDayId: reviewDay.id,
      stateBefore: JSON.stringify(before),
    }),
  ]);
  await audit(db, {
    userId,
    actor,
    action: "grade",
    entity: "review",
    entityId: cardId,
    payload: { rating, direction, mode: key },
  });

  return {
    ok: true as const,
    duplicate: false as const,
    due: result.card.due.toISOString(),
    state: result.card.state,
    reviewId,
    day: await settleDay(ctx, reviewDay, "grade"),
  };
}

/** The mode a grade names. A legacy direction maps to the text mode it always meant. */
function gradedMode(input: GradeInput): ReviewModeKey {
  if (input.mode) return modeKey(input.mode);
  const [key] = modesFromDirections(input.direction ?? "recognition");
  return key as ReviewModeKey;
}

/**
 * Reviews per day for the last `days` days in the learner's timezone, oldest first. Feeds
 * the seven lights. `tzOffset` is minutes, as Date.getTimezoneOffset reports it.
 */
export async function reviewHistory(
  ctx: ServiceContext,
  opts: { days?: number | undefined; tzOffset?: number | undefined } = {},
) {
  const { db, userId } = ctx;
  const days = Math.min(Math.max(opts.days ?? 7, 1), 90);
  const tz = opts.tzOffset ?? 0;
  const now = new Date();
  const localNow = new Date(now.getTime() - tz * 60_000);
  const startLocal = Date.UTC(
    localNow.getUTCFullYear(),
    localNow.getUTCMonth(),
    localNow.getUTCDate() - (days - 1),
  );
  const start = new Date(startLocal + tz * 60_000);

  const rows = await db
    .select({ reviewedAt: schema.reviews.reviewedAt })
    .from(schema.reviews)
    .where(and(eq(schema.reviews.userId, userId), gte(schema.reviews.reviewedAt, start)));

  const counts = new Array<number>(days).fill(0);
  for (const r of rows) {
    const i = Math.floor((r.reviewedAt.getTime() - tz * 60_000 - startLocal) / 86_400_000);
    if (i >= 0 && i < days) counts[i] = (counts[i] ?? 0) + 1;
  }

  // The run is the goal streak, the same one the streak endpoint reports.
  const { current: streak } = await streakSummary(ctx);
  return { days: counts, streak };
}
