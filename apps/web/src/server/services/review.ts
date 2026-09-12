import type { GradeInput } from "@lymi/core";
import { deserializeState, newId, preview, schedule, serializeState } from "@lymi/core";
import { and, asc, eq, gte, isNull, lte, sql } from "@lymi/core/db";
import { audit } from "../audit";
import { schema } from "../db";
import { notFound, type ServiceContext } from "./context";
import { asked } from "./decks";
import { memberOf } from "./members";

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
  // An archived deck leaves every list, review included; its cards keep their progress. A
  // deck the learner left keeps their states too, and `memberOf` keeps them out of the queue.
  const where = and(
    eq(schema.cardStates.userId, userId),
    memberOf(userId),
    lte(schema.cardStates.due, now),
    isNull(schema.cards.archivedAt),
    isNull(schema.decks.archivedAt),
    asked,
    opts.deckId ? eq(schema.cards.deckId, opts.deckId) : undefined,
  );

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
  const items = shuffledRows.map(({ card, state }) => {
    const next = preview(deserializeState(state.fsrs), now);
    return {
      card,
      direction: state.direction,
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
 */
export async function gradeCard({ db, userId, actor }: ServiceContext, input: GradeInput) {
  const { cardId, direction, rating } = input;
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

  if (state.lastReview && state.lastReview.getTime() >= reviewedAt.getTime()) {
    return {
      ok: true as const,
      duplicate: true as const,
      due: state.due.toISOString(),
      state: state.state,
    };
  }

  const result = schedule(deserializeState(state.fsrs), rating, reviewedAt);

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
      id: newId(),
      userId,
      cardId,
      cardStateId: state.id,
      direction,
      rating,
      state: result.log.state,
      elapsedDays: result.log.elapsedDays,
      scheduledDays: result.log.scheduledDays,
      stabilityAfter: result.card.stability,
      difficultyAfter: result.card.difficulty,
      reviewedAt,
      source: "web",
    }),
  ]);
  await audit(db, {
    userId,
    actor,
    action: "grade",
    entity: "review",
    entityId: cardId,
    payload: { rating, direction },
  });

  return {
    ok: true as const,
    duplicate: false as const,
    due: result.card.due.toISOString(),
    state: result.card.state,
  };
}

/**
 * Reviews per day for the last `days` days in the learner's timezone, oldest first. Feeds
 * the seven lights. `tzOffset` is minutes, as Date.getTimezoneOffset reports it.
 */
export async function reviewHistory(
  { db, userId }: ServiceContext,
  opts: { days?: number | undefined; tzOffset?: number | undefined } = {},
) {
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

  // The current run, exact, with no window: a streak counted from `counts` alone can never be
  // longer than `days`. Grouped by UTC day and resolved to the learner's zone the way
  // `stats.ts` does, so the query is bounded by days rather than by reviews. Reviews inside
  // one UTC day touch at most two local days, the local dates of its first and last review.
  const grouped = await db
    .select({
      first: sql<number>`min(${schema.reviews.reviewedAt})`,
      last: sql<number>`max(${schema.reviews.reviewedAt})`,
    })
    .from(schema.reviews)
    .where(eq(schema.reviews.userId, userId))
    .groupBy(sql`date(${schema.reviews.reviewedAt} / 1000, 'unixepoch')`);
  const localDay = (ms: number) => Math.floor((ms - tz * 60_000) / 86_400_000);
  const lit = new Set<number>();
  for (const g of grouped) {
    lit.add(localDay(g.first));
    lit.add(localDay(g.last));
  }
  const today = localDay(now.getTime());
  // Today is still open until it ends, so an unreviewed morning keeps yesterday's run.
  let day = lit.has(today) ? today : today - 1;
  let streak = 0;
  for (; lit.has(day); day -= 1) streak += 1;

  return { days: counts, streak };
}
