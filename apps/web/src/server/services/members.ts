import type { MemberRole } from "@lymi/core";
import { newId } from "@lymi/core";
import { and, eq, isNotNull, isNull, sql } from "@lymi/core/db";
import { audit } from "../audit";
import { type Db, schema } from "../db";
import { runBatch } from "./batch";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { deckModes, stateStatementsForLearner } from "./modes";
import { deckOrder, effectiveSeriesId } from "./series-access";

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
      seriesId: effectiveSeriesId(userId),
      position: deckOrder(userId),
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
    seriesId: row.seriesId,
    position: row.position,
    reviewModes: deckModes(row.deck.directions),
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

/**
 * Become a member of a deck. A repeat join repairs missing states without duplicating the
 * membership or audit. A member the owner removed is refused until a named invitation
 * clears the block. The join lands in the owner's Activity.
 */
export async function join(
  { db, userId, actor }: ServiceContext,
  deckId: string,
  opts: { invitationId?: string | undefined; publicationId?: string | undefined } = {},
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
  const now = new Date();
  if (existing && !existing.removedAt) {
    await runBatch(db, stateStatementsForLearner(db, deckId, userId, now));
    return { ok: true as const, role: existing.role };
  }
  if (existing?.removedBy === "owner") {
    throw new ServiceError("forbidden", "The owner removed you from this deck");
  }

  // The membership write re-checks what admits the learner, so an owner who turns the link off
  // or archives the deck mid-join wins. A concurrent repeat loses the insert or the update, so
  // its `joined_at` never lands and its audit row is skipped.
  const membershipId = existing?.id ?? newId();
  const at = now.getTime();
  const admitted = opts.invitationId
    ? sql`exists (
        select 1 from deck_invitations join decks on decks.id = deck_invitations.deck_id
        where deck_invitations.id = ${opts.invitationId} and deck_invitations.deck_id = ${deckId}
          and deck_invitations.revoked_at is null and decks.archived_at is null
      )`
    : opts.publicationId
      ? sql`exists (
          select 1 from deck_publications join decks on decks.id = deck_publications.deck_id
          where deck_publications.id = ${opts.publicationId} and deck_publications.deck_id = ${deckId}
            and deck_publications.status = 'published' and decks.archived_at is null
        )`
      : sql`exists (select 1 from decks where decks.id = ${deckId} and decks.archived_at is null)`;
  const via = opts.invitationId ? "link" : opts.publicationId ? "publication" : undefined;
  const membership = existing
    ? db
        .update(schema.deckMembers)
        .set({
          removedAt: null,
          removedBy: null,
          joinedAt: now,
          invitationId: opts.invitationId ?? existing.invitationId,
          updatedAt: now,
        })
        .where(
          and(
            eq(schema.deckMembers.id, existing.id),
            eq(schema.deckMembers.removedBy, "self"),
            isNotNull(schema.deckMembers.removedAt),
            admitted,
          ),
        )
    : db
        .insert(schema.deckMembers)
        .select(
          sql`select ${membershipId}, ${deckId}, ${userId}, 'learner', ${opts.invitationId ?? null},
            ${at}, null, null, ${at}, ${at}
          where ${admitted}`,
        )
        .onConflictDoNothing({ target: [schema.deckMembers.deckId, schema.deckMembers.userId] });
  await runBatch(db, [
    membership,
    ...stateStatementsForLearner(db, deckId, userId, now),
    db.insert(schema.auditLog).select(
      sql`select ${newId()}, ${deck.userId}, ${actor}, 'join', 'deck', ${deckId},
        ${JSON.stringify({ memberId: userId, ...(via && { via }) })}, ${at}
      where exists (
        select 1 from deck_members
        where id = ${membershipId} and joined_at = ${at} and removed_at is null
      )`,
    ),
  ]);

  const [after] = await db
    .select({ removedAt: schema.deckMembers.removedAt })
    .from(schema.deckMembers)
    .where(and(eq(schema.deckMembers.deckId, deckId), eq(schema.deckMembers.userId, userId)));
  if (!after || after.removedAt) {
    throw opts.invitationId
      ? new ServiceError("not_found", "This join link does not work")
      : opts.publicationId
        ? new ServiceError("not_found", "This deck is not published")
        : notFound("Deck");
  }
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
