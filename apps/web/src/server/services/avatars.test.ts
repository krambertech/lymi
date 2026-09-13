import { crc32, deflateSync } from "node:zlib";
import { sniffImage } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import type { AppEnv } from "../index";
import { avatar } from "../routes/avatar";
import {
  type AvatarStorage,
  avatarImage,
  fetchGooglePhoto,
  getAvatar,
  googlePhotoUrl,
  importGoogleAvatar,
  pictureFromIdToken,
  removeAvatar,
  uploadAvatar,
} from "./avatars";
import type { ServiceContext } from "./context";
import { learner, type TestBindings, testDb } from "./test-db";

let db: Db;
let env: TestBindings;
let dispose: () => Promise<void>;
let storage: AvatarStorage;
let kateryna: ServiceContext;
let olena: ServiceContext;

beforeAll(async () => {
  ({ db, env, dispose } = await testDb());
  storage = { bucket: env.PRIVATE_IMAGES, images: env.IMAGES };
  kateryna = await learner(db, "kateryna", "Kateryna");
  olena = await learner(db, "olena", "Olena");
}, 60_000);

afterAll(async () => {
  await dispose();
});

/** A solid-colour RGBA PNG, built by hand so the test needs no image library. */
function png(width: number, height: number, rgb: [number, number, number] = [200, 120, 40]) {
  const row = [0, ...Array.from({ length: width }, () => [...rgb, 255]).flat()];
  const raw = Buffer.from(Array.from({ length: height }, () => row).flat());
  const chunk = (kind: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(kind, "ascii"), data]);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), 8 + data.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return new Uint8Array(
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", header),
      chunk("IDAT", deflateSync(raw)),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

/** A JPEG carrying an EXIF segment with a location in it, as a phone camera would write. */
async function jpegWithLocation() {
  const result = await env.IMAGES.input(new Response(png(400, 300)).body as ReadableStream)
    .transform({ width: 400, height: 300 })
    .output({ format: "image/jpeg" });
  const jpeg = new Uint8Array(await new Response(result.image()).arrayBuffer());
  const exif = Buffer.from("Exif\0\0GPS 50.4501N 30.5234E", "ascii");
  const segment = Buffer.alloc(4 + exif.length);
  segment.set([0xff, 0xe1], 0);
  segment.writeUInt16BE(exif.length + 2, 2);
  exif.copy(segment, 4);
  return new Uint8Array(Buffer.concat([jpeg.slice(0, 2), segment, jpeg.slice(2)]));
}

function photoFetcher(bytes: Uint8Array, status = 200): typeof fetch {
  return (async () =>
    new Response(status === 200 ? (bytes as unknown as BodyInit) : null, {
      status,
    })) as typeof fetch;
}

const GOOGLE_PICTURE = "https://lh3.googleusercontent.com/a/photo-id=s96-c";

async function objectBytes(ctx: ServiceContext, version: string) {
  const object = await avatarImage(ctx, storage, version);
  return new Uint8Array(await object.arrayBuffer());
}

async function storedObjects() {
  return (await env.PRIVATE_IMAGES.list()).objects.map((o) => o.key).sort();
}

describe("uploads", () => {
  it("stores one square WebP without the file's metadata, and serves it by version", async () => {
    const saved = await uploadAvatar(kateryna, storage, await jpegWithLocation(), 0);

    expect(saved).toMatchObject({ source: "custom", revision: 1 });
    const bytes = await objectBytes(kateryna, saved.version as string);
    expect(sniffImage(bytes)).toMatchObject({ type: "image/webp", width: 320, height: 320 });
    expect(Buffer.from(bytes).includes("GPS")).toBe(false);
    const [key] = await storedObjects();
    expect(key).toMatch(/^avatars\/[0-9a-f-]{36}\.webp$/);
    expect(key).not.toContain("kateryna");
  });

  it("refuses a change made from an older revision and keeps the photo that is there", async () => {
    const before = await getAvatar(kateryna);
    const objects = await storedObjects();

    await expect(uploadAvatar(kateryna, storage, png(64, 64), 0)).rejects.toMatchObject({
      code: "conflict",
    });
    await expect(removeAvatar(kateryna, storage, 0)).rejects.toMatchObject({ code: "conflict" });
    expect(await getAvatar(kateryna)).toEqual(before);
    expect(await storedObjects()).toEqual(objects);
  });

  it("refuses SVG, animation and malformed bytes without touching the photo", async () => {
    const before = await getAvatar(kateryna);
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');
    const truncated = png(64, 64).slice(0, 40);
    const apng = png(64, 64);
    const animated = new Uint8Array([
      ...apng.slice(0, 33),
      0,
      0,
      0,
      8,
      ...new TextEncoder().encode("acTL"),
      0,
      0,
      0,
      2,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      ...apng.slice(33),
    ]);

    for (const bytes of [svg, truncated, animated]) {
      await expect(uploadAvatar(kateryna, storage, bytes, before.revision)).rejects.toMatchObject({
        code: "invalid",
      });
    }
    expect(await getAvatar(kateryna)).toEqual(before);
  });

  it("replaces the previous upload and forgets its object and URL", async () => {
    const before = await getAvatar(kateryna);
    const after = await uploadAvatar(kateryna, storage, png(500, 200), before.revision);

    expect(after.version).not.toBe(before.version);
    expect(await storedObjects()).toHaveLength(1);
    await expect(avatarImage(kateryna, storage, before.version as string)).rejects.toMatchObject({
      code: "not_found",
    });
  });
});

describe("who can see or change a photo", () => {
  it("refuses integrations, whatever their scope", async () => {
    const { version, revision } = await getAvatar(kateryna);
    for (const actor of ["api", "mcp"] as const) {
      const integration = { ...kateryna, actor };
      await expect(getAvatar(integration)).rejects.toMatchObject({ code: "forbidden" });
      await expect(avatarImage(integration, storage, version as string)).rejects.toMatchObject({
        code: "forbidden",
      });
      await expect(uploadAvatar(integration, storage, png(64, 64), revision)).rejects.toMatchObject(
        { code: "forbidden" },
      );
      await expect(removeAvatar(integration, storage, revision)).rejects.toMatchObject({
        code: "forbidden",
      });
    }
  });

  it("never serves one learner's photo to another", async () => {
    const { version } = await getAvatar(kateryna);
    await expect(avatarImage(olena, storage, version as string)).rejects.toMatchObject({
      code: "not_found",
    });
  });
});

describe("the Google photo", () => {
  it("shows until the learner uploads one, and never replaces that upload", async () => {
    const ctx = await learner(db, "taras", "Taras");
    expect(await getAvatar(ctx)).toEqual({
      source: null,
      version: null,
      revision: 0,
      hasGoogle: false,
    });

    await importGoogleAvatar(ctx, storage, GOOGLE_PICTURE, photoFetcher(png(96, 96)));
    const google = await getAvatar(ctx);
    expect(google).toMatchObject({ source: "google", revision: 0 });

    const custom = await uploadAvatar(ctx, storage, png(64, 64, [10, 10, 10]), 0);
    await importGoogleAvatar(ctx, storage, GOOGLE_PICTURE, photoFetcher(png(128, 128)));
    expect(await getAvatar(ctx)).toEqual(custom);

    const removed = await removeAvatar(ctx, storage, custom.revision);
    expect(removed).toMatchObject({ source: "google", revision: 2 });
    expect(removed.version).not.toBe(google.version);
  });

  it("keeps the previous fallback when a refresh fails", async () => {
    const ctx = await learner(db, "oksana", "Oksana");
    await importGoogleAvatar(ctx, storage, GOOGLE_PICTURE, photoFetcher(png(96, 96)));
    const before = await getAvatar(ctx);

    await expect(
      importGoogleAvatar(ctx, storage, GOOGLE_PICTURE, photoFetcher(new Uint8Array(), 500)),
    ).rejects.toThrow();
    await expect(
      importGoogleAvatar(ctx, storage, GOOGLE_PICTURE, photoFetcher(new Uint8Array([1, 2, 3]))),
    ).rejects.toThrow();
    expect(await getAvatar(ctx)).toEqual(before);
  });

  it("drops a fetch that started before the stored one", async () => {
    const ctx = await learner(db, "mykola", "Mykola");
    await importGoogleAvatar(ctx, storage, GOOGLE_PICTURE, photoFetcher(png(96, 96)));
    await db
      .update(schema.userAvatars)
      .set({ googleFetchedAt: new Date(Date.now() + 60_000) })
      .where(eq(schema.userAvatars.userId, ctx.userId));
    const before = await getAvatar(ctx);

    expect(
      await importGoogleAvatar(ctx, storage, GOOGLE_PICTURE, photoFetcher(png(128, 128))),
    ).toBe("skipped");
    expect(await getAvatar(ctx)).toEqual(before);
  });

  it("reads the photo from the ID token Google issued", () => {
    const token = (claims: object) =>
      `header.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.signature`;
    expect(pictureFromIdToken(token({ name: "Катерина", picture: GOOGLE_PICTURE }))).toBe(
      GOOGLE_PICTURE,
    );
    expect(pictureFromIdToken(token({ name: "Kateryna" }))).toBeNull();
    expect(pictureFromIdToken("not-a-token")).toBeNull();
    expect(pictureFromIdToken("a.%%%.b")).toBeNull();
  });

  it("fetches only Google's photo host, within a redirect budget", async () => {
    expect(() => googlePhotoUrl("https://example.com/a.png")).toThrow();
    expect(() => googlePhotoUrl("http://lh3.googleusercontent.com/a/x=s96-c")).toThrow();
    expect(() => googlePhotoUrl("https://googleusercontent.com.evil.example/a")).toThrow();
    expect(googlePhotoUrl(GOOGLE_PICTURE).toString()).toBe(
      "https://lh3.googleusercontent.com/a/photo-id=s512-c",
    );

    const offHost: typeof fetch = (async () =>
      new Response(null, {
        status: 302,
        headers: { location: "https://169.254.169.254/latest" },
      })) as typeof fetch;
    await expect(fetchGooglePhoto(GOOGLE_PICTURE, offHost)).rejects.toThrow();

    const loop: typeof fetch = (async () =>
      new Response(null, { status: 302, headers: { location: GOOGLE_PICTURE } })) as typeof fetch;
    await expect(fetchGooglePhoto(GOOGLE_PICTURE, loop)).rejects.toThrow(/redirected/);

    const huge: typeof fetch = (async () =>
      new Response("x", {
        headers: { "content-length": String(50 * 1024 * 1024) },
      })) as typeof fetch;
    await expect(fetchGooglePhoto(GOOGLE_PICTURE, huge)).rejects.toThrow(/too large/);
  });
});

describe("routes", () => {
  function appFor(ctx: ServiceContext) {
    const app = new Hono<AppEnv>();
    app.use("*", async (c, next) => {
      c.set("db", db);
      c.set("user", { id: ctx.userId } as AppEnv["Variables"]["user"]);
      c.set("actor", ctx.actor);
      c.set("scope", "write");
      await next();
    });
    app.route("/api/avatar", avatar);
    app.onError((err, c) => c.json({ error: err.message }, "code" in err ? 400 : 500));
    return app;
  }

  it("serves the image privately and never to a key", async () => {
    const { version } = await getAvatar(kateryna);
    const bindings = env as unknown as AppEnv["Bindings"];

    const response = await appFor(kateryna).request(`/api/avatar/${version}`, {}, bindings);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");

    const key = { ...kateryna, actor: "api" as const };
    expect((await appFor(key).request(`/api/avatar/${version}`, {}, bindings)).status).toBe(403);
    expect((await appFor(key).request("/api/avatar", {}, bindings)).status).toBe(403);
  });

  it("needs the revision the change was made from", async () => {
    const bindings = env as unknown as AppEnv["Bindings"];
    const response = await appFor(kateryna).request(
      "/api/avatar",
      { method: "PUT", body: png(64, 64), headers: { "content-type": "image/png" } },
      bindings,
    );
    expect(response.status).toBe(400);
  });
});
