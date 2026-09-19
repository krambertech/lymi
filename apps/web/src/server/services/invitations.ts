import type { InviteRefusal, JoinPreviewOut } from "@lymi/core";
import { newId, PENDING_INVITATION_LIMIT } from "@lymi/core";
import { and, eq, isNull, type SQL, sql } from "@lymi/core/db";
import { type Db, schema } from "../db";
import { audit, auditStatementWhen } from "./audit";
import { notFound, type ServiceContext, ServiceError } from "./context";
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
      kind: schema.deckInvitations.kind,
      email: schema.deckInvitations.email,
      acceptedAt: schema.deckInvitations.acceptedAt,
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

/**
 * True when the token could still let somebody in, whoever they turn out to be. The sign-in
 * hold asks this, before anybody has said who they are; a named invitation's address is
 * checked later, in `joinThroughLink`.
 */
export async function joinLinkAdmits(db: Db, token: string): Promise<boolean> {
  const link = await linkByToken(db, token);
  if (!link || link.revokedAt || link.deckArchivedAt) return false;
  return link.kind !== "named" || !link.acceptedAt;
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
 * refused, and a link that is off or on an archived deck admits nobody. A named invitation
 * admits only the address it names, so a learner signed in as somebody else is told which.
 */
export async function joinThroughLink(ctx: ServiceContext, token: string) {
  const link = await linkByToken(ctx.db, token);
  if (!link || link.revokedAt || link.deckArchivedAt) {
    throw new ServiceError("not_found", "This join link does not work");
  }
  if (link.kind === "named") {
    const [caller] = await ctx.db
      .select({ email: schema.user.email })
      .from(schema.user)
      .where(eq(schema.user.id, ctx.userId));
    const invited = link.email ?? "";
    if (caller?.email.toLowerCase() !== invited) {
      // Naming the address is the point: otherwise the refusal reads as a broken link.
      throw new ServiceError("forbidden", `This invitation is for ${invited}`, {
        invitedEmail: invited,
      });
    }
  }
  // Joining spends the named invitation, so the address cannot hand its link on to somebody else.
  const { role } = await join(ctx, link.deckId, { invitationId: link.id });
  return { deckId: link.deckId, role };
}

function refused(code: "invalid" | "conflict", message: string, reason: InviteRefusal) {
  return new ServiceError(code, message, { reason });
}

/** Invitations nobody has accepted yet, oldest first. Owner only. */
export async function listInvitations(ctx: ServiceContext, deckId: string) {
  await ownedDeck(ctx, deckId);
  return ctx.db
    .select({
      id: schema.deckInvitations.id,
      email: schema.deckInvitations.email,
      invitedAt: schema.deckInvitations.createdAt,
    })
    .from(schema.deckInvitations)
    .where(
      and(
        eq(schema.deckInvitations.deckId, deckId),
        eq(schema.deckInvitations.kind, "named"),
        isNull(schema.deckInvitations.revokedAt),
        isNull(schema.deckInvitations.acceptedAt),
      ),
    )
    .orderBy(schema.deckInvitations.createdAt);
}

/**
 * Ask one address into the deck and send them the message. The invitation is a join link
 * scoped to that address, so the token, the sign-in cookie and the join page are the machinery
 * that already exists. ADR 0011.
 */
export async function inviteByEmail(
  ctx: ServiceContext,
  deckId: string,
  rawEmail: string,
  send: (
    to: string,
    token: string,
    deck: { name: string; owner: string; cards: number },
  ) => Promise<void>,
) {
  const { db, userId } = ctx;
  const deck = await ownedDeck(ctx, deckId);
  if (deck.archivedAt) {
    throw new ServiceError("invalid", "Restore the deck before inviting anyone");
  }
  const email = rawEmail.trim().toLowerCase();

  const [owner] = await db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, userId));
  if (owner?.email.toLowerCase() === email) {
    throw refused("invalid", "This deck is already yours", "owner");
  }

  const [membership] = await db
    .select({ removedAt: schema.deckMembers.removedAt, removedBy: schema.deckMembers.removedBy })
    .from(schema.deckMembers)
    .innerJoin(schema.user, eq(schema.user.id, schema.deckMembers.userId))
    .where(and(eq(schema.deckMembers.deckId, deckId), sql`lower(${schema.user.email}) = ${email}`));
  if (membership && !membership.removedAt) {
    throw refused("conflict", "They are already studying this deck", "member");
  }
  // Removal is for good, so the message would carry a link its reader cannot use. Somebody
  // who left is welcome back, and the invitation is how the owner says so.
  if (membership?.removedBy === "owner") {
    throw refused(
      "conflict",
      "You removed them from this deck, and nothing lets them back yet",
      "removed",
    );
  }

  const waiting = await listInvitations(ctx, deckId);
  if (waiting.some((row) => row.email === email)) {
    throw refused("conflict", "They already have an invitation waiting", "invited");
  }
  if (waiting.length >= PENDING_INVITATION_LIMIT) {
    throw refused(
      "invalid",
      `That is ${PENDING_INVITATION_LIMIT} invitations waiting. Cancel one, or wait for someone to join.`,
      "full",
    );
  }

  const id = newId();
  const token = newJoinToken();
  // The partial unique index settles a race: the second insert does nothing and gets no audit.
  await db.batch([
    db
      .insert(schema.deckInvitations)
      .values({ id, deckId, kind: "named", email, token })
      .onConflictDoNothing(),
    auditStatementWhen(
      ctx,
      { entity: "deck", action: "invite", id: deckId, email },
      schema.deckInvitations,
      // The row exists only if this insert won the race.
      eq(schema.deckInvitations.id, id),
    ),
  ]);

  const [written] = await db
    .select({ token: schema.deckInvitations.token, invitedAt: schema.deckInvitations.createdAt })
    .from(schema.deckInvitations)
    .where(eq(schema.deckInvitations.id, id));
  if (!written) throw refused("conflict", "They already have an invitation waiting", "invited");

  // The deck row carries no counts, so the message asks for the one number it names.
  const [counted] = await db
    .select({ cards: sql<number>`count(*)` })
    .from(schema.cards)
    .where(and(eq(schema.cards.deckId, deckId), isNull(schema.cards.archivedAt)));

  // Sending is last: a message that goes out for an invitation that was not written is worse
  // than a row with no message, which the owner can cancel and send again.
  await send(email, token, {
    name: deck.name,
    owner: deck.owner.name,
    cards: counted?.cards ?? 0,
  });
  return { id, email, invitedAt: written.invitedAt };
}

/** Take back an invitation nobody has accepted. Its link stops working. Owner only. */
export async function cancelInvitation(ctx: ServiceContext, deckId: string, invitationId: string) {
  const { db } = ctx;
  await ownedDeck(ctx, deckId);
  const now = new Date();
  const [row] = await db
    .update(schema.deckInvitations)
    .set({ revokedAt: now, updatedAt: now })
    .where(
      and(
        eq(schema.deckInvitations.id, invitationId),
        eq(schema.deckInvitations.deckId, deckId),
        eq(schema.deckInvitations.kind, "named"),
        isNull(schema.deckInvitations.revokedAt),
        isNull(schema.deckInvitations.acceptedAt),
      ),
    )
    .returning({ email: schema.deckInvitations.email });
  if (!row) throw notFound("Invitation");
  await audit(ctx, {
    entity: "deck",
    action: "cancel_invite",
    id: deckId,
    email: row.email ?? "",
  });
  return { ok: true as const };
}
