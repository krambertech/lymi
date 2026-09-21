import { SLIPPING_LAPSES, SLIPPING_REVIEWS } from "@lymi/core";
import { and, eq, isNull, sql } from "@lymi/core/db";
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

export const slippingHaving = sql`${lapsesSql} >= ${SLIPPING_LAPSES} and ${reviewCountSql} >= ${SLIPPING_REVIEWS}`;

/** Cards that keep slipping, as a subquery a caller joins, so the aggregate runs once per query. */
export function slippingCardIds({ db, userId }: Pick<ServiceContext, "db" | "userId">) {
  return db
    .select({ id: schema.reviews.cardId })
    .from(schema.reviews)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.reviews.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .leftJoin(schema.reviewUndos, eq(schema.reviewUndos.reviewId, schema.reviews.id))
    .where(slippingReviewsWhere(userId))
    .groupBy(schema.reviews.cardId)
    .having(slippingHaving);
}
