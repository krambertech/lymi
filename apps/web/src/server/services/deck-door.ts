import type { JoinPreviewOut } from "@lymi/core";
import { and, eq, isNull, sql } from "@lymi/core/db";
import { type Db, schema } from "../db";

/** How many cards a join or add page shows. They are drawn at random on every visit. */
const DOOR_SAMPLES = 10;

/** A deck's front door: a join link or a publication, resolved to the deck it opens. */
export interface DoorDeck {
  id: string;
  name: string;
  language: string | null;
  ownerId: string;
  /** The name the page shows as the deck's source: the owner, or the publisher. */
  shownOwner: string;
  /** A published deck's publisher photo. Null on a join link, whose owner stays private. */
  shownOwnerAvatarUrl?: string | null | undefined;
  archivedAt: Date | null;
}

/**
 * What a join or add page may show this viewer. Nothing about the deck unless the door is open,
 * and the deck's id only to someone who can already open it. ADR 0011, ADR 0020.
 */
export async function previewDoor(
  db: Db,
  deck: DoorDeck | null,
  closed: boolean,
  viewerId: string | null,
): Promise<JoinPreviewOut> {
  if (!deck) {
    return {
      status: "invalid",
      deck: null,
      viewer: viewerId ? "visitor" : "signed-out",
      deckId: null,
    };
  }
  const status = closed ? "off" : deck.archivedAt ? "archived" : "live";
  const [viewer, preview] = await Promise.all([
    viewerOf(db, deck, viewerId),
    status === "live" ? deckPreview(db, deck) : null,
  ]);
  const canOpen = (viewer === "owner" || viewer === "member") && !deck.archivedAt;
  return { status, deck: preview, viewer, deckId: canOpen ? deck.id : null };
}

/** Who is looking: signed out, a stranger, in the deck, its owner, or removed by the owner. */
async function viewerOf(
  db: Db,
  deck: DoorDeck,
  viewerId: string | null,
): Promise<JoinPreviewOut["viewer"]> {
  if (!viewerId) return "signed-out";
  if (viewerId === deck.ownerId) return "owner";
  const [membership] = await db
    .select({ removedAt: schema.deckMembers.removedAt, removedBy: schema.deckMembers.removedBy })
    .from(schema.deckMembers)
    .where(and(eq(schema.deckMembers.deckId, deck.id), eq(schema.deckMembers.userId, viewerId)));
  if (!membership) return "visitor";
  if (!membership.removedAt) return "member";
  return membership.removedBy === "owner" ? "removed" : "visitor";
}

/** The deck's size, when it last grew, and a random few of its cards. */
async function deckPreview(db: Db, deck: DoorDeck): Promise<NonNullable<JoinPreviewOut["deck"]>> {
  const active = and(eq(schema.cards.deckId, deck.id), isNull(schema.cards.archivedAt));
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
      .limit(DOOR_SAMPLES),
  ]);
  return {
    name: deck.name,
    total: stats?.total ?? 0,
    owner: { name: deck.shownOwner, avatarUrl: deck.shownOwnerAvatarUrl ?? null },
    language: deck.language,
    lastAddedAt: stats?.lastAddedAt ? new Date(stats.lastAddedAt).toISOString() : null,
    samples,
  };
}
