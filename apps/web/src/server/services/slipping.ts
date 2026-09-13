import { and, eq, inArray, isNull, sql } from "@lymi/core/db";
import { schema } from "../db";
import type { ServiceContext } from "./context";
import { memberOf } from "./members";

/** Four lapses is the threshold; six reviews is the guard so a young card cannot qualify. */
export const LEECH_LAPSES = 4;
export const LEECH_REVIEWS = 6;

export const lapsesSql = sql<number>`sum(case when ${schema.reviews.rating} = 1 then 1 else 0 end)`;
export const reviewCountSql = sql<number>`count(${schema.reviews.id})`;

/**
 * Cards that keep slipping: active cards forgotten at least `LEECH_LAPSES` times in at least
 * `LEECH_REVIEWS` reviews. A subquery, so a long list never meets D1's bound-parameter limit.
 */
export function slippingCardIds({ db, userId }: Pick<ServiceContext, "db" | "userId">) {
  return db
    .select({ id: schema.reviews.cardId })
    .from(schema.reviews)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.reviews.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .where(
      and(
        eq(schema.reviews.userId, userId),
        memberOf(userId),
        isNull(schema.cards.archivedAt),
        isNull(schema.decks.archivedAt),
      ),
    )
    .groupBy(schema.reviews.cardId)
    .having(sql`${lapsesSql} >= ${LEECH_LAPSES} and ${reviewCountSql} >= ${LEECH_REVIEWS}`);
}

/** The states of slipping cards, whatever their due, for a round that reviews them early. */
export const slippingStates = (ctx: Pick<ServiceContext, "db" | "userId">) =>
  inArray(schema.cardStates.cardId, slippingCardIds(ctx));
