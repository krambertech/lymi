import { and, eq } from "@lymi/core/db";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuth } from "./auth";
import { type Db, schema } from "./db";
import type { Bindings } from "./env";
import { clearLocalEmailOutbox, latestLocalEmail } from "./services/email";
import { type TestBindings, testDb } from "./services/test-db";

/** Loopback, so every message this file sends lands in the readable outbox. */
const PRODUCT_URL = "http://127.0.0.1:4998";
const PASSWORD = "a-good-enough-password";
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
    BETTER_AUTH_SECRET: "a-test-secret-that-is-long-enough-for-better-auth",
    GOOGLE_CLIENT_ID: "client-id",
    GOOGLE_CLIENT_SECRET: "client-secret",
  } as unknown as Bindings;
}, 60_000);

afterAll(async () => {
  await dispose();
});

beforeEach(() => {
  clearLocalEmailOutbox();
  vi.unstubAllGlobals();
});

const auth = () => createAuth(env, db);

function post(path: string, body: unknown, cookie?: string) {
  return auth().handler(
    new Request(`${PRODUCT_URL}/api/auth${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: PRODUCT_URL,
        ...(cookie ? { cookie } : {}),
      },
      body: JSON.stringify(body),
    }),
  );
}

const signUp = (email: string, password = PASSWORD, name?: string) =>
  post("/sign-up/email", { email, password, name: name ?? email.split("@")[0] });

/** The cookie that says this browser is the one that signed up. */
function signUpCookieFrom(response: Response): string {
  const cookie = response.headers
    .getSetCookie()
    .find((value) => value.includes("-signup=") || value.includes("lymi-signup="));
  return (cookie ?? "").split(";")[0] ?? "";
}

const signIn = (email: string, password = PASSWORD) => post("/sign-in/email", { email, password });

/** Open the confirmation link the last message to this address carried. */
async function openLastLink(email: string, cookie?: string) {
  const message = latestLocalEmail(email);
  const url = /https?:\/\/\S+/.exec(message?.text ?? "")?.[0];
  expect(url, `no link in the ${message?.kind} message`).toBeDefined();
  return auth().handler(
    new Request(url as string, {
      headers: { origin: PRODUCT_URL, ...(cookie ? { cookie } : {}) },
    }),
  );
}

/** The ordinary flow: sign up and confirm from the same browser, so the password survives. */
async function signUpAndConfirm(email: string, password = PASSWORD) {
  const created = await signUp(email, password);
  expect(created.status).toBe(200);
  const confirmed = await openLastLink(email, signUpCookieFrom(created));
  expect(confirmed.headers.getSetCookie().join(";")).toContain("session_token");
  return confirmed;
}

const usersWith = (email: string) =>
  db.select().from(schema.user).where(eq(schema.user.email, email));

const credentialsOf = (userId: string) =>
  db
    .select()
    .from(schema.account)
    .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, "credential")));

/** Google, as far as a sign-in touches it: the token endpoint returns a verified address. */
function stubGoogle(email: string) {
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.hostname !== "oauth2.googleapis.com") return realFetch(input, init);
    const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const claims = {
      iss: "https://accounts.google.com",
      aud: "client-id",
      sub: `google-${email}`,
      email,
      email_verified: true,
      name: "Google Learner",
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    };
    return Response.json({
      access_token: "access",
      id_token: `${part({ alg: "RS256", kid: "k" })}.${part(claims)}.sig`,
      expires_in: 3600,
      token_type: "Bearer",
      scope: "openid email profile",
    });
  });
}

async function signInWithGoogle(email: string) {
  stubGoogle(email);
  const instance = createAuth(env, db);
  const jar = new Map<string, string>();
  const collect = (response: Response) => {
    for (const cookie of response.headers.getSetCookie()) {
      const [name, ...value] = (cookie.split(";")[0] ?? "").split("=");
      if (name) jar.set(name.trim(), value.join("="));
    }
  };
  const start = await instance.handler(
    new Request(`${PRODUCT_URL}/api/auth/sign-in/social`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: PRODUCT_URL },
      body: JSON.stringify({ provider: "google", callbackURL: "/today" }),
    }),
  );
  collect(start);
  const { url } = (await start.json()) as { url: string };
  const state = new URL(url).searchParams.get("state") ?? "";
  const callback = await instance.handler(
    new Request(`${PRODUCT_URL}/api/auth/callback/google?code=the-code&state=${state}`, {
      headers: { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; ") },
    }),
  );
  return callback;
}

describe("creating an account with an email and a password", () => {
  it("grants nothing until the address is confirmed, then signs the learner in", async () => {
    const email = "ada@lymi.test";
    const created = await signUp(email);

    expect(created.status).toBe(200);
    // No session: the address is unproven, so sign-up hands out no way in.
    expect(await created.json()).toMatchObject({ token: null });
    expect(created.headers.getSetCookie().join(";")).not.toContain("session_token");
    expect(latestLocalEmail(email)).toMatchObject({
      kind: "verify-email",
      subject: "Confirm your email address",
    });

    const early = await signIn(email);
    expect(early.status).toBe(403);
    expect(await early.json()).toMatchObject({ code: "EMAIL_NOT_VERIFIED" });

    const confirmed = await openLastLink(email, signUpCookieFrom(created));
    // `autoSignInAfterVerification` means the link itself is the sign-in.
    expect(confirmed.headers.getSetCookie().join(";")).toContain("session_token");

    const later = await signIn(email);
    expect(later.status).toBe(200);
  });

  it("answers a taken address exactly as a free one, and tells the address owner", async () => {
    const email = "grace@lymi.test";
    await signUpAndConfirm(email);
    clearLocalEmailOutbox();

    const again = await signUp(email, "someone-elses-password");
    expect(again.status).toBe(200);
    expect(await again.json()).toMatchObject({ user: { email, emailVerified: false } });
    await expect(usersWith(email)).resolves.toHaveLength(1);
    expect(latestLocalEmail(email)).toMatchObject({
      kind: "existing-account",
      subject: "You already have a Lymi account",
    });

    // The address still opens with its own password, and never with the second one.
    expect((await signIn(email, "someone-elses-password")).status).toBe(401);
    expect((await signIn(email)).status).toBe(200);
  });

  it("takes any address: sign-up is open to everyone", async () => {
    const email = "stranger@lymi.test";
    const created = await signUp(email);

    expect(created.status).toBe(200);
    await expect(usersWith(email)).resolves.toHaveLength(1);
    expect(latestLocalEmail(email)).toMatchObject({ kind: "verify-email" });
    expect((await signIn(email)).status).toBe(403);

    await openLastLink(email, signUpCookieFrom(created));
    expect((await signIn(email)).status).toBe(200);
  });
});

describe("resetting a password", () => {
  it("replaces the password, retires the old one and ends the other sessions", async () => {
    const email = "hedy@lymi.test";
    await signUpAndConfirm(email);
    const [user] = await usersWith(email);
    const before = await db
      .select()
      .from(schema.session)
      .where(eq(schema.session.userId, user?.id as string));
    expect(before.length).toBeGreaterThan(0);
    clearLocalEmailOutbox();

    const asked = await post("/request-password-reset", { email, redirectTo: "/reset-password" });
    expect(asked.status).toBe(200);
    expect(latestLocalEmail(email)).toMatchObject({ kind: "reset-password" });

    // The emailed link redirects to the page with the token on it.
    const opened = await openLastLink(email);
    const token = new URL(opened.headers.get("location") as string, PRODUCT_URL).searchParams.get(
      "token",
    );
    const reset = await post("/reset-password", { newPassword: "a-brand-new-password", token });
    expect(reset.status).toBe(200);

    expect((await signIn(email)).status).toBe(401);
    expect((await signIn(email, "a-brand-new-password")).status).toBe(200);
    await expect(
      db
        .select()
        .from(schema.session)
        .where(eq(schema.session.id, before[0]?.id as string)),
    ).resolves.toEqual([]);
    // Sessions are read from KV first, so a row left there would still open the app.
    expect(await env.SESSIONS.get(before[0]?.token as string)).toBeNull();
  });

  it("mints no second session when a confirmation link is opened twice", async () => {
    const email = "dorothy@lymi.test";
    const created = await signUp(email);
    const cookie = signUpCookieFrom(created);
    const first = await openLastLink(email, cookie);
    expect(first.headers.getSetCookie().join(";")).toContain("session_token");

    const replayed = await openLastLink(email, cookie);
    expect(replayed.headers.getSetCookie().join(";")).not.toContain("session_token");
  });

  it("answers an unknown address the same way and sends nothing", async () => {
    const asked = await post("/request-password-reset", {
      email: "nobody@lymi.test",
      redirectTo: "/reset-password",
    });
    expect(asked.status).toBe(200);
    expect(await asked.json()).toMatchObject({ status: true });
    expect(latestLocalEmail("nobody@lymi.test")).toBeNull();
  });
});

describe("keeping Google and password accounts apart", () => {
  it("takes the password off an account the moment Google proves the address", async () => {
    const email = "mary@lymi.test";
    // Someone types an address that is not theirs and never confirms it.
    await signUp(email, "not-my-address-password");
    const [user] = await usersWith(email);
    await expect(credentialsOf(user?.id as string)).resolves.toHaveLength(1);
    clearLocalEmailOutbox();

    const callback = await signInWithGoogle(email);
    expect(callback.status).toBe(302);
    expect(callback.headers.get("location")).toBe("/today");

    // One account, opened by Google alone.
    await expect(usersWith(email)).resolves.toHaveLength(1);
    await expect(credentialsOf(user?.id as string)).resolves.toEqual([]);
    expect((await signIn(email, "not-my-address-password")).status).toBe(401);
  });

  it("offers Google rather than a reset when the address has no password", async () => {
    const email = "mary@lymi.test";
    clearLocalEmailOutbox();
    const asked = await post("/request-password-reset", { email, redirectTo: "/reset-password" });

    expect(asked.status).toBe(200);
    expect(latestLocalEmail(email)).toMatchObject({
      kind: "reset-google-account",
      subject: "Your Lymi account signs in with Google",
    });
    // The link goes to the door, never to a form that would mint a password.
    expect(latestLocalEmail(email)?.text).not.toContain("/api/auth/reset-password");
  });

  it("creates no second account when a Google address is signed up with a password", async () => {
    const email = "mary@lymi.test";
    clearLocalEmailOutbox();
    const attempt = await signUp(email, "another-password");

    expect(attempt.status).toBe(200);
    await expect(usersWith(email)).resolves.toHaveLength(1);
    expect(latestLocalEmail(email)).toMatchObject({
      kind: "google-account",
      subject: "You already have a Lymi account",
    });
  });
});

describe("an address someone else signed up with first", () => {
  it("retires the password the owner never chose, and keeps the one they did", async () => {
    const email = "rosalind@lymi.test";
    // Someone with a join link types an address that is not theirs, and picks the password.
    const attempt = await signUp(email, "not-the-owners-password", "ATTACKER CHOSEN NAME");
    expect(attempt.status).toBe(200);
    const [user] = await usersWith(email);
    const userId = user?.id as string;
    await expect(credentialsOf(userId)).resolves.toHaveLength(1);

    // The owner reads their own inbox and confirms, from a browser that never signed up.
    const confirmed = await openLastLink(email);
    expect(confirmed.headers.getSetCookie().join(";")).toContain("session_token");
    await expect(credentialsOf(userId)).resolves.toEqual([]);
    expect((await signIn(email, "not-the-owners-password")).status).toBe(401);

    // The name the attacker chose does not survive either, and a reset link is on its way.
    const [owner] = await usersWith(email);
    expect(owner?.name).toBe("rosalind");
    expect(owner?.image).toBeNull();
    expect(latestLocalEmail(email)).toMatchObject({ kind: "reset-password" });
  });

  it("keeps the password when the browser that signed up is the one confirming", async () => {
    const email = "katherine@lymi.test";
    await signUpAndConfirm(email);

    const [user] = await usersWith(email);
    await expect(credentialsOf(user?.id as string)).resolves.toHaveLength(1);
    expect((await signIn(email)).status).toBe(200);
  });
});

describe("what a Google sign-in leaves behind", () => {
  it("keeps a password the learner had already confirmed", async () => {
    const email = "grace@lymi.test";
    const [user] = await usersWith(email);
    const userId = user?.id as string;
    // grace confirmed her own password earlier in this file.
    await expect(credentialsOf(userId)).resolves.toHaveLength(1);

    const callback = await signInWithGoogle(email);
    expect(callback.status).toBe(302);
    await expect(credentialsOf(userId)).resolves.toHaveLength(1);
    expect((await signIn(email)).status).toBe(200);
  });
});
