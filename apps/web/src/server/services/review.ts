import type { GradeInput } from "@lymi/core";
import { deserializeState, newId, preview, schedule, serializeState } from "@lymi/core";
import { and, asc, eq, gte, isNull, lte, sql } from "@lymi/core/db";
import { audit } from "../audit";
import { schema } from "../db";
import { notFound, type ServiceContext } from "./context";

/**
 * Cards due now, oldest due first, with the four possible next intervals so the
 * grade buttons can show "Good · 6 d" without a round trip.
 */
export async function reviewQueue(
  { db, userId }: ServiceContext,
  opts: { deckId?: string | undefined; limit?: number | undefined } = {},
) {
  const limit = Math.min(opts.limit ?? 50, 200);
  const now = new Date();
  const where = and(
    eq(schema.cardStates.userId, userId),
    lte(schema.cardStates.due, now),
    isNull(schema.cards.archivedAt),
    opts.deckId ? eq(schema.cards.deckId, opts.deckId) : undefined,
  );

  const rows = await db
    .select({ card: schema.cards, state: schema.cardStates })
    .from(schema.cardStates)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
    .where(where)
    .orderBy(asc(schema.cardStates.due))
    .limit(limit);

  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(schema.cardStates)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
    .where(where);

  const items = rows.map(({ card, state }) => {
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

/**
 * Apply one grade. Only the learner grades; integrations never reach this function.
 * Idempotent enough for offline replay: a review older than the state's last review is a no-op.
 */
export async function gradeCard({ db, userId, actor }: ServiceContext, input: GradeInput) {
  const { cardId, direction, rating } = input;
  const reviewedAt = input.reviewedAt ?? new Date();

  const [state] = await db
    .select()
    .from(schema.cardStates)
    .where(
      and(
        eq(schema.cardStates.cardId, cardId),
        eq(schema.cardStates.userId, userId),
        eq(schema.cardStates.direction, direction),
      ),
    );
  if (!state) throw notFound("Card");

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
  return { days: counts };
}
