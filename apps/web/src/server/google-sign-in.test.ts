import { crc32, deflateSync } from "node:zlib";
import { eq } from "@lymi/core/db";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createAuth } from "./auth";
import { type Db, schema } from "./db";
import type { Bindings } from "./env";
import { getAvatar, uploadAvatar } from "./services/avatars";
import { type TestBindings, testDb } from "./services/test-db";

const PRODUCT_URL = "http://localhost:4999";
const EMAIL = "google-learner@lymi.test";

let db: Db;
let env: Bindings;
let dispose: () => Promise<void>;
const realFetch = globalThis.fetch;

beforeAll(async () => {
  let bindings: TestBindings;
  ({ db, env: bindings, dispose } = await testDb());
  env = {
    ...bindings,
    PRODUCT_URL,
    PUBLIC_SITE_URL: PRODUCT_URL,
    ALLOWED_EMAILS: EMAIL,
    BETTER_AUTH_SECRET: "a-test-secret-that-is-long-enough-for-better-auth",
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "client-secret",
  } as unknown as Bindings;
}, 60_000);

afterAll(async () => {
  await dispose();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function png(size: number, rgb: [number, number, number]) {
  const row = [0, ...Array.from({ length: size }, () => [...rgb, 255]).flat()];
  const chunk = (kind: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(kind, "ascii"), data]);
    const out = Buffer.alloc(12 + data.length);
    out.writeUInt32BE(data.length, 0);
    body.copy(out, 4);
    out.writeUInt32BE(crc32(body), 8 + data.length);
    return out;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(Buffer.from(Array.from({ length: size }, () => row).flat()))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/**
 * Google, as far as a sign-in touches it: the token endpoint returns an ID token naming
 * `picture`, and the photo host serves `photo`. Every other request goes out as usual.
 */
function stubGoogle(picture: string, photo: () => Response) {
  const photoRequests: string[] = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.hostname === "oauth2.googleapis.com") {
      const claims = {
        iss: "https://accounts.google.com",
        aud: "client-id",
        sub: "google-subject-1",
        email: EMAIL,
        email_verified: true,
        name: "Google Learner",
        picture,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };
      const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
      return Response.json({
        access_token: "access",
        id_token: `${part({ alg: "RS256", kid: "k" })}.${part(claims)}.sig`,
        expires_in: 3600,
        token_type: "Bearer",
        scope: "openid email profile",
      });
    }
    if (url.hostname.endsWith(".googleusercontent.com")) {
      photoRequests.push(url.toString());
      return photo();
    }
    return realFetch(input, init);
  });
  return photoRequests;
}

function cookiesFrom(response: Response, jar: Map<string, string>) {
  for (const cookie of response.headers.getSetCookie()) {
    const [pair] = cookie.split(";");
    const [name, ...value] = (pair ?? "").split("=");
    if (name) jar.set(name.trim(), value.join("="));
  }
}

function cookieHeader(jar: Map<string, string>) {
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}

