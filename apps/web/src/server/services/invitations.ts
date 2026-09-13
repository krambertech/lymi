import type { JoinPreviewOut } from "@lymi/core";
import { newId } from "@lymi/core";
import { and, eq, isNull, sql } from "@lymi/core/db";
import { type Db, schema } from "../db";
import { type ServiceContext, ServiceError } from "./context";
import { join, ownedDeck } from "./members";

/** How many cards a join page shows. They are drawn at random on every visit. */
const JOIN_SAMPLES = 10;

/** 24 random bytes as base64url: 192 bits, so a join link cannot be guessed. */
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{32}$/;

export function isJoinToken(value: string | undefined | null): value is string {
  return typeof value === "string" && TOKEN_SHAPE.test(value);
}

function newJoinToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_");
}

async function activeLink(db: Db, deckId: string) {
  const [link] = await db
    .select({ token: schema.deckInvitations.token, createdAt: schema.deckInvitations.createdAt })
    .from(schema.deckInvitations)
    .where(
      and(
        eq(schema.deckInvitations.deckId, deckId),
        eq(schema.deckInvitations.kind, "link"),
        isNull(schema.deckInvitations.revokedAt),
      ),
    );
  return link ?? null;
}

/** The deck's working join link, or null while sharing is off. Owner only. */
export async function getJoinLink(ctx: ServiceContext, deckId: string) {
  await ownedDeck(ctx, deckId);
  const [link, [count]] = await Promise.all([
    activeLink(ctx.db, deckId),
    ctx.db
      .select({ members: sql<number>`count(*)` })
      .from(schema.deckMembers)
      .where(and(eq(schema.deckMembers.deckId, deckId), isNull(schema.deckMembers.removedAt))),
  ]);
  return { link, members: count?.members ?? 0 };
}

/**
 * Turn sharing on. A repeat returns the link that is already on, so two taps make one URL.
 * A link that was turned off is never revived: this makes a new token.
 */
export async function turnOnJoinLink(ctx: ServiceContext, deckId: string) {
  const { db, userId, actor } = ctx;
  const deck = await ownedDeck(ctx, deckId);
  if (deck.archivedAt) {
    throw new ServiceError("invalid", "Restore the deck before sharing it");
  }
  const existing = await activeLink(db, deckId);
  if (existing) return existing;

  const id = newId();
  // The partial unique index settles a race: the second insert does nothing and gets no audit.
  await db.batch([
    db
      .insert(schema.deckInvitations)
      .values({ id, deckId, kind: "link", token: newJoinToken() })
      .onConflictDoNothing(),
    db.insert(schema.auditLog).select(
      sql`select ${newId()}, ${userId}, ${actor}, 'turn_on_join_link', 'deck', ${deckId}, '{}',
        ${Date.now()}
      where exists (select 1 from deck_invitations where id = ${id})`,
    ),
  ]);
  const link = await activeLink(db, deckId);
  if (!link) throw new ServiceError("conflict", "The join link changed. Try again.");
  return link;
}

/** Turn sharing off for good. Members stay; the URL never works again. Owner only. */
export async function turnOffJoinLink(ctx: ServiceContext, deckId: string) {
  const { db, userId, actor } = ctx;
  await ownedDeck(ctx, deckId);
  const now = Date.now();
  // One batch, so a revocation never lands without its audit row.
  await db.batch([
    db
      .update(schema.deckInvitations)
      .set({ revokedAt: new Date(now), updatedAt: new Date(now) })
      .where(
        and(
          eq(schema.deckInvitations.deckId, deckId),
          eq(schema.deckInvitations.kind, "link"),
          isNull(schema.deckInvitations.revokedAt),
        ),
      ),
    db.insert(schema.auditLog).select(
      sql`select ${newId()}, ${userId}, ${actor}, 'turn_off_join_link', 'deck', ${deckId}, '{}',
        ${now}
      where exists (
        select 1 from deck_invitations
        where deck_id = ${deckId} and kind = 'link' and revoked_at = ${now}
      )`,
    ),
  ]);
  return { ok: true as const };
}

