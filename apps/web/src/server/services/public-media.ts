import type { PublicationMediaOut } from "@lymi/core";
import { newId } from "@lymi/core";
import { and, eq, isNotNull, isNull } from "@lymi/core/db";
import { livePublicationMedia } from "@lymi/core/publication-media";
import type { PublicationMedia } from "@lymi/core/schema";
import { type Db, schema } from "../db";
import { auditStatement } from "./audit";
import { ownedCard } from "./cards";
import { type ServiceContext, ServiceError } from "./context";
import { ownedDeck } from "./members";
import { assertPublisher } from "./publishers";

export type PublicMediaKind = "image" | "audio";

const activeApproval = (publicationId: string, cardId: string, kind: PublicMediaKind) =>
  and(
    eq(schema.publicationMedia.publicationId, publicationId),
    eq(schema.publicationMedia.cardId, cardId),
    eq(schema.publicationMedia.kind, kind),
    isNull(schema.publicationMedia.revokedAt),
  );

function mediaOut(row: PublicationMedia): PublicationMediaOut {
  return {
    id: row.id,
    cardId: row.cardId,
    kind: row.kind,
    approvedAt: row.approvedAt.toISOString(),
  };
}

async function publisherPublication(ctx: ServiceContext, deckId: string, publishers: Set<string>) {
  if (ctx.actor !== "user") {
    throw new ServiceError("forbidden", "A publisher must approve public media in person");
  }
  await assertPublisher(ctx, publishers);
  const deck = await ownedDeck(ctx, deckId);
  if (deck.archivedAt) throw new ServiceError("not_found", "Published deck not found");
  const [publication] = await ctx.db
    .select({ id: schema.deckPublications.id })
    .from(schema.deckPublications)
    .where(
      and(
        eq(schema.deckPublications.deckId, deckId),
        eq(schema.deckPublications.status, "published"),
      ),
    );
  if (!publication) throw new ServiceError("not_found", "Published deck not found");
  return publication;
}

/** Only current approvals are shown to the publisher; object keys never cross the API. */
export async function listPublicationMedia(
  ctx: ServiceContext,
  deckId: string,
  publishers: Set<string>,
): Promise<PublicationMediaOut[]> {
  const publication = await publisherPublication(ctx, deckId, publishers);
  const rows = await livePublicationMedia(ctx.db, { publicationId: publication.id }, "publisher");
  return rows.map((row) => {
    if (!row.approvedAt) throw new Error("Publisher approval time is missing");
    return {
      id: row.id,
      cardId: row.cardId,
      kind: row.kind,
      approvedAt: row.approvedAt.toISOString(),
    };
  });
}

/** Approve the image or stored pronunciation that is current at this instant. */
export async function approvePublicationMedia(
  ctx: ServiceContext,
  deckId: string,
  cardId: string,
  kind: PublicMediaKind,
  publishers: Set<string>,
  storage: { images: R2Bucket; audio: R2Bucket },
): Promise<PublicationMediaOut> {
  const publication = await publisherPublication(ctx, deckId, publishers);
  const card = await ownedCard(ctx, cardId);
  if (card.deckId !== deckId || card.archivedAt) {
    throw new ServiceError("not_found", "Card not found");
  }
  let imageId: string | null = null;
  let audioKey: string | null = null;
  if (kind === "image") {
    const [image] = await ctx.db
      .select({
        id: schema.cardImages.id,
        objectKey: schema.cardImages.objectKey,
      })
      .from(schema.cardImages)
      .where(
        and(
          eq(schema.cardImages.cardId, cardId),
          eq(schema.cardImages.status, "active"),
          isNotNull(schema.cardImages.description),
        ),
      );
    if (!image || !(await storage.images.head(image.objectKey))) {
      throw new ServiceError("invalid", "Add a described picture before approving it");
    }
    imageId = image.id;
  } else {
    if (!card.audioKey || !(await storage.audio.head(card.audioKey))) {
      throw new ServiceError("invalid", "Play and check this pronunciation before approving it");
    }
    audioKey = card.audioKey;
  }

  const [current] = await ctx.db
    .select()
    .from(schema.publicationMedia)
    .where(activeApproval(publication.id, cardId, kind));
  if (current && current.imageId === imageId && current.audioKey === audioKey) {
    return mediaOut(current);
  }

  const now = new Date();
  const next: typeof schema.publicationMedia.$inferInsert = {
    id: newId(),
    publicationId: publication.id,
    cardId,
    kind,
    imageId,
    audioKey,
    approvedBy: ctx.userId,
    approvedAt: now,
  };
  const audit = auditStatement(ctx, {
    entity: "card",
    action: "approve_public_media",
    id: cardId,
    deckId,
    details: { kind, approvalId: next.id },
  });
  if (current) {
    await ctx.db.batch([
      ctx.db
        .update(schema.publicationMedia)
        .set({ revokedAt: now })
        .where(eq(schema.publicationMedia.id, current.id)),
      ctx.db.insert(schema.publicationMedia).values(next),
      audit,
    ]);
  } else {
    await ctx.db.batch([ctx.db.insert(schema.publicationMedia).values(next), audit]);
  }
  return {
    id: next.id,
    cardId,
    kind,
    approvedAt: now.toISOString(),
  };
}

/** Revocation leaves the approval row for the audit trail and stops new public reads. */
export async function revokePublicationMedia(
  ctx: ServiceContext,
  deckId: string,
  cardId: string,
  kind: PublicMediaKind,
  publishers: Set<string>,
): Promise<{ ok: true }> {
  const publication = await publisherPublication(ctx, deckId, publishers);
  const card = await ownedCard(ctx, cardId);
  if (card.deckId !== deckId) throw new ServiceError("not_found", "Card not found");
  const [current] = await ctx.db
    .select({ id: schema.publicationMedia.id })
    .from(schema.publicationMedia)
    .where(activeApproval(publication.id, cardId, kind));
  if (!current) return { ok: true };
  await ctx.db.batch([
    ctx.db
      .update(schema.publicationMedia)
      .set({ revokedAt: new Date() })
      .where(eq(schema.publicationMedia.id, current.id)),
    auditStatement(ctx, {
      entity: "card",
      action: "revoke_public_media",
      id: cardId,
      deckId,
      details: { kind, approvalId: current.id },
    }),
  ]);
  return { ok: true };
}

/** A public route may read bytes only while the publication, card and exact asset are live. */
export async function publicMediaFile(
  db: Db,
  approvalId: string,
  storage: { images: R2Bucket; audio: R2Bucket },
): Promise<{ kind: PublicMediaKind; object: R2ObjectBody }> {
  const [row] = await livePublicationMedia(db, { approvalId }, "delivery");
  if (!row?.objectKey) throw new ServiceError("not_found", "Media not found");
  const object = await storage[row.kind === "image" ? "images" : "audio"].get(row.objectKey);
  if (!object) throw new ServiceError("not_found", "Media not found");
  return { kind: row.kind, object };
}
