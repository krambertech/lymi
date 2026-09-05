import type { CardInput, CardPatch } from "@lymi/core";
import { emptyState, expandDirections, newId, serializeState } from "@lymi/core";
import { and, eq } from "@lymi/core/db";
import { audit } from "../audit";
import { schema } from "../db";
import { notFound, type ServiceContext } from "./context";

/**
 * Create a card and its scheduling state. Both directions get a state row so the review
 * queue can serve either; production is opt-in per deck later, so only recognition is due now.
 */
export async function createCard(ctx: ServiceContext, input: CardInput) {
  const { db, userId, actor } = ctx;
  const [deck] = await db
    .select({
      id: schema.decks.id,
      defaultLanguage: schema.decks.defaultLanguage,
      directions: schema.decks.directions,
    })
    .from(schema.decks)
    .where(and(eq(schema.decks.id, input.deckId), eq(schema.decks.userId, userId)));
  if (!deck) throw notFound("Deck");

  const id = newId();
  const now = new Date();
  const language = input.language === undefined ? deck.defaultLanguage : input.language;
  const directions = expandDirections(input.directions ?? deck.directions);

  await db.batch([
    db.insert(schema.cards).values({
      id,
      userId,
      deckId: input.deckId,
      term: input.term,
      meaning: input.meaning ?? null,
      pronunciation: input.pronunciation ?? null,
      example: input.example ?? null,
      notes: input.notes ?? null,
      language,
      tags: input.tags ?? [],
      source: input.source ?? null,
      directions: input.directions ?? null,
      meaningSource: input.meaningSource ?? (input.meaning ? "manual" : null),
      exampleSource: input.exampleSource ?? (input.example ? "manual" : null),
      createdBy: actor,
    }),
    ...directions.map((direction) =>
      db.insert(schema.cardStates).values({
        id: newId(),
        cardId: id,
        userId,
        direction,
        due: now,
        state: 0,
        fsrs: serializeState(emptyState(now)),
      }),
    ),
  ]);
  await audit(db, {
    userId,
    actor,
    action: "create",
    entity: "card",
    entityId: id,
    payload: input,
  });
  return getCard(ctx, id);
}

export async function getCard({ db, userId }: ServiceContext, id: string) {
  const [card] = await db
    .select()
    .from(schema.cards)
    .where(and(eq(schema.cards.id, id), eq(schema.cards.userId, userId)));
  if (!card) throw notFound("Card");
  return card;
}

export async function updateCard(ctx: ServiceContext, id: string, patch: CardPatch) {
  const { db, userId, actor } = ctx;
  await getCard(ctx, id);
  await db
    .update(schema.cards)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.cards.id, id));
  await audit(db, {
    userId,
    actor,
    action: "update",
    entity: "card",
    entityId: id,
    payload: patch,
  });
  return getCard(ctx, id);
}

/** Archive, never delete. Undo is `restoreCard`. */
export function archiveCard(ctx: ServiceContext, id: string) {
  return setArchived(ctx, id, new Date());
}

export function restoreCard(ctx: ServiceContext, id: string) {
  return setArchived(ctx, id, null);
}

async function setArchived(
  { db, userId, actor }: ServiceContext,
  id: string,
  archivedAt: Date | null,
) {
  const result = await db
    .update(schema.cards)
    .set({ archivedAt, updatedAt: new Date() })
    .where(and(eq(schema.cards.id, id), eq(schema.cards.userId, userId)))
    .returning({ id: schema.cards.id });
  if (result.length === 0) throw notFound("Card");
  await audit(db, {
    userId,
    actor,
    action: archivedAt ? "archive" : "restore",
    entity: "card",
    entityId: id,
  });
}
