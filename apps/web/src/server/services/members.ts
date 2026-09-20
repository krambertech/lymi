import type { MemberRole } from "@lymi/core";
import { newId } from "@lymi/core";
import { activeAvatarVersion, publisherAvatarPath } from "@lymi/core/catalog";
import { and, eq, isNotNull, isNull, type SQL, sql } from "@lymi/core/db";
import { type Db, schema } from "../db";
import { track } from "./analytics";
import { audit, auditStatementWhen } from "./audit";
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
  owner: { id: string; name: string; avatarUrl: string | null };
  published: boolean;
}

/** The columns a deck read selects to name its publisher, beside the joins below. */
export const publisherColumns = {
  publicationSlug: schema.deckPublications.slug,
  avatarCustomKey: schema.userAvatars.customKey,
  avatarCustomVersion: schema.userAvatars.customVersion,
  avatarGoogleVersion: schema.userAvatars.googleVersion,
};

/** The live publication a deck has, if any. */
export const livePublication = and(
  eq(schema.deckPublications.deckId, schema.decks.id),
  eq(schema.deckPublications.status, "published"),
);

/** The owner's photo row, which only a published deck turns into a public address. */
export const ownerAvatar = eq(schema.userAvatars.userId, schema.decks.userId);

/**
 * Whether a deck is published and where its publisher's photo is served. Publishing is what
 * makes the photo public, so a deck shared by link carries none, and an archived deck stops
 * serving one the moment its public page does.
 */
export function publisherOf(row: {
  publicationSlug: string | null;
  archivedAt: Date | null;
  avatarCustomKey: string | null;
  avatarCustomVersion: string | null;
  avatarGoogleVersion: string | null;
}): { published: boolean; avatarUrl: string | null } {
  const slug = row.publicationSlug;
  if (!slug) return { published: false, avatarUrl: null };
  const version = row.archivedAt
    ? null
    : activeAvatarVersion({
        customKey: row.avatarCustomKey,
        customVersion: row.avatarCustomVersion,
        googleVersion: row.avatarGoogleVersion,
      });
  return { published: true, avatarUrl: version ? publisherAvatarPath(slug, version) : null };
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
      editionName: schema.deckLocalizations.name,
      editionDescription: schema.deckLocalizations.description,
      meaningLanguage: schema.deckMembers.meaningLanguage,
      ...publisherColumns,
    })
    .from(schema.decks)
    .innerJoin(schema.user, eq(schema.user.id, schema.decks.userId))
    .leftJoin(schema.deckPublications, livePublication)
    .leftJoin(schema.userAvatars, ownerAvatar)
    .leftJoin(
      schema.deckMembers,
      and(
        eq(schema.deckMembers.deckId, schema.decks.id),
        eq(schema.deckMembers.userId, userId),
        isNull(schema.deckMembers.removedAt),
      ),
    )
    .leftJoin(
      schema.deckLocalizations,
      and(
        eq(schema.deckLocalizations.deckId, schema.decks.id),
        eq(schema.deckLocalizations.language, schema.deckMembers.meaningLanguage),
        eq(schema.deckLocalizations.status, "approved"),
      ),
    )
    .where(and(eq(schema.decks.id, deckId), memberOf(userId)));
  if (!row) throw notFound("Deck");
  const role: MemberRole = row.deck.userId === userId ? "owner" : (row.memberRole ?? "learner");
  const { revision: _revision, statesVersion: _statesVersion, ...deck } = row.deck;
  const publisher = publisherOf({ ...row, archivedAt: row.deck.archivedAt });
  return {
    ...deck,
    name: row.editionName ?? deck.name,
    description: row.editionDescription ?? deck.description,
    // The edition this caller reads the deck in, or null for the deck's own words.
    meaningLanguage: row.meaningLanguage,
    seriesId: row.seriesId,
    position: row.position,
    reviewModes: deckModes(row.deck.directions),
    role,
    owner: { id: row.deck.userId, name: row.ownerName, avatarUrl: publisher.avatarUrl },
    published: publisher.published,
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
  ctx: ServiceContext,
  deckId: string,
  opts: {
    invitationId?: string | undefined;
    publicationId?: string | undefined;
    /** The edition being added. Pinned on the membership and never moved again. ADR 0015. */
    meaningLanguage?: string | undefined;
  } = {},
) {
  const { db, userId } = ctx;
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
    await runBatch(db, [
      ...stateStatementsForLearner(db, deckId, userId, now),
      spendNamedInvitations(db, deckId, userId, now),
    ]);
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
          // Rejoining keeps the edition pinned the first time; it is never re-chosen.
          meaningLanguage: existing.meaningLanguage ?? opts.meaningLanguage ?? null,
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
        // Built through the query builder so the statement names its columns. A positional
        // insert would rest on the table's physical column order, which a later ADD COLUMN or a
        // rebuild can change without any build failing.
        .select(
          db
            .select({
              id: sql`${membershipId}`.as("id"),
              deckId: sql`${deckId}`.as("deck_id"),
              userId: sql`${userId}`.as("user_id"),
              role: sql`'learner'`.as("role"),
              invitationId: sql`${opts.invitationId ?? null}`.as("invitation_id"),
              joinedAt: sql`${at}`.as("joined_at"),
              removedAt: sql`null`.as("removed_at"),
              removedBy: sql`null`.as("removed_by"),
              createdAt: sql`${at}`.as("created_at"),
              updatedAt: sql`${at}`.as("updated_at"),
              meaningLanguage: sql`${opts.meaningLanguage ?? null}`.as("meaning_language"),
              statesVersion: sql`0`.as("states_version"),
            })
            // One row, so the guard decides whether the insert writes anything at all.
            .from(sql`(select 1)`)
            .where(admitted),
        )
        .onConflictDoNothing({ target: [schema.deckMembers.deckId, schema.deckMembers.userId] });
  await runBatch(db, [
    membership,
    ...stateStatementsForLearner(db, deckId, userId, now),
    auditStatementWhen(
      { ...ctx, userId: deck.userId },
      {
        entity: "deck",
        action: "join",
        id: deckId,
        memberId: userId,
        ...(via ? { details: { via } } : {}),
      },
      schema.deckMembers,
      and(
        eq(schema.deckMembers.id, membershipId),
        eq(schema.deckMembers.joinedAt, now),
        isNull(schema.deckMembers.removedAt),
      ) as SQL,
    ),
  ]);

  const [after] = await db
    .select({
      id: schema.deckMembers.id,
      joinedAt: schema.deckMembers.joinedAt,
      removedAt: schema.deckMembers.removedAt,
    })
    .from(schema.deckMembers)
    .where(and(eq(schema.deckMembers.deckId, deckId), eq(schema.deckMembers.userId, userId)));
  if (!after || after.removedAt) {
    throw opts.invitationId
      ? new ServiceError("not_found", "This join link does not work")
      : opts.publicationId
        ? new ServiceError("not_found", "This deck is not published")
        : notFound("Deck");
  }
  await spendNamedInvitations(db, deckId, userId, now);
  if (after.id === membershipId && after.joinedAt.getTime() === now.getTime()) {
    track(ctx.analytics, { name: "deck_joined" });
  }
  return { ok: true as const, role: "learner" as const };
}

