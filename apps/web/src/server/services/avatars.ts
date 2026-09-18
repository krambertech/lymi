import type { AvatarOut } from "@lymi/core";
import { IMAGE_LIMITS } from "@lymi/core";
import { and, eq, isNull, lt, or } from "@lymi/core/db";
import type { UserAvatar } from "@lymi/core/schema";
import { schema } from "../db";
import { audit } from "./audit";
import { type ServiceContext, ServiceError } from "./context";
import { normalizeSquareImage, readAtMost } from "./images";

/** Big enough for the largest avatar on a 3x screen, small enough to fetch on every screen. */
export const AVATAR_SIZE = 320;

export interface AvatarStorage {
  bucket: R2Bucket;
  images: ImagesBinding;
}

type AvatarRow = Pick<
  UserAvatar,
  "customKey" | "customVersion" | "customRevision" | "googleKey" | "googleVersion"
>;

export function describeAvatar(row: AvatarRow | undefined): AvatarOut {
  const hasGoogle = Boolean(row?.googleKey && row.googleVersion);
  const revision = row?.customRevision ?? 0;
  if (row?.customKey && row.customVersion) {
    return { source: "custom", version: row.customVersion, revision, hasGoogle };
  }
  if (hasGoogle)
    return { source: "google", version: row?.googleVersion ?? null, revision, hasGoogle };
  return { source: null, version: null, revision, hasGoogle };
}

export async function getAvatar(ctx: ServiceContext): Promise<AvatarOut> {
  requireLearner(ctx);
  return describeAvatar(await avatarRow(ctx));
}

/** The active image, only by its current version, so an old URL can never show a newer photo. */
export async function avatarImage(
  ctx: ServiceContext,
  storage: AvatarStorage,
  version: string,
): Promise<R2ObjectBody> {
  requireLearner(ctx);
  const row = await avatarRow(ctx);
  const active = describeAvatar(row);
  if (!row || active.version !== version) throw new ServiceError("not_found", "Avatar not found");
  const key = active.source === "custom" ? row.customKey : row.googleKey;
  const object = key ? await storage.bucket.get(key) : null;
  if (!object) throw new ServiceError("not_found", "Avatar not found");
  return object;
}

/**
 * Replaces the learner's own photo. `baseRevision` is the revision the learner saw when they
 * chose the image; if anything changed since, nothing is written and the caller is told.
 */
export async function uploadAvatar(
  ctx: ServiceContext,
  storage: AvatarStorage,
  bytes: Uint8Array,
  baseRevision: number,
): Promise<AvatarOut> {
  requireLearner(ctx);
  const image = await normalizeSquareImage(storage.images, bytes, AVATAR_SIZE);
  const previous = await ensureAvatarRow(ctx);
  if (previous.customRevision !== baseRevision) throw staleChoice();

  const key = newObjectKey();
  await putImage(storage, key, image.bytes);
  const [updated] = await ctx.db
    .update(schema.userAvatars)
    .set({
      customKey: key,
      customVersion: crypto.randomUUID(),
      customRevision: baseRevision + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.userAvatars.userId, ctx.userId),
        eq(schema.userAvatars.customRevision, baseRevision),
      ),
    )
    .returning();
  if (!updated) {
    await discard(storage, key);
    throw staleChoice();
  }
  if (previous.customKey) await discard(storage, previous.customKey);
  await audit(ctx, { entity: "account", action: "avatar.upload", id: ctx.userId });
  return describeAvatar(updated);
}

/** Removes the learner's own photo, so the Google photo, or the initial, shows again. */
export async function removeAvatar(
  ctx: ServiceContext,
  storage: AvatarStorage,
  baseRevision: number,
): Promise<AvatarOut> {
  requireLearner(ctx);
  const previous = await ensureAvatarRow(ctx);
  if (previous.customRevision !== baseRevision) throw staleChoice();
  if (!previous.customKey) return describeAvatar(previous);

  const [updated] = await ctx.db
    .update(schema.userAvatars)
    .set({
      customKey: null,
      customVersion: null,
      customRevision: baseRevision + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.userAvatars.userId, ctx.userId),
        eq(schema.userAvatars.customRevision, baseRevision),
      ),
    )
    .returning();
  if (!updated) throw staleChoice();
  await discard(storage, previous.customKey);
  await audit(ctx, { entity: "account", action: "avatar.remove", id: ctx.userId });
  return describeAvatar(updated);
}

export function hasGoogleAvatar(row: AvatarRow | undefined): boolean {
  return Boolean(row?.googleKey);
}

export async function avatarRow(ctx: Pick<ServiceContext, "db" | "userId">) {
  const [row] = await ctx.db
    .select()
    .from(schema.userAvatars)
    .where(eq(schema.userAvatars.userId, ctx.userId));
  return row;
}

/**
 * Stores the Google photo as the fallback. It never touches the learner's own photo, and a
 * fetch that started before the stored one is dropped. Any failure leaves the previous
 * fallback where it was.
 */
