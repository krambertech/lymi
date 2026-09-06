import type { DeckInput } from "@lymi/core";
import { emptyState, expandDirections, newId, serializeState } from "@lymi/core";
import { and, asc, eq, isNull, sql } from "@lymi/core/db";
import { audit } from "../audit";
import { schema } from "../db";
import { notFound, type ServiceContext } from "./context";

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
      total: sql<number>`(select count(*) from cards where cards.deck_id = decks.id and cards.archived_at is null)`,
      due: sql<number>`(
        select count(*) from card_states
        join cards on cards.id = card_states.card_id
        where cards.deck_id = decks.id and cards.archived_at is null
          and card_states.due <= ${now} and ${asked}
      )`,
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

/**
 * Cards in a deck, newest first, each with the state for the direction the deck leads with.
 * A production-only deck shows its production state rather than an empty Status column.
 */
export async function listDeckCards({ db, userId }: ServiceContext, deckId: string) {
  return db
    .select({ card: schema.cards, state: schema.cardStates })
    .from(schema.cards)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.cards.deckId))
    .leftJoin(
      schema.cardStates,
      and(
        eq(schema.cardStates.cardId, schema.cards.id),
        sql`card_states.direction = case
          when coalesce(cards.directions, decks.directions) = 'production' then 'production'
          else 'recognition' end`,
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

export type DeckPatch = { [K in keyof DeckInput]?: DeckInput[K] | undefined };

export async function updateDeck(ctx: ServiceContext, id: string, patch: DeckPatch) {
  const { db, userId, actor } = ctx;
  const result = await db
    .update(schema.decks)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(schema.decks.id, id), eq(schema.decks.userId, userId)))
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
 * they would never come up. Give each card that follows the deck a new state, due now, for
 * every direction the deck asks. Nothing is removed: `asked` handles the other direction.
 */
async function openDirections(
  { db, userId }: ServiceContext,
  deckId: string,
  directions: NonNullable<DeckPatch["directions"]>,
) {
  const wanted = expandDirections(directions);
  const rows = await db
    .select({ cardId: schema.cards.id, direction: schema.cardStates.direction })
    .from(schema.cards)
    .leftJoin(schema.cardStates, eq(schema.cardStates.cardId, schema.cards.id))
    .where(
      and(
        eq(schema.cards.deckId, deckId),
        eq(schema.cards.userId, userId),
        isNull(schema.cards.archivedAt),
        isNull(schema.cards.directions),
      ),
    );

  const have = new Map<string, Set<string>>();
  for (const row of rows) {
    const set = have.get(row.cardId) ?? new Set<string>();
    if (row.direction) set.add(row.direction);
    have.set(row.cardId, set);
  }

  const now = new Date();
  const fsrs = serializeState(emptyState(now));
  const inserts = [];
  for (const [cardId, directionsHeld] of have) {
    for (const direction of wanted) {
      if (directionsHeld.has(direction)) continue;
      inserts.push(
        db.insert(schema.cardStates).values({
          id: newId(),
          cardId,
          userId,
          direction,
          due: now,
          state: 0,
          fsrs,
        }),
      );
    }
  }
  // D1 caps a batch, and a deck can hold hundreds of cards.
  for (let i = 0; i < inserts.length; i += 50) {
    const [first, ...rest] = inserts.slice(i, i + 50);
    if (first) await db.batch([first, ...rest]);
  }
}

/** Archive, never delete. The cards stay put; the deck leaves every list until restored. */
export async function archiveDeck(ctx: ServiceContext, id: string) {
  return setDeckArchived(ctx, id, new Date());
}
export async function restoreDeck(ctx: ServiceContext, id: string) {
  return setDeckArchived(ctx, id, null);
}

async function setDeckArchived(
  { db, userId, actor }: ServiceContext,
  id: string,
  archivedAt: Date | null,
) {
  const result = await db
    .update(schema.decks)
    .set({ archivedAt, updatedAt: new Date() })
    .where(and(eq(schema.decks.id, id), eq(schema.decks.userId, userId)))
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
