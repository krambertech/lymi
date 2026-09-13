import { and, eq, isNull, lte, sql } from "@lymi/core/db";
import { schema } from "../db";
import type { ServiceContext } from "./context";
import { asked } from "./decks";
import { memberOf } from "./members";

/** The card states that are eligible for review now. The queue and every "nothing left" check share it. */
export function dueWhere(userId: string, now: Date, deckId?: string | undefined) {
  // An archived deck leaves every list, review included; its cards keep their progress. A
  // deck the learner left keeps their states too, and `memberOf` keeps them out of the queue.
  return and(
    eq(schema.cardStates.userId, userId),
    memberOf(userId),
    lte(schema.cardStates.due, now),
    isNull(schema.cards.archivedAt),
    isNull(schema.decks.archivedAt),
    asked,
    deckId ? eq(schema.cards.deckId, deckId) : undefined,
  );
}

/** Distinct cards with a direction eligible now, across every deck. */
export async function dueCount({ db, userId }: ServiceContext, now = new Date()): Promise<number> {
  const [{ total } = { total: 0 }] = await db
    .select({ total: sql<number>`count(distinct ${schema.cardStates.cardId})` })
    .from(schema.cardStates)
    .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .where(dueWhere(userId, now));
  return total;
}
