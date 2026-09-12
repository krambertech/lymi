import type { Direction, MemberRole } from "@lymi/core";
import { emptyState, expandDirections, newId, serializeState } from "@lymi/core";
import { and, eq, inArray, isNull, sql } from "@lymi/core/db";
import { audit } from "../audit";
import { schema } from "../db";
import { notFound, type ServiceContext, ServiceError } from "./context";

/**
 * Decks the learner may see: their own, plus every deck they are an active member of.
 * Every read that used to filter on `decks.user_id` filters on this instead. Writes to a
 * deck's content keep the owner filter. ADR 0011.
 */
export function memberOf(userId: string) {
  return sql`(
    decks.user_id = ${userId}
    or exists (
      select 1 from deck_members
      where deck_members.deck_id = decks.id
        and deck_members.user_id = ${userId}
        and deck_members.removed_at is null
    )
  )`;
}

/** Who owns a deck and what the caller may do in it, as every deck response carries it. */
export interface Membership {
  role: MemberRole;
  owner: { id: string; name: string };
}

/** The deck with the caller's role, or not found when they cannot see it. */
export async function deckAccess({ db, userId }: ServiceContext, deckId: string) {
  const [row] = await db
    .select({
      deck: schema.decks,
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
    .where(and(eq(schema.decks.id, deckId), memberOf(userId)));
  if (!row) throw notFound("Deck");
  const role: MemberRole = row.deck.userId === userId ? "owner" : (row.memberRole ?? "learner");
  return {
    ...row.deck,
    role,
    owner: { id: row.deck.userId, name: row.ownerName },
  };
}

/** The deck, or forbidden when the caller can see it but does not own it. */
export async function ownedDeck(ctx: ServiceContext, deckId: string) {
  const deck = await deckAccess(ctx, deckId);
  if (deck.role !== "owner") {
    throw new ServiceError("forbidden", "Only the deck's owner can change it");
  }
  return deck;
}

/** Every learner who studies the deck: the owner first, then each active member. */
export async function learnersOf(
  { db }: Pick<ServiceContext, "db">,
  deckId: string,
): Promise<string[]> {
  const [deck] = await db
    .select({ userId: schema.decks.userId })
    .from(schema.decks)
    .where(eq(schema.decks.id, deckId));
  if (!deck) throw notFound("Deck");
  const members = await db
    .select({ userId: schema.deckMembers.userId })
    .from(schema.deckMembers)
    .where(and(eq(schema.deckMembers.deckId, deckId), isNull(schema.deckMembers.removedAt)));
  return [deck.userId, ...members.map((m) => m.userId)];
}

/**
 * Give each learner a state, due now, for every card and direction they are missing. This
 * is the one way states come into being after a card exists: a new member, a direction
 * turned on, a card moved or overridden. Nothing is removed; `asked` handles the rest.
 */
export async function fillStates(
  { db }: Pick<ServiceContext, "db">,
  wanted: { cardId: string; directions: readonly Direction[] }[],
  learners: readonly string[],
) {
  if (wanted.length === 0 || learners.length === 0) return;
  const cardIds = wanted.map((w) => w.cardId);
  const have = new Set<string>();
  for (let i = 0; i < cardIds.length; i += 90) {
    const rows = await db
      .select({
        cardId: schema.cardStates.cardId,
        userId: schema.cardStates.userId,
        direction: schema.cardStates.direction,
      })
      .from(schema.cardStates)
      .where(
        and(
          inArray(schema.cardStates.cardId, cardIds.slice(i, i + 90)),
          inArray(schema.cardStates.userId, [...learners]),
        ),
      );
    for (const row of rows) have.add(`${row.cardId}:${row.userId}:${row.direction}`);
  }

  const now = new Date();
  const fsrs = serializeState(emptyState(now));
  const inserts = [];
  for (const { cardId, directions } of wanted) {
    for (const userId of learners) {
      for (const direction of directions) {
        if (have.has(`${cardId}:${userId}:${direction}`)) continue;
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
  }
  // D1 caps a batch, and a deck can hold hundreds of cards.
  for (let i = 0; i < inserts.length; i += 50) {
    const [first, ...rest] = inserts.slice(i, i + 50);
    if (first) await db.batch([first, ...rest]);
  }
}

/** The cards in a deck that follow the deck's directions, with what they are asked. */
async function askedInDeck({ db }: Pick<ServiceContext, "db">, deckId: string) {
  const [deck] = await db
    .select({ directions: schema.decks.directions })
    .from(schema.decks)
    .where(eq(schema.decks.id, deckId));
  if (!deck) throw notFound("Deck");
  const cards = await db
    .select({ id: schema.cards.id, directions: schema.cards.directions })
    .from(schema.cards)
    .where(and(eq(schema.cards.deckId, deckId), isNull(schema.cards.archivedAt)));
  return cards.map((card) => ({
    cardId: card.id,
    directions: expandDirections(card.directions ?? deck.directions),
  }));
}

/**
 * Become a member of a deck. Idempotent: joining a deck already joined changes nothing. A
 * member the owner removed is refused until a named invitation clears the block. The join
 * lands in the owner's Activity, because a new reader of their deck is worth seeing.
 */
export async function join(
  { db, userId, actor }: ServiceContext,
  deckId: string,
  opts: { invitationId?: string | undefined } = {},
) {
  const [deck] = await db
    .select({ id: schema.decks.id, userId: schema.decks.userId })
    .from(schema.decks)
    .where(and(eq(schema.decks.id, deckId), isNull(schema.decks.archivedAt)));
  if (!deck) throw notFound("Deck");
  if (deck.userId === userId) return { ok: true as const, role: "owner" as const };

  const [existing] = await db
    .select()
    .from(schema.deckMembers)
    .where(and(eq(schema.deckMembers.deckId, deckId), eq(schema.deckMembers.userId, userId)));
  if (existing && !existing.removedAt) return { ok: true as const, role: existing.role };
  if (existing?.removedBy === "owner") {
    throw new ServiceError("forbidden", "The owner removed you from this deck");
  }

  const now = new Date();
  if (existing) {
    await db
      .update(schema.deckMembers)
      .set({
        removedAt: null,
        removedBy: null,
        joinedAt: now,
        invitationId: opts.invitationId ?? existing.invitationId,
        updatedAt: now,
      })
      .where(eq(schema.deckMembers.id, existing.id));
  } else {
    await db.insert(schema.deckMembers).values({
      id: newId(),
      deckId,
      userId,
      role: "learner",
      invitationId: opts.invitationId ?? null,
      joinedAt: now,
    });
  }
  await fillStates({ db }, await askedInDeck({ db }, deckId), [userId]);
  await audit(db, {
    userId: deck.userId,
    actor,
    action: "join",
    entity: "deck",
    entityId: deckId,
    payload: { memberId: userId },
  });
  return { ok: true as const, role: "learner" as const };
}

/** Stop studying a deck. The states and reviews stay, so rejoining resumes. */
export async function leave({ db, userId, actor }: ServiceContext, deckId: string) {
  const result = await db
    .update(schema.deckMembers)
    .set({ removedAt: new Date(), removedBy: "self", updatedAt: new Date() })
    .where(
      and(
        eq(schema.deckMembers.deckId, deckId),
        eq(schema.deckMembers.userId, userId),
        isNull(schema.deckMembers.removedAt),
      ),
    )
    .returning({ id: schema.deckMembers.id });
  if (result.length === 0) throw notFound("Deck");
  const [deck] = await db
    .select({ userId: schema.decks.userId })
    .from(schema.decks)
    .where(eq(schema.decks.id, deckId));
  if (deck) {
    await audit(db, {
      userId: deck.userId,
      actor,
      action: "leave",
      entity: "deck",
      entityId: deckId,
      payload: { memberId: userId },
    });
  }
  return { ok: true as const };
}

/** Take a member out of a deck and keep them out until invited back by name. */
export async function removeMember(ctx: ServiceContext, deckId: string, memberId: string) {
  const { db, userId, actor } = ctx;
  await ownedDeck(ctx, deckId);
  const result = await db
    .update(schema.deckMembers)
    .set({ removedAt: new Date(), removedBy: "owner", updatedAt: new Date() })
    .where(
      and(
        eq(schema.deckMembers.deckId, deckId),
        eq(schema.deckMembers.userId, memberId),
        isNull(schema.deckMembers.removedAt),
      ),
    )
    .returning({ id: schema.deckMembers.id });
  if (result.length === 0) throw notFound("Member");
  await audit(db, {
    userId,
    actor,
    action: "remove_member",
    entity: "deck",
    entityId: deckId,
    payload: { memberId },
  });
  return { ok: true as const };
}

/** Active members of a deck with when they joined. Any member may see who else is in. */
export async function listMembers(ctx: ServiceContext, deckId: string) {
  await deckAccess(ctx, deckId);
  return ctx.db
    .select({
      userId: schema.deckMembers.userId,
      name: schema.user.name,
      role: schema.deckMembers.role,
      joinedAt: schema.deckMembers.joinedAt,
    })
    .from(schema.deckMembers)
    .innerJoin(schema.user, eq(schema.user.id, schema.deckMembers.userId))
    .where(and(eq(schema.deckMembers.deckId, deckId), isNull(schema.deckMembers.removedAt)))
    .orderBy(schema.deckMembers.joinedAt);
}
