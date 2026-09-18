import type { PublicationMediaApprovalInput, PublicationMediaOut } from "@lymi/core";
import { newId } from "@lymi/core";
import { and, eq, isNotNull, isNull } from "@lymi/core/db";
import type { PublicationMedia } from "@lymi/core/schema";
import { type Db, schema } from "../db";
import { auditStatement } from "./audit";
import { ownedCard } from "./cards";
import { type ServiceContext, ServiceError } from "./context";
import { ownedDeck } from "./members";
import { assertPublisher } from "./publishers";

export type PublicMediaKind = "image" | "audio";

function requestedRange(value: string | undefined): R2Range | undefined {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value ?? "");
  if (!match) return undefined;
  const start = match[1];
  const end = match[2];
  if (start) {
    const offset = Number(start);
    if (!Number.isSafeInteger(offset)) return undefined;
    if (!end) return { offset };
    const last = Number(end);
    return Number.isSafeInteger(last) && last >= offset
      ? { offset, length: last - offset + 1 }
      : undefined;
  }
  const suffix = Number(end);
  return end && Number.isSafeInteger(suffix) && suffix > 0 ? { suffix } : undefined;
}

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
    rightsBasis: row.rightsBasis,
    rightsReference: row.rightsReference,
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
  const rows = await ctx.db
    .select({
      approval: schema.publicationMedia,
      currentAudioKey: schema.cards.audioKey,
      activeImageId: schema.cardImages.id,
    })
    .from(schema.publicationMedia)
    .innerJoin(
      schema.cards,
      and(
        eq(schema.cards.id, schema.publicationMedia.cardId),
        eq(schema.cards.deckId, deckId),
        isNull(schema.cards.archivedAt),
      ),
    )
    .leftJoin(
      schema.cardImages,
      and(
        eq(schema.cardImages.id, schema.publicationMedia.imageId),
        eq(schema.cardImages.cardId, schema.cards.id),
        eq(schema.cardImages.status, "active"),
        isNotNull(schema.cardImages.description),
      ),
    )
    .where(
      and(
        eq(schema.publicationMedia.publicationId, publication.id),
        isNull(schema.publicationMedia.revokedAt),
      ),
    );
  return rows
    .filter(({ approval, currentAudioKey, activeImageId }) =>
      approval.kind === "image"
        ? activeImageId !== null
        : approval.audioKey !== null && approval.audioKey === currentAudioKey,
    )
    .map(({ approval }) => mediaOut(approval));
}

/** Approve the image or stored pronunciation that is current at this instant. */
export async function approvePublicationMedia(
  ctx: ServiceContext,
  deckId: string,
  cardId: string,
  kind: PublicMediaKind,
  input: PublicationMediaApprovalInput,
  publishers: Set<string>,
  storage: { images: R2Bucket; audio: R2Bucket },
): Promise<PublicationMediaOut> {
  const publication = await publisherPublication(ctx, deckId, publishers);
  const card = await ownedCard(ctx, cardId);
  if (card.deckId !== deckId || card.archivedAt) {
    throw new ServiceError("not_found", "Card not found");
  }
  if (kind === "image" && input.rightsBasis === "generated") {
    throw new ServiceError("invalid", "Choose how you may publish this picture");
  }
  if (kind === "audio" && input.rightsBasis !== "generated") {
    throw new ServiceError("invalid", "This pronunciation is generated audio");
  }
  if (
    (input.rightsBasis === "licensed" || input.rightsBasis === "public_domain") &&
    !input.rightsReference
  ) {
    throw new ServiceError("invalid", "Give the source of the picture's public-use rights");
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
  if (
    current &&
    current.imageId === imageId &&
    current.audioKey === audioKey &&
    current.rightsBasis === input.rightsBasis &&
    current.rightsReference === (input.rightsReference ?? null)
  ) {
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
    rightsBasis: input.rightsBasis,
    rightsReference: input.rightsReference ?? null,
    approvedBy: ctx.userId,
    approvedAt: now,
  };
  const audit = auditStatement(ctx, {
    entity: "card",
    action: "approve_public_media",
    id: cardId,
    deckId,
    details: { kind, approvalId: next.id, rightsBasis: input.rightsBasis },
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
    rightsBasis: input.rightsBasis,
    rightsReference: input.rightsReference ?? null,
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
  range?: string,
): Promise<{ kind: PublicMediaKind; object: R2ObjectBody }> {
  const [row] = await db
    .select({
      kind: schema.publicationMedia.kind,
      cardId: schema.publicationMedia.cardId,
      imageId: schema.publicationMedia.imageId,
      audioKey: schema.publicationMedia.audioKey,
      currentAudioKey: schema.cards.audioKey,
    })
    .from(schema.publicationMedia)
    .innerJoin(
      schema.deckPublications,
      eq(schema.deckPublications.id, schema.publicationMedia.publicationId),
    )
    .innerJoin(schema.decks, eq(schema.decks.id, schema.deckPublications.deckId))
    .innerJoin(
      schema.cards,
      and(
        eq(schema.cards.id, schema.publicationMedia.cardId),
        eq(schema.cards.deckId, schema.decks.id),
      ),
    )
    .where(
      and(
        eq(schema.publicationMedia.id, approvalId),
        isNull(schema.publicationMedia.revokedAt),
        eq(schema.deckPublications.status, "published"),
        isNull(schema.decks.archivedAt),
        isNull(schema.cards.archivedAt),
      ),
    );
  if (!row) throw new ServiceError("not_found", "Media not found");
  const requested = requestedRange(range);
  const options = requested ? { range: requested } : undefined;
  if (row.kind === "audio" && row.audioKey && row.audioKey === row.currentAudioKey) {
    const object = await storage.audio.get(row.audioKey, options);
    if (object) return { kind: "audio", object };
  }
  if (row.kind === "image" && row.imageId) {
    const [image] = await db
      .select({ objectKey: schema.cardImages.objectKey })
      .from(schema.cardImages)
      .where(
        and(
          eq(schema.cardImages.id, row.imageId),
          eq(schema.cardImages.cardId, row.cardId),
          eq(schema.cardImages.status, "active"),
          isNotNull(schema.cardImages.description),
        ),
      );
    if (image) {
      const object = await storage.images.get(image.objectKey, options);
      if (object) return { kind: "image", object };
    }
  }
  throw new ServiceError("not_found", "Media not found");
}