/** The whole redirect sign-in against the real auth handler, as a browser would drive it. */
async function signInWithGoogle(pending: Promise<unknown>[]) {
  const auth = createAuth(env, db, (work) => pending.push(work));
  const jar = new Map<string, string>();
  const start = await auth.handler(
    new Request(`${PRODUCT_URL}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: PRODUCT_URL },
      body: JSON.stringify({ provider: "google", callbackURL: "/today" }),
    }),
  );
  expect(start.status).toBe(200);
  cookiesFrom(start, jar);
  const { url } = (await start.json()) as { url: string };
  const state = new URL(url).searchParams.get("state") ?? "";

  const callback = await auth.handler(
    new Request(`${PRODUCT_URL}/api/auth/callback/google?code=the-code&state=${state}`, {
      headers: { cookie: cookieHeader(jar) },
    }),
  );
  cookiesFrom(callback, jar);
  const location = callback.headers.get("location") ?? "";
  const [user] = await db.select().from(schema.user).where(eq(schema.user.email, EMAIL));
  return { status: callback.status, location, jar, userId: user?.id as string };
}

const learnerCtx = (userId: string) => ({ db, userId, actor: "user" as const });

describe("signing in with Google", () => {
  it("stores the Google photo before the first screen, on the first sign-in", async () => {
    const photos = stubGoogle(
      "https://lh3.googleusercontent.com/a/first=s96-c",
      () => new Response(png(96, [30, 90, 200])),
    );
    const pending: Promise<unknown>[] = [];
    const result = await signInWithGoogle(pending);

    expect(result.status).toBe(302);
    expect(result.location).toBe("/today");
    expect(result.jar.has("lymi-4999.session_token")).toBe(true);
    // Registered with waitUntil as a safety net, but already stored when the callback answers.
    expect(pending).toHaveLength(1);
    expect(photos).toEqual(["https://lh3.googleusercontent.com/a/first=s512-c"]);
    expect(await getAvatar(learnerCtx(result.userId))).toMatchObject({
      source: "google",
      hasGoogle: true,
    });
  });

  it("refreshes the fallback on a later sign-in after the response, and keeps an upload", async () => {
    const [user] = await db.select().from(schema.user).where(eq(schema.user.email, EMAIL));
    const ctx = learnerCtx(user?.id as string);
    const before = await getAvatar(ctx);

    stubGoogle(
      "https://lh3.googleusercontent.com/a/second=s96-c",
      () => new Response(png(96, [200, 60, 60])),
    );
    const pending: Promise<unknown>[] = [];
    const refresh = await signInWithGoogle(pending);
    expect(refresh.status).toBe(302);
    expect(pending).toHaveLength(1);
    await Promise.all(pending);
    const refreshed = await getAvatar(ctx);
    expect(refreshed.source).toBe("google");
    expect(refreshed.version).not.toBe(before.version);

    const custom = await uploadAvatar(
      ctx,
      { bucket: env.PRIVATE_IMAGES, images: env.IMAGES },
      png(64, [10, 10, 10]),
      refreshed.revision,
    );
    const later: Promise<unknown>[] = [];
    await signInWithGoogle(later);
    await Promise.all(later);
    expect(await getAvatar(ctx)).toEqual(custom);
  });

  it("still signs the learner in when Google's photo fails, and keeps the old fallback", async () => {
    const [user] = await db.select().from(schema.user).where(eq(schema.user.email, EMAIL));
    const ctx = learnerCtx(user?.id as string);
    const [row] = await db
      .select()
      .from(schema.userAvatars)
      .where(eq(schema.userAvatars.userId, ctx.userId));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    for (const photo of [
      () => new Response("nope", { status: 500 }),
      () => {
        throw new TypeError("network down");
      },
      () => new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } }),
    ]) {
      stubGoogle("https://lh3.googleusercontent.com/a/broken=s96-c", photo);
      const pending: Promise<unknown>[] = [];
      const result = await signInWithGoogle(pending);
      await Promise.all(pending);
      expect(result.status).toBe(302);
      expect(result.location).toBe("/today");
    }

    const [after] = await db
      .select()
      .from(schema.userAvatars)
      .where(eq(schema.userAvatars.userId, ctx.userId));
    expect(after?.googleKey).toBe(row?.googleKey);
    expect(after?.googleVersion).toBe(row?.googleVersion);
    // The log line names what failed, never the URL, the bytes or the learner.
    for (const call of error.mock.calls) {
      expect(String(call[0])).toBe("Importing the Google photo failed");
    }
  });

  it("never fetches a picture that is not on Google's photo host", async () => {
    const photos = stubGoogle(
      "https://attacker.example/me.png",
      () => new Response(png(96, [0, 0, 0])),
    );
    vi.spyOn(console, "error").mockImplementation(() => {});
    const pending: Promise<unknown>[] = [];
    const result = await signInWithGoogle(pending);
    await Promise.all(pending);
    expect(result.status).toBe(302);
    expect(photos).toEqual([]);
  });
});
