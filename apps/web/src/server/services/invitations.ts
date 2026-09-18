import type { JoinPreviewOut } from "@lymi/core";
import { newId } from "@lymi/core";
import { and, eq, isNull, type SQL, sql } from "@lymi/core/db";
import { type Db, schema } from "../db";
import { auditStatementWhen } from "./audit";
import { type ServiceContext, ServiceError } from "./context";
import { previewDoor } from "./deck-door";
import { join, ownedDeck } from "./members";

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
  const { db } = ctx;
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
    auditStatementWhen(
      ctx,
      { entity: "deck", action: "turn_on_join_link", id: deckId },
      schema.deckInvitations,
      eq(schema.deckInvitations.id, id),
    ),
  ]);
  const link = await activeLink(db, deckId);
  if (!link) throw new ServiceError("conflict", "The join link changed. Try again.");
  return link;
}

/** Turn sharing off for good. Members stay; the URL never works again. Owner only. */
export async function turnOffJoinLink(ctx: ServiceContext, deckId: string) {
  const { db } = ctx;
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
    auditStatementWhen(
      ctx,
      { entity: "deck", action: "turn_off_join_link", id: deckId },
      schema.deckInvitations,
      and(
        eq(schema.deckInvitations.deckId, deckId),
        eq(schema.deckInvitations.kind, "link"),
        eq(schema.deckInvitations.revokedAt, new Date(now)),
      ) as SQL,
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

/** What the join page may show this viewer while the link works, and nothing once it does not. */
export async function previewJoin(
  db: Db,
  token: string,
  viewerId: string | null,
): Promise<JoinPreviewOut> {
  const link = await linkByToken(db, token);
  const deck = link && {
    id: link.deckId,
    name: link.deckName,
    language: link.deckLanguage,
    ownerId: link.ownerId,
    shownOwner: link.ownerName,
    archivedAt: link.deckArchivedAt,
  };
  return previewDoor(db, deck, Boolean(link?.revokedAt), viewerId);
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