export async function importGoogleAvatar(
  ctx: Pick<ServiceContext, "db" | "userId">,
  storage: AvatarStorage,
  pictureUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<"stored" | "skipped"> {
  const startedAt = new Date();
  const bytes = await fetchGooglePhoto(pictureUrl, fetcher);
  const image = await normalizeSquareImage(storage.images, bytes, AVATAR_SIZE);
  const previous = await ensureAvatarRow(ctx);
  if (previous.googleFetchedAt && previous.googleFetchedAt >= startedAt) return "skipped";

  const key = newObjectKey();
  await putImage(storage, key, image.bytes);
  const [updated] = await ctx.db
    .update(schema.userAvatars)
    .set({
      googleKey: key,
      googleVersion: crypto.randomUUID(),
      googleFetchedAt: startedAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.userAvatars.userId, ctx.userId),
        previous.googleKey
          ? eq(schema.userAvatars.googleKey, previous.googleKey)
          : isNull(schema.userAvatars.googleKey),
        or(
          isNull(schema.userAvatars.googleFetchedAt),
          lt(schema.userAvatars.googleFetchedAt, startedAt),
        ),
      ),
    )
    .returning({ userId: schema.userAvatars.userId });
  if (!updated) {
    await discard(storage, key);
    return "skipped";
  }
  if (previous.googleKey) await discard(storage, previous.googleKey);
  await audit(
    { ...ctx, actor: "system" },
    { entity: "account", action: "avatar.google_refresh", id: ctx.userId },
  );
  return "stored";
}

/** The `picture` claim of a Google ID token, or null when it has none or is not a token. */
export function pictureFromIdToken(idToken: string): string | null {
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const claims: unknown = JSON.parse(new TextDecoder().decode(bytes));
    const picture = (claims as { picture?: unknown } | null)?.picture;
    return typeof picture === "string" && picture ? picture : null;
  } catch {
    return null;
  }
}

const GOOGLE_PHOTO_TIMEOUT_MS = 5_000;
const GOOGLE_PHOTO_MAX_REDIRECTS = 3;
/** Google serves profile photos at any size; ask for one close to what is kept. */
const GOOGLE_PHOTO_SIZE = 512;

/** Only Google's photo host, over HTTPS, within a time, redirect and byte budget. */
export async function fetchGooglePhoto(
  pictureUrl: string,
  fetcher: typeof fetch = fetch,
): Promise<Uint8Array> {
  const signal = AbortSignal.timeout(GOOGLE_PHOTO_TIMEOUT_MS);
  let url = googlePhotoUrl(pictureUrl);
  for (let hop = 0; hop <= GOOGLE_PHOTO_MAX_REDIRECTS; hop++) {
    const response = await fetcher(url, {
      redirect: "manual",
      signal,
      headers: { accept: "image/webp,image/png,image/jpeg" },
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) break;
      url = googlePhotoUrl(new URL(location, url).toString(), { resize: false });
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("Google photo request failed");
    }
    const declared = Number(response.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > IMAGE_LIMITS.maxBytes) {
      await response.body?.cancel();
      throw new Error("Google photo is too large");
    }
    const bytes = await readAtMost(response.body, IMAGE_LIMITS.maxBytes);
    if (!bytes?.byteLength) throw new Error("Google photo is empty or too large");
    return bytes;
  }
  throw new Error("Google photo redirected too often");
}

/** The URL to fetch, or a throw when it is not on Google's photo host. */
export function googlePhotoUrl(value: string, { resize = true } = {}): URL {
  const url = new URL(value);
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.port || url.username || url.password) {
    throw new Error("Google photo URL is not a plain HTTPS URL");
  }
  if (!host.endsWith(".googleusercontent.com")) {
    throw new Error("Google photo URL is not on Google's photo host");
  }
  if (resize) url.pathname = url.pathname.replace(/=s\d+(-c)?$/, `=s${GOOGLE_PHOTO_SIZE}-c`);
  return url;
}

function requireLearner(ctx: ServiceContext) {
  if (ctx.actor !== "user") {
    throw new ServiceError("forbidden", "Only the learner can change their photo, from the app.");
  }
}

function staleChoice() {
  return new ServiceError("conflict", "The photo changed somewhere else. Reload and try again.");
}

async function ensureAvatarRow(ctx: Pick<ServiceContext, "db" | "userId">) {
  const existing = await avatarRow(ctx);
  if (existing) return existing;
  await ctx.db.insert(schema.userAvatars).values({ userId: ctx.userId }).onConflictDoNothing();
  const created = await avatarRow(ctx);
  if (!created) throw new Error("user_avatars insert did not land");
  return created;
}

/** Random, so a key says nothing about whose photo it is or where it came from. */
function newObjectKey() {
  return `avatars/${crypto.randomUUID()}.webp`;
}

async function putImage(storage: AvatarStorage, key: string, bytes: Uint8Array) {
  try {
    await storage.bucket.put(key, bytes, { httpMetadata: { contentType: "image/webp" } });
  } catch {
    throw new ServiceError("unavailable", "The photo couldn’t be saved. Try again.");
  }
}

/** An orphaned object is only storage; failing to delete one must not fail the write. */
async function discard(storage: AvatarStorage, key: string) {
  try {
    await storage.bucket.delete(key);
  } catch {
    console.error("Discarding a replaced avatar object failed");
  }
}
