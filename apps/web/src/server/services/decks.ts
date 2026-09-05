import type { DeckInput } from "@lymi/core";
import { newId } from "@lymi/core";
import { and, asc, eq, isNull, sql } from "@lymi/core/db";
import { audit } from "../audit";
import { schema } from "../db";
import { notFound, type ServiceContext } from "./context";

/** All active decks with counts of due and total cards, in the learner's order. */
export async function listDecks({ db, userId }: ServiceContext) {
  const now = Date.now();
  return db
    .select({
      id: schema.decks.id,
      name: schema.decks.name,
      description: schema.decks.description,
      defaultLanguage: schema.decks.defaultLanguage,
      directions: schema.decks.directions,
      position: schema.decks.position,
      total: sql<number>`(select count(*) from cards c where c.deck_id = decks.id and c.archived_at is null)`,
      due: sql<number>`(select count(*) from card_states s join cards c on c.id = s.card_id where c.deck_id = decks.id and c.archived_at is null and s.due <= ${now})`,
    })
    .from(schema.decks)
    .where(and(eq(schema.decks.userId, userId), isNull(schema.decks.archivedAt)))
    .orderBy(asc(schema.decks.position), asc(schema.decks.createdAt));
}

export async function createDeck(ctx: ServiceContext, input: DeckInput) {
  const { db, userId, actor } = ctx;
  const id = newId();
  await db.insert(schema.decks).values({
    id,
    userId,
    name: input.name,
    description: input.description ?? null,
    defaultLanguage: input.defaultLanguage ?? null,
    directions: input.directions ?? "recognition",
  });
  await audit(db, {
    userId,
    actor,
    action: "create",
    entity: "deck",
    entityId: id,
    payload: input,
  });
  return getDeck(ctx, id);
}

export async function getDeck({ db, userId }: ServiceContext, id: string) {
  const [deck] = await db
    .select()
    .from(schema.decks)
    .where(and(eq(schema.decks.id, id), eq(schema.decks.userId, userId)));
  if (!deck) throw notFound("Deck");
  return deck;
}

/** Cards in a deck with their recognition-direction state, newest first. */
export async function listDeckCards({ db, userId }: ServiceContext, deckId: string) {
  return db
    .select({ card: schema.cards, state: schema.cardStates })
    .from(schema.cards)
    .leftJoin(
      schema.cardStates,
      and(
        eq(schema.cardStates.cardId, schema.cards.id),
        eq(schema.cardStates.direction, "recognition"),
      ),
    )
    .where(
      and(
        eq(schema.cards.deckId, deckId),
        eq(schema.cards.userId, userId),
        isNull(schema.cards.archivedAt),
      ),
    )
    .orderBy(sql`${schema.cards.createdAt} desc`);
}
