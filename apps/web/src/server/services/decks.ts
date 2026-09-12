import type { DeckInput } from "@lymi/core";
import { expandDirections, newId } from "@lymi/core";
import { and, asc, eq, isNull, sql } from "@lymi/core/db";
import { audit } from "../audit";
import { schema } from "../db";
import { notFound, type ServiceContext } from "./context";
import { deckAccess, fillStates, learnersOf, memberOf, ownedDeck } from "./members";

/**
 * A card is asked the way its own `directions` says, or the deck's when it has none. A state
 * row for a direction the card is no longer asked in stays put and stops being counted, so
 * turning a direction off is a setting rather than a migration: turn it back on and the
 * progress is still there. Every due count and the review queue share this predicate.
 */
export const asked = sql`(
  coalesce(cards.directions, decks.directions) = 'both'
  or card_states.direction = coalesce(cards.directions, decks.directions)
)`;

/** All active decks the learner can see, with their own due count, in the learner's order. */
export async function listDecks({ db, userId }: ServiceContext) {
  const now = Date.now();
  const rows = await db
    .select({
      id: schema.decks.id,
      name: schema.decks.name,
      description: schema.decks.description,
      defaultLanguage: schema.decks.defaultLanguage,
      directions: schema.decks.directions,
      position: schema.decks.position,
      total: sql<number>`(select count(*) from cards where cards.deck_id = decks.id and cards.archived_at is null)`,
      due: sql<number>`(
        select count(*) from card_states
        join cards on cards.id = card_states.card_id
        where cards.deck_id = decks.id and cards.archived_at is null
          and card_states.user_id = ${userId}
          and card_states.due <= ${now} and ${asked}
      )`,
      ownerId: schema.decks.userId,
      ownerName: schema.user.name,
      memberRole: schema.deckMembers.role,
    })
    .from(schema.decks)
    .innerJoin(schema.user, eq(schema.user.id, schema.decks.userId))
    .leftJoin(
      schema.deckMembers,
      and(
        eq(schema.deckMembers.deckId, schema.decks.id),
        eq(schema.deckMembers.userId, userId),
        isNull(schema.deckMembers.removedAt),
      ),
    )
    .where(and(memberOf(userId), isNull(schema.decks.archivedAt)))
    .orderBy(asc(schema.decks.position), asc(schema.decks.createdAt));
  return rows.map(({ ownerId, ownerName, memberRole, ...deck }) => ({
    ...deck,
    role: ownerId === userId ? ("owner" as const) : (memberRole ?? ("learner" as const)),
    owner: { id: ownerId, name: ownerName },
  }));
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

/** A deck the learner can see, with their role in it and who owns it. */
export async function getDeck(ctx: ServiceContext, id: string) {
  return deckAccess(ctx, id);
}

/**
 * Cards in a deck, newest first, each with the caller's state for the direction the deck
 * leads with. A production-only deck shows its production state rather than an empty
 * Status column.
 */
export async function listDeckCards(ctx: ServiceContext, deckId: string) {
  const { db, userId } = ctx;
  await deckAccess(ctx, deckId);
  return db
    .select({ card: schema.cards, state: schema.cardStates })
    .from(schema.cards)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .leftJoin(
      schema.cardStates,
      and(
        eq(schema.cardStates.cardId, schema.cards.id),
        eq(schema.cardStates.userId, userId),
        sql`card_states.direction = case
          when coalesce(cards.directions, decks.directions) = 'production' then 'production'
          else 'recognition' end`,
      ),
    )
    .where(and(eq(schema.cards.deckId, deckId), isNull(schema.cards.archivedAt)))
    .orderBy(sql`${schema.cards.createdAt} desc`);
}

export type DeckPatch = { [K in keyof DeckInput]?: DeckInput[K] | undefined };

export async function updateDeck(ctx: ServiceContext, id: string, patch: DeckPatch) {
  const { db, userId, actor } = ctx;
  await ownedDeck(ctx, id);
  const result = await db
    .update(schema.decks)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.decks.id, id))
    .returning({ id: schema.decks.id });
  if (result.length === 0) throw notFound("Deck");
  if (patch.directions) await openDirections(ctx, id, patch.directions);
  await audit(db, {
    userId,
    actor,
    action: "update",
    entity: "deck",
    entityId: id,
    payload: patch,
  });
  return getDeck(ctx, id);
}

/**
 * A direction the deck did not ask before has no state rows on the cards already in it, so
 * they would never come up. Give every learner of the deck a new state, due now, for each
 * card that follows the deck and each direction it now asks. Nothing is removed: `asked`
 * handles the other direction.
 */
async function openDirections(
  { db }: ServiceContext,
  deckId: string,
  directions: NonNullable<DeckPatch["directions"]>,
) {
  const wanted = expandDirections(directions);
  const cards = await db
    .select({ id: schema.cards.id })
    .from(schema.cards)
    .where(
      and(
        eq(schema.cards.deckId, deckId),
        isNull(schema.cards.archivedAt),
        isNull(schema.cards.directions),
      ),
    );
  await fillStates(
    { db },
    cards.map((card) => ({ cardId: card.id, directions: wanted })),
    await learnersOf({ db }, deckId),
  );
}

/** Archive, never delete. The cards stay put; the deck leaves every list until restored. */
export async function archiveDeck(ctx: ServiceContext, id: string) {
  return setDeckArchived(ctx, id, new Date());
}
export async function restoreDeck(ctx: ServiceContext, id: string) {
  return setDeckArchived(ctx, id, null);
}

async function setDeckArchived(ctx: ServiceContext, id: string, archivedAt: Date | null) {
  const { db, userId, actor } = ctx;
  await ownedDeck(ctx, id);
  const result = await db
    .update(schema.decks)
    .set({ archivedAt, updatedAt: new Date() })
    .where(eq(schema.decks.id, id))
    .returning({ id: schema.decks.id });
  if (result.length === 0) throw notFound("Deck");
  await audit(db, {
    userId,
    actor,
    action: archivedAt ? "archive" : "restore",
    entity: "deck",
    entityId: id,
    payload: {},
  });
  return { ok: true as const };
}
