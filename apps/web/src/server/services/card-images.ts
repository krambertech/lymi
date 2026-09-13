import type { CardImageImportInput, CardImagePatch, CardImageVersionInput } from "@lymi/core";
import { newId, normaliseTerm } from "@lymi/core";
import { and, desc, eq, type SQL, sql } from "@lymi/core/db";
import type { Card, CardImage } from "@lymi/core/schema";
import { auditStatementWhen, insertWhen } from "../audit";
import { type Db, schema } from "../db";
import { getCard, ownedCard, showCard } from "./cards";
import { type ServiceContext, ServiceError } from "./context";
import { type Fetcher, fetchRemoteImage } from "./image-import";
import { normalizeBoundedImage } from "./images";
import { stateStatementsForCard } from "./modes";

/** The longest side a stored card picture keeps. */
export const CARD_IMAGE_SIDE = 1600;

/** Where card pictures are stored and how they are re-encoded: the avatars' bucket and binding. */
export interface CardImageStorage {
  bucket: R2Bucket;
  images: ImagesBinding;
  fetcher?: Fetcher | undefined;
}

/** Store uploaded bytes as the card's picture. */
export async function uploadCardImage(
  ctx: ServiceContext,
  cardId: string,
  bytes: Uint8Array,
  fields: { description?: string | undefined; version?: string | null | undefined },
  deps: CardImageStorage,
) {
  const card = await writableCard(ctx, cardId, fields.version);
  return storeImage(ctx, card, bytes, { kind: "upload", host: null }, fields.description, deps);
}

/** Fetch a public link once and store a private copy, keeping only the link's host. */
export async function importCardImage(
  ctx: ServiceContext,
  cardId: string,
  input: CardImageImportInput,
  deps: CardImageStorage,
) {
  const card = await writableCard(ctx, cardId, input.version);
  if (input.description !== undefined) checkDescription(card, input.description);
  const { bytes, host } = await fetchRemoteImage(input.url, deps.fetcher);
  return storeImage(ctx, card, bytes, { kind: "url", host }, input.description, deps);
}

/** Change the active picture's description; null pauses the picture modes. */
export async function describeCardImage(
  ctx: ServiceContext,
  cardId: string,
  patch: CardImagePatch,
) {
  const card = await writableCard(ctx, cardId, patch.version);
  const image = await imageWithStatus(ctx.db, card.id, "active");
  if (!image) throw new ServiceError("not_found", "This card has no picture");
  if (patch.description !== null) checkDescription(card, patch.description);
  const token = newId();
  const [claimResult] = await ctx.db.batch([
    claim(ctx.db, card, token),
    ctx.db
      .update(schema.cardImages)
      .set({ description: patch.description, updatedAt: new Date() })
      .where(and(eq(schema.cardImages.id, image.id), claimed(card.id, token))),
    ...stateStatementsForCard(ctx.db, card.id),
    auditIfClaimed(ctx, card, token, "update_image", {
      imageId: image.id,
      description: patch.description,
    }),
  ]);
  if (!landed(claimResult)) throw stale();
  return showCard(ctx, card.id);
}

/** Hide the picture, pausing picture modes with their schedules intact until restore. */
export async function archiveCardImage(
  ctx: ServiceContext,
  cardId: string,
  input: CardImageVersionInput,
) {
  const card = await writableCard(ctx, cardId, input.version);
  const image = await imageWithStatus(ctx.db, card.id, "active");
  if (!image) throw new ServiceError("not_found", "This card has no picture");
  return setStatus(ctx, card, image, "archived", "archive_image");
}

/** Bring back the picture archived last, and with it the picture modes' schedules. */
export async function restoreCardImage(
  ctx: ServiceContext,
  cardId: string,
  input: CardImageVersionInput,
) {
  const card = await writableCard(ctx, cardId, input.version);
  if (await imageWithStatus(ctx.db, card.id, "active")) {
    throw new ServiceError("conflict", "This card already has a picture");
  }
  const image = await imageWithStatus(ctx.db, card.id, "archived");
  if (!image) throw new ServiceError("not_found", "This card has no archived picture");
  return setStatus(ctx, card, image, "active", "restore_image");
}

/** The active picture's bytes for anyone who can see the card; replaced and archived versions are not served. */
export async function cardImageFile(
  ctx: ServiceContext,
  cardId: string,
  imageId: string,
  bucket: R2Bucket,
) {
  await getCard(ctx, cardId);
  const [image] = await ctx.db
    .select()
    .from(schema.cardImages)
    .where(
      and(
        eq(schema.cardImages.id, imageId),
        eq(schema.cardImages.cardId, cardId),
        eq(schema.cardImages.status, "active"),
      ),
    );
  if (!image) throw new ServiceError("not_found", "Picture not found");
  const object = await bucket.get(image.objectKey);
  if (!object) throw new ServiceError("not_found", "Picture not found");
  return { image, object };
}

async function writableCard(
  ctx: ServiceContext,
  cardId: string,
  version: string | null | undefined,
): Promise<Card> {
  const card = await ownedCard(ctx, cardId);
  if (version !== undefined && version !== card.imageVersion) throw stale();
  return card;
}

