import type { Direction, MemberRole } from "@lymi/core";
import { emptyState, modeOfStateDirection, newId, serializeState } from "@lymi/core";
import { and, eq, inArray, isNotNull, isNull, sql } from "@lymi/core/db";
import { audit } from "../audit";
import { type Db, schema } from "../db";
import { notFound, type ServiceContext, ServiceError } from "./context";
import { deckModes } from "./modes";

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
 * Backfill a known set of learners and cards, due now, without replacing existing state.
 * Deck-wide changes use this path; card and membership writes use transactional selects.
 */
export async function fillStates(
  { db }: Pick<ServiceContext, "db">,
  wanted: { cardId: string; directions: readonly Direction[] }[],
  learners: readonly string[],
) {
  if (wanted.length === 0 || learners.length === 0) return;
  const cardIds = wanted.map((w) => w.cardId);
  const have = new Set<string>();
  // D1 allows 100 bound parameters per query: forty learners and fifty cards at a time.
  for (let l = 0; l < learners.length; l += 40) {
    for (let i = 0; i < cardIds.length; i += 50) {
      const rows = await db
        .select({
          cardId: schema.cardStates.cardId,
          userId: schema.cardStates.userId,
          direction: schema.cardStates.direction,
        })
        .from(schema.cardStates)
        .where(
          and(
            inArray(schema.cardStates.cardId, cardIds.slice(i, i + 50)),
            inArray(schema.cardStates.userId, learners.slice(l, l + 40)),
          ),
        );
      for (const row of rows) have.add(`${row.cardId}:${row.userId}:${row.direction}`);
    }
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
            mode: modeOfStateDirection(direction),
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

type Statement = Parameters<Db["batch"]>[0][number];
const directions = ["recognition", "production"] as const;

function stateInsert(db: Db, select: ReturnType<typeof sql>) {
  return db
    .insert(schema.cardStates)
    .select(select)
    .onConflictDoNothing({
      target: [schema.cardStates.cardId, schema.cardStates.userId, schema.cardStates.direction],
    });
}

/** Prepare one card's state rows from membership seen inside the surrounding transaction. */
export function stateStatementsForCard(db: Db, cardId: string, now = new Date()): Statement[] {
  const due = now.getTime();
  const fsrs = serializeState(emptyState(now));
  return directions.map((direction) =>
    stateInsert(
      db,
      sql`with target as (
        select cards.id as card_id, decks.id as deck_id, decks.user_id as owner_id,
          coalesce(cards.directions, decks.directions) as directions
        from cards join decks on decks.id = cards.deck_id
        where cards.id = ${cardId}
      ), learners(user_id) as (
        select owner_id from target
        union all
        select deck_members.user_id from deck_members
          join target on target.deck_id = deck_members.deck_id
        where deck_members.removed_at is null
      )
      select lower(hex(randomblob(10))), target.card_id, learners.user_id, ${direction},
        ${due}, 0, ${fsrs}, null, ${due}, ${due}, ${modeOfStateDirection(direction)}
      from target cross join learners
      where target.directions = 'both' or target.directions = ${direction}`,
    ),
  );
}

/** Prepare every card state, including archived ones, for one learner joining a deck. */
function stateStatementsForLearner(
  db: Db,
  deckId: string,
  userId: string,
  now = new Date(),
): Statement[] {
  const due = now.getTime();
  const fsrs = serializeState(emptyState(now));
  return directions.map((direction) =>
    stateInsert(
      db,
      sql`select lower(hex(randomblob(10))), cards.id, ${userId}, ${direction},
        ${due}, 0, ${fsrs}, null, ${due}, ${due}, ${modeOfStateDirection(direction)}
      from cards join decks on decks.id = cards.deck_id
      where cards.deck_id = ${deckId}
        and (coalesce(cards.directions, decks.directions) = 'both'
          or coalesce(cards.directions, decks.directions) = ${direction})
        and exists (
          select 1 from deck_members
          where deck_members.deck_id = ${deckId} and deck_members.user_id = ${userId}
            and deck_members.removed_at is null
        )`,
    ),
  );
}

async function runBatch(db: Db, statements: Statement[]) {
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
}

/**
 * Become a member of a deck. A repeat join repairs missing states without duplicating the
 * membership or audit. A member the owner removed is refused until a named invitation
 * clears the block. The join lands in the owner's Activity.
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
    : sql`exists (select 1 from decks where decks.id = ${deckId} and decks.archived_at is null)`;
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
        ${JSON.stringify({ memberId: userId })}, ${at}
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
