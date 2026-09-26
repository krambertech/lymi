import { type DayWindow, SLIPPING_FORGOTTEN_DAYS, SLIPPING_RECENT_DAYS } from "@lymi/core";
import { and, eq, isNull, lt, lte, sql } from "@lymi/core/db";
import { schema } from "../db";
import type { ServiceContext } from "./context";
import { memberOf } from "./members";

export const lapsesSql = sql<number>`sum(case when ${schema.reviews.rating} = 1 then 1 else 0 end)`;
export const reviewCountSql = sql<number>`count(${schema.reviews.id})`;

/** The learner's own accepted grades. The caller left-joins `review_undos` on the review. */
export const countedReviewsWhere = (userId: string) =>
  and(eq(schema.reviews.userId, userId), isNull(schema.reviewUndos.reviewId));

/** Accepted reviews of active cards: an undone grade never makes a card slip. */
export const slippingReviewsWhere = (userId: string) =>
  and(
    countedReviewsWhere(userId),
    memberOf(userId),
    isNull(schema.cards.archivedAt),
    isNull(schema.decks.archivedAt),
  );

const DAY_MS = 86_400_000;

/**
 * Often-forgotten cards, as a subquery a caller joins or awaits: the first grade of the day was
 * Forgot on enough of the card's latest review days before today, so returns within a day never
 * count twice and a card that sticks leaves the group. ADR 0024.
 */
export function slippingCardIds(
  { db, userId }: Pick<ServiceContext, "db" | "userId">,
  day: DayWindow,
) {
  // Days are counted back from local midnight in 24-hour steps, an hour off across a DST change.
  const ago = sql<number>`cast((${day.start.getTime() - 1} - ${schema.reviews.reviewedAt}) / ${DAY_MS} as integer)`;
  const firsts = db
    .select({
      cardId: sql<string>`${schema.reviews.cardId}`.as("card_id"),
      rating: sql<number>`${schema.reviews.rating}`.as("rating"),
      ago: ago.as("ago"),
      nth: sql<number>`row_number() over (partition by ${schema.reviews.cardId}, ${ago} order by ${schema.reviews.reviewedAt}, ${schema.reviews.id})`.as(
        "nth",
      ),
    })
    .from(schema.reviews)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.reviews.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .leftJoin(schema.reviewUndos, eq(schema.reviewUndos.reviewId, schema.reviews.id))
    .where(and(slippingReviewsWhere(userId), lt(schema.reviews.reviewedAt, day.start)))
    .as("firsts");
  const recent = db
    .select({
      cardId: sql<string>`${firsts.cardId}`.as("card_id"),
      rating: sql<number>`${firsts.rating}`.as("rating"),
      recency:
        sql<number>`row_number() over (partition by ${firsts.cardId} order by ${firsts.ago})`.as(
          "recency",
        ),
    })
    .from(firsts)
    .where(eq(firsts.nth, 1))
    .as("recent");
  return db
    .select({ id: sql<string>`${recent.cardId}`.as("slipping_card_id") })
    .from(recent)
    .where(lte(recent.recency, SLIPPING_RECENT_DAYS))
    .groupBy(recent.cardId)
    .having(
      sql`sum(case when ${recent.rating} = 1 then 1 else 0 end) >= ${SLIPPING_FORGOTTEN_DAYS}`,
    );
}