async function linkByToken(db: Db, token: string) {
  if (!isJoinToken(token)) return null;
  const [row] = await db
    .select({
      id: schema.deckInvitations.id,
      revokedAt: schema.deckInvitations.revokedAt,
      deckId: schema.decks.id,
      deckName: schema.decks.name,
      deckLanguage: schema.decks.defaultLanguage,
      deckArchivedAt: schema.decks.archivedAt,
      ownerId: schema.decks.userId,
      ownerName: schema.user.name,
    })
    .from(schema.deckInvitations)
    .innerJoin(schema.decks, eq(schema.decks.id, schema.deckInvitations.deckId))
    .innerJoin(schema.user, eq(schema.user.id, schema.decks.userId))
    .where(eq(schema.deckInvitations.token, token));
  return row ?? null;
}

/** True when the token belongs to a link that is on, for a deck that is not archived. */
export async function joinLinkAdmits(db: Db, token: string): Promise<boolean> {
  const link = await linkByToken(db, token);
  return Boolean(link && !link.revokedAt && !link.deckArchivedAt);
}

/**
 * What the join page may show to this viewer: the deck's size and a few example cards while
 * the link works, and nothing about the deck once it does not.
 */
export async function previewJoin(
  db: Db,
  token: string,
  viewerId: string | null,
): Promise<JoinPreviewOut> {
  const link = await linkByToken(db, token);
  if (!link) {
    return {
      status: "invalid",
      deck: null,
      viewer: viewerId ? "visitor" : "signed-out",
      deckId: null,
    };
  }

  let viewer: JoinPreviewOut["viewer"] = "signed-out";
  if (viewerId === link.ownerId) viewer = "owner";
  else if (viewerId) {
    const [membership] = await db
      .select({ removedAt: schema.deckMembers.removedAt, removedBy: schema.deckMembers.removedBy })
      .from(schema.deckMembers)
      .where(
        and(eq(schema.deckMembers.deckId, link.deckId), eq(schema.deckMembers.userId, viewerId)),
      );
    viewer = !membership
      ? "visitor"
      : !membership.removedAt
        ? "member"
        : membership.removedBy === "owner"
          ? "removed"
          : "visitor";
  }

  const status = link.revokedAt ? "off" : link.deckArchivedAt ? "archived" : "live";
  const canOpen = (viewer === "owner" || viewer === "member") && !link.deckArchivedAt;
  let deck: JoinPreviewOut["deck"] = null;
  if (status === "live") {
    const active = and(eq(schema.cards.deckId, link.deckId), isNull(schema.cards.archivedAt));
    const [[stats], samples] = await Promise.all([
      db
        .select({
          total: sql<number>`count(*)`,
          lastAddedAt: sql<number | null>`max(${schema.cards.createdAt})`,
        })
        .from(schema.cards)
        .where(active),
      // A random few with a meaning first, so a visit shows the deck rather than its latest lesson.
      db
        .select({ term: schema.cards.term, meaning: schema.cards.meaning })
        .from(schema.cards)
        .where(active)
        .orderBy(sql`${schema.cards.meaning} is null`, sql`random()`)
        .limit(JOIN_SAMPLES),
    ]);
    deck = {
      name: link.deckName,
      total: stats?.total ?? 0,
      owner: { name: link.ownerName },
      language: link.deckLanguage,
      lastAddedAt: stats?.lastAddedAt ? new Date(stats.lastAddedAt).toISOString() : null,
      samples,
    };
  }
  return { status, deck, viewer, deckId: canOpen ? link.deckId : null };
}

/**
 * Join the deck a working link points to. Repeats are safe; a learner the owner removed is
 * refused, and a link that is off or on an archived deck admits nobody.
 */
export async function joinThroughLink(ctx: ServiceContext, token: string) {
  const link = await linkByToken(ctx.db, token);
  if (!link || link.revokedAt || link.deckArchivedAt) {
    throw new ServiceError("not_found", "This join link does not work");
  }
  const { role } = await join(ctx, link.deckId, { invitationId: link.id });
  return { deckId: link.deckId, role };
}