/**
 * A named invitation is spent by the address it names joining, however they came in, so People
 * never shows somebody as waiting who is already there. Runs only once the join has landed.
 */
function spendNamedInvitations(db: Db, deckId: string, userId: string, now: Date) {
  return db
    .update(schema.deckInvitations)
    .set({ acceptedAt: now, updatedAt: now })
    .where(
      and(
        eq(schema.deckInvitations.deckId, deckId),
        eq(schema.deckInvitations.kind, "named"),
        isNull(schema.deckInvitations.revokedAt),
        isNull(schema.deckInvitations.acceptedAt),
        sql`${schema.deckInvitations.email} = (select lower(${schema.user.email}) from ${schema.user} where ${schema.user.id} = ${userId})`,
      ),
    );
}

/** Stop studying a deck. The states and reviews stay, so rejoining resumes. */
export async function leave(ctx: ServiceContext, deckId: string) {
  const { db, userId } = ctx;
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
    await audit(
      { ...ctx, userId: deck.userId },
      { entity: "deck", action: "leave", id: deckId, memberId: userId },
    );
  }
  return { ok: true as const };
}

/** Take a member out of a deck and keep them out until invited back by name. */
export async function removeMember(ctx: ServiceContext, deckId: string, memberId: string) {
  const { db } = ctx;
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
  await audit(ctx, { entity: "deck", action: "remove_member", id: deckId, memberId });
  return { ok: true as const };
}

/**
 * Active members of a deck with when they joined. Owner only: a member sees the owner's name
 * and nobody else's. ADR 0011. The owner is not in the list; they are the deck's `owner`.
 */
export async function listMembers(ctx: ServiceContext, deckId: string) {
  await ownedDeck(ctx, deckId);
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