/** A description that contains the term or the whole meaning would show the answer before reveal. */
function checkDescription(card: Pick<Card, "term" | "meaning">, description: string) {
  const text = normaliseTerm(description);
  const reveals = [card.term, card.meaning]
    .map((field) => normaliseTerm(field ?? ""))
    .some((answer) => answer.length >= 3 && text.includes(answer));
  if (reveals) {
    throw new ServiceError(
      "invalid",
      "Describe what the picture shows without naming the term or the meaning.",
    );
  }
}

async function storeImage(
  ctx: ServiceContext,
  card: Card,
  input: Uint8Array,
  source: { kind: CardImage["sourceKind"]; host: string | null },
  description: string | undefined,
  deps: CardImageStorage,
) {
  if (description !== undefined) checkDescription(card, description);
  const normalized = await normalizeBoundedImage(deps.images, input, CARD_IMAGE_SIDE);
  const imageId = newId();
  // A random key names neither the learner nor the card, as avatar keys do.
  const objectKey = `cards/${crypto.randomUUID()}.webp`;
  try {
    await deps.bucket.put(objectKey, normalized.bytes, {
      httpMetadata: { contentType: "image/webp" },
    });
  } catch {
    throw new ServiceError("unavailable", "The picture couldn’t be saved. Try again.");
  }

  const token = newId();
  const now = Date.now();
  let won = false;
  try {
    const [claimResult] = await ctx.db.batch([
      claim(ctx.db, card, token),
      ctx.db
        .update(schema.cardImages)
        .set({ status: "replaced", updatedAt: new Date(now) })
        .where(
          and(
            eq(schema.cardImages.cardId, card.id),
            sql`${schema.cardImages.status} in ('active', 'archived')`,
            claimed(card.id, token),
          ),
        ),
      insertWhen(
        ctx.db,
        schema.cardImages,
        {
          id: imageId,
          cardId: card.id,
          userId: card.userId,
          objectKey,
          contentType: "image/webp",
          width: normalized.width,
          height: normalized.height,
          byteSize: normalized.bytes.byteLength,
          description: description ?? null,
          sourceKind: source.kind,
          sourceHost: source.host,
          status: "active",
          createdBy: ctx.actor,
          createdAt: now,
          updatedAt: now,
        },
        schema.cards,
        claimedRow(card.id, token),
      ),
      ...stateStatementsForCard(ctx.db, card.id),
      auditIfClaimed(ctx, card, token, "set_image", {
        imageId,
        source: source.kind,
        sourceHost: source.host,
        width: normalized.width,
        height: normalized.height,
        ...(description === undefined ? {} : { description }),
      }),
    ]);
    won = landed(claimResult);
  } finally {
    // The object is kept only when this write's claim committed; nothing else knows its key.
    if (!won) {
      await deps.bucket
        .delete(objectKey)
        .catch(() => console.error("Discarding a card picture object failed"));
    }
  }
  if (!won) throw stale();
  return showCard(ctx, card.id);
}

async function setStatus(
  ctx: ServiceContext,
  card: Card,
  image: CardImage,
  status: "active" | "archived",
  action: string,
) {
  const token = newId();
  const [claimResult] = await ctx.db.batch([
    claim(ctx.db, card, token),
    ctx.db
      .update(schema.cardImages)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(schema.cardImages.id, image.id), claimed(card.id, token))),
    // Archiving can make a text fallback asked that the card never had a state for.
    ...stateStatementsForCard(ctx.db, card.id),
    auditIfClaimed(ctx, card, token, action, { imageId: image.id }),
  ]);
  if (!landed(claimResult)) throw stale();
  return showCard(ctx, card.id);
}

async function imageWithStatus(db: Db, cardId: string, status: CardImage["status"]) {
  const [image] = await db
    .select()
    .from(schema.cardImages)
    .where(and(eq(schema.cardImages.cardId, cardId), eq(schema.cardImages.status, status)))
    .orderBy(desc(schema.cardImages.updatedAt))
    .limit(1);
  return image;
}

/** Swap the card's image version for a token only this write knows, so the batch's gated statements run only if it won. */
function claim(db: Db, card: Card, token: string) {
  return db
    .update(schema.cards)
    .set({ imageVersion: token, updatedAt: new Date() })
    .where(
      and(eq(schema.cards.id, card.id), sql`${schema.cards.imageVersion} is ${card.imageVersion}`),
    );
}

/** The card row, as it stands once this write's claim has landed. */
function claimedRow(cardId: string, token: string) {
  return and(eq(schema.cards.id, cardId), eq(schema.cards.imageVersion, token)) as SQL;
}

function claimed(cardId: string, token: string) {
  return sql`exists (select 1 from cards where cards.id = ${cardId} and cards.image_version = ${token})`;
}

/** Whether the claim updated the card, read from the batch's own result. */
function landed(result: unknown): boolean {
  return (result as D1Result).meta.changes === 1;
}

function auditIfClaimed(
  ctx: ServiceContext,
  card: Card,
  token: string,
  action: string,
  payload: Record<string, unknown>,
) {
  return auditStatementWhen(
    ctx.db,
    { userId: card.userId, actor: ctx.actor, action, entity: "card", entityId: card.id, payload },
    schema.cards,
    claimedRow(card.id, token),
  );
}

function stale() {
  return new ServiceError(
    "conflict",
    "The picture changed since this card was read. Read the card again and retry.",
  );
}
