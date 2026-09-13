import type { CardImageImportInput, CardImagePatch, CardImageVersionInput } from "@lymi/core";
import { newId, normaliseTerm } from "@lymi/core";
import { and, desc, eq, sql } from "@lymi/core/db";
import type { Card, CardImage } from "@lymi/core/schema";
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

/** Fetch a public link once and store a private copy. The link itself is never kept. */
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

/** Change what the active picture's description says. Null suspends the picture modes. */
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
  const audit = auditIfClaimed(ctx, card, token, "update_image", {
    imageId: image.id,
    description: patch.description,
  });
  await ctx.db.batch([
    claim(ctx.db, card, token),
    ctx.db
      .update(schema.cardImages)
      .set({ description: patch.description, updatedAt: new Date() })
      .where(and(eq(schema.cardImages.id, image.id), claimed(card.id, token))),
    ...stateStatementsForCard(ctx.db, card.id),
    audit.statement,
  ]);
  await confirm(ctx.db, audit.id);
  return showCard(ctx, card.id);
}

/** Hide the picture. Picture modes pause with their schedules intact until restore. */
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

/** The active picture's bytes for anyone who can see the card. Old versions are not served. */
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
  const audit = auditIfClaimed(ctx, card, token, "set_image", {
    imageId,
    source: source.kind,
    sourceHost: source.host,
    width: normalized.width,
    height: normalized.height,
    ...(description === undefined ? {} : { description }),
  });
  try {
    await ctx.db.batch([
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
      ctx.db.insert(schema.cardImages).select(
        sql`select ${imageId}, ${card.id}, ${card.userId}, ${objectKey}, 'image/webp',
          ${normalized.width}, ${normalized.height}, ${normalized.bytes.byteLength},
          ${description ?? null}, ${source.kind}, ${source.host}, 'active', ${ctx.actor},
          ${now}, ${now}
        where ${claimed(card.id, token)}`,
      ),
      ...stateStatementsForCard(ctx.db, card.id),
      audit.statement,
    ]);
    await confirm(ctx.db, audit.id);
  } catch (error) {
    // Only this write knew the key, so nothing else can refer to the object.
    await deps.bucket
      .delete(objectKey)
      .catch(() => console.error("Discarding a card picture object failed"));
    throw error;
  }
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
  const audit = auditIfClaimed(ctx, card, token, action, { imageId: image.id });
  await ctx.db.batch([
    claim(ctx.db, card, token),
    ctx.db
      .update(schema.cardImages)
      .set({ status, updatedAt: new Date() })
      .where(and(eq(schema.cardImages.id, image.id), claimed(card.id, token))),
    // Archiving can make a text fallback asked that the card never had a state for.
    ...stateStatementsForCard(ctx.db, card.id),
    audit.statement,
  ]);
  await confirm(ctx.db, audit.id);
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

/**
 * Take the card's image version from what this write read to a token only it knows. Every other
 * statement in the batch runs only if the claim landed, so a concurrent change wins cleanly.
 */
function claim(db: Db, card: Card, token: string) {
  return db
    .update(schema.cards)
    .set({ imageVersion: token, updatedAt: new Date() })
    .where(
      and(eq(schema.cards.id, card.id), sql`${schema.cards.imageVersion} is ${card.imageVersion}`),
    );
}

function claimed(cardId: string, token: string) {
  return sql`exists (select 1 from cards where cards.id = ${cardId} and cards.image_version = ${token})`;
}

/** The audit row lands only with the claim, so its presence says whether this write won. */
async function confirm(db: Db, auditId: string) {
  const [row] = await db
    .select({ id: schema.auditLog.id })
    .from(schema.auditLog)
    .where(eq(schema.auditLog.id, auditId));
  if (!row) throw stale();
}

function auditIfClaimed(
  ctx: ServiceContext,
  card: Card,
  token: string,
  action: string,
  payload: Record<string, unknown>,
) {
  const id = newId();
  const statement = ctx.db.insert(schema.auditLog).select(
    sql`select ${id}, ${card.userId}, ${ctx.actor}, ${action}, 'card', ${card.id},
      ${JSON.stringify(payload)}, ${Date.now()}
    where ${claimed(card.id, token)}`,
  );
  return { id, statement };
}

function stale() {
  return new ServiceError(
    "conflict",
    "The picture changed since this card was read. Read the card again and retry.",
  );
}
