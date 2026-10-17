import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { and, eq } from "@lymi/core/db";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { forgetAppleKeys } from "./apple-id-token";
import { schema } from "./db";
import * as posthog from "./posthog";
import { json, type TestApp, testApp } from "./test-app";

/**
 * The phone's native Sign in with Apple sheet hands the app an ID token, which it posts to
 * Better Auth. Apple's keys are stubbed with a pair made here. Issue 528.
 */
const BUNDLE = "app.lymi.test";
const PASSWORD = "lantern-over-the-water-58";
const KID = "test-key";
const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const otherKeys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const realFetch = globalThis.fetch;

let app: TestApp;

beforeAll(async () => {
  app = await testApp({ env: { APPLE_APP_BUNDLE_IDENTIFIER: BUNDLE } });
}, 60_000);

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** Apple, as far as verifying a token touches it: its published signing keys. */
function stubAppleKeys() {
  const fetches: string[] = [];
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (url.href !== "https://appleid.apple.com/auth/keys") return realFetch(input, init);
    fetches.push(url.href);
    const jwk = keys.publicKey.export({ format: "jwk" });
    return Response.json({ keys: [{ ...jwk, kid: KID, alg: "RS256", use: "sig" }] });
  });
  return fetches;
}

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");
/** The phone hashes a fresh nonce into Apple's request and sends the raw value with the token. */
const NONCE = "raw-nonce";

function appleToken(claims: Record<string, unknown>, signWith = keys.privateKey): string {
  const now = Math.floor(Date.now() / 1000);
  const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const body = `${part({ alg: "RS256", kid: KID })}.${part({
    iss: "https://appleid.apple.com",
    aud: BUNDLE,
    iat: now,
    exp: now + 600,
    email_verified: "true",
    nonce: sha256(NONCE),
    ...claims,
  })}`;
  return `${body}.${sign("RSA-SHA256", Buffer.from(body), signWith).toString("base64url")}`;
}

/** The request the phone sends after the sheet: no Origin, the app's scheme in `expo-origin`. */
function signInWithApple(idToken: Record<string, unknown>) {
  const body = { provider: "apple", idToken: { nonce: NONCE, ...idToken } };
  return app.fetch(
    "/api/auth/sign-in/social",
    json(body, { headers: { "expo-origin": "lymi://" } }),
  );
}

function cookieOf(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((entry) => entry.split(";")[0])
    .join("; ");
}

const userWith = async (email: string) =>
  (await app.db.select().from(schema.user).where(eq(schema.user.email, email)))[0];

const accountsOf = (userId: string) =>
  app.db.select().from(schema.account).where(eq(schema.account.userId, userId));

describe("signing in with Apple from the phone app", () => {
  it("creates an account with the name the sheet sent, and a session that lasts", async () => {
    stubAppleKeys();
    const delivered = vi.spyOn(posthog, "trackProductEvent").mockResolvedValue();
    const email = "apple-new@lymi.test";
    const nonce = "raw-nonce-1";
    const response = await signInWithApple({
      token: appleToken({ sub: "apple-new", email, nonce: sha256(nonce) }),
      nonce,
      user: { name: { firstName: "Ada", lastName: "Apple" }, email },
    });
    expect(response.status).toBe(200);
    const cookie = cookieOf(response);
    expect(cookie).toContain("session_token=");

    const user = await userWith(email);
    expect(user).toMatchObject({ name: "Ada Apple", emailVerified: true });
    expect(await accountsOf(user?.id ?? "")).toMatchObject([
      { providerId: "apple", accountId: "apple-new" },
    ]);
    const signup = delivered.mock.calls.find((call) => call[2].name === "signed_up");
    expect(signup?.[2]).toMatchObject({ name: "signed_up", method: "apple" });

    // The phone keeps the cookie, so a relaunch reads the same session.
    const session = await app.fetch("/api/auth/get-session", {
      headers: { cookie, "expo-origin": "lymi://" },
    });
    expect(await session.json()).toMatchObject({ user: { email } });
  });

  it("gives a learner who hides their address a working account on the relay", async () => {
    stubAppleKeys();
    const email = "x7k2p9qd@privaterelay.appleid.com";
    const response = await signInWithApple({
      token: appleToken({ sub: "apple-hidden", email, is_private_email: "true" }),
    });
    expect(response.status).toBe(200);
    expect(cookieOf(response)).toContain("session_token=");
    // Apple sends no name when the sheet had none to give, so the address lends one.
    expect(await userWith(email)).toMatchObject({ name: "x7k2p9qd", emailVerified: true });
  });

  it("signs a later sign-in, which carries no name, into the same account", async () => {
    stubAppleKeys();
    const email = "apple-new@lymi.test";
    const response = await signInWithApple({ token: appleToken({ sub: "apple-new", email }) });
    expect(response.status).toBe(200);
    const users = await app.db.select().from(schema.user).where(eq(schema.user.email, email));
    expect(users).toHaveLength(1);
    expect(users[0]?.name).toBe("Ada Apple");
  });

  it("signs into the account a confirmed password already opens, and keeps the password", async () => {
    stubAppleKeys();
    const learner = await app.signUp("apple-linked");
    const response = await signInWithApple({
      token: appleToken({ sub: "apple-linked", email: learner.email }),
    });
    expect(response.status).toBe(200);
    const providers = (await accountsOf(learner.userId)).map((account) => account.providerId);
    expect(providers.sort()).toEqual(["apple", "credential"]);

    // A later sign-in links nothing, so it has nothing to retire either.
    const again = await signInWithApple({
      token: appleToken({ sub: "apple-linked", email: learner.email }),
    });
    expect(again.status).toBe(200);
    const after = (await accountsOf(learner.userId)).map((account) => account.providerId);
    expect(after.sort()).toEqual(["apple", "credential"]);
  });

  it("never links an address Apple did not verify to an existing account", async () => {
    stubAppleKeys();
    const learner = await app.signUp("apple-unverified");
    // Apple may not verify a managed Apple ID's address, and says so in the token.
    const response = await signInWithApple({
      token: appleToken({ sub: "apple-unverified", email: learner.email, email_verified: "false" }),
    });
    expect(response.status).not.toBe(200);
    expect(cookieOf(response)).not.toContain("session_token=");
    const providers = (await accountsOf(learner.userId)).map((account) => account.providerId);
    expect(providers).toEqual(["credential"]);
  });

  it("takes an unconfirmed password off the account Apple proves, and says so in Activity", async () => {
    stubAppleKeys();
    const email = "apple-claims@lymi.test";
    const created = await app.fetch(
      "/api/auth/sign-up/email",
      json(
        { email, password: PASSWORD, name: "Someone" },
        { headers: { origin: app.env.PRODUCT_URL } },
      ),
    );
    expect(created.status).toBe(200);
    const userId = (await userWith(email))?.id ?? "";

    const response = await signInWithApple({ token: appleToken({ sub: "apple-claims", email }) });
    expect(response.status).toBe(200);
    expect((await accountsOf(userId)).map((account) => account.providerId)).toEqual(["apple"]);
    const [retired] = await app.db
      .select()
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.userId, userId),
          eq(schema.auditLog.action, "retire_unproved_password"),
        ),
      );
    expect(retired?.payload).toMatchObject({ reason: "apple_proved_the_address" });
  });

  it("refuses a token Apple did not sign, for another app, expired, or without the nonce", async () => {
    stubAppleKeys();
    const email = "apple-refused@lymi.test";
    const now = Math.floor(Date.now() / 1000);
    for (const idToken of [
      { token: appleToken({ sub: "refused", email }, otherKeys.privateKey) },
      { token: appleToken({ sub: "refused", email, aud: "com.example.other" }) },
      { token: appleToken({ sub: "refused", email, iss: "https://accounts.google.com" }) },
      { token: appleToken({ sub: "refused", email, iat: now - 7200, exp: now - 3600 }) },
      { token: appleToken({ sub: "refused", email, nonce: sha256("one") }), nonce: "another" },
      // A replayed token: the request carries no nonce, or the token was minted without one.
      { token: appleToken({ sub: "refused", email }), nonce: undefined },
      { token: appleToken({ sub: "refused", email, nonce: undefined }) },
      // The claim copied off a stolen token, rather than the raw value only the phone knows.
      { token: appleToken({ sub: "refused", email }), nonce: sha256(NONCE) },
    ]) {
      const response = await signInWithApple(idToken);
      expect(response.status).toBe(401);
      expect(cookieOf(response)).not.toContain("session_token=");
    }
    expect(await userWith(email)).toBeUndefined();
  });

  it("fetches Apple's signing keys once, not on every sign-in", async () => {
    forgetAppleKeys();
    const fetches = stubAppleKeys();
    for (const sub of ["cached-1", "cached-2", "cached-3"]) {
      const response = await signInWithApple({
        token: appleToken({ sub, email: `${sub}@lymi.test` }),
      });
      expect(response.status).toBe(200);
    }
    expect(fetches).toHaveLength(1);
  });
});

describe("Sign in with Apple before it is configured", () => {
  it("is not offered", async () => {
    const bare = await testApp({ env: { APPLE_APP_BUNDLE_IDENTIFIER: "", APPLE_CLIENT_ID: "" } });
    const response = await bare.fetch(
      "/api/auth/sign-in/social",
      json(
        {
          provider: "apple",
          idToken: { token: appleToken({ sub: "early", email: "e@lymi.test" }) },
        },
        { headers: { "expo-origin": "lymi://" } },
      ),
    );
    expect(response.status).toBe(404);
  });
});

const SERVICE_ID = "app.lymi.web.test";
const signingKey = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
let web: TestApp;

async function webAppleSignIn(email: string, claims: Record<string, unknown> = {}) {
  const start = await web.fetch(
    "/api/auth/sign-in/social",
    json(
      {
        provider: "apple",
        callbackURL: "/library",
        errorCallbackURL: "/login?returnTo=%2Flibrary",
        additionalData: { firstTouch: { first_landing_page: "/explore/estonian-a1" } },
      },
      { headers: { origin: web.env.PRODUCT_URL } },
    ),
  );
  expect(start.status).toBe(200);
  const { url } = (await start.json()) as { url: string };
  const authorize = new URL(url);
  expect(authorize.searchParams.get("client_id")).toBe(SERVICE_ID);
  expect(authorize.searchParams.get("response_mode")).toBe("form_post");
  expect(authorize.searchParams.get("redirect_uri")).toBe(
    `${web.env.PRODUCT_URL}/api/auth/callback/apple`,
  );
  const state = authorize.searchParams.get("state") ?? "";
  vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const target = new URL(input instanceof Request ? input.url : String(input));
    if (target.href === "https://appleid.apple.com/auth/token") {
      const sent = new URLSearchParams(String(init?.body));
      expect(sent.get("client_id")).toBe(SERVICE_ID);
      const secret = JSON.parse(
        Buffer.from(sent.get("client_secret")!.split(".")[1]!, "base64url").toString(),
      );
      expect(secret).toMatchObject({
        iss: "TEAM",
        sub: SERVICE_ID,
        aud: "https://appleid.apple.com",
      });
      expect(secret.exp - secret.iat).toBe(300);
      return Response.json({
        access_token: "apple-access",
        refresh_token: "apple-refresh",
        token_type: "Bearer",
        expires_in: 3600,
        id_token: appleToken({ sub: email, email, aud: SERVICE_ID, ...claims }),
      });
    }
    return realFetch(input, init);
  });
  const posted = await web.fetch("/api/auth/callback/apple", {
    method: "POST",
    headers: {
      origin: "https://appleid.apple.com",
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      state,
      code: "apple-code",
      user: JSON.stringify({ name: { firstName: "Ada", lastName: "Apple" } }),
    }),
  });
  expect(posted.status).toBe(302);
  // Apple posts cross-site; Better Auth returns to a same-site GET before reading its state cookie.
  const callback = new URL(posted.headers.get("location")!);
  return web.fetch(`${callback.pathname}${callback.search}`, {
    headers: { cookie: cookieOf(start) },
  });
}

describe("signing in with Apple from the web", () => {
  beforeAll(async () => {
    web = await testApp({
      env: {
        APPLE_APP_BUNDLE_IDENTIFIER: BUNDLE,
        APPLE_CLIENT_ID: SERVICE_ID,
        APPLE_TEAM_ID: "TEAM",
        APPLE_KEY_ID: "KEY",
        APPLE_PRIVATE_KEY: signingKey.privateKey
          .export({ format: "pem", type: "pkcs8" })
          .toString(),
      },
    });
  }, 60_000);

  it("handles Apple's POST callback, keeps the destination, and records Apple attribution", async () => {
    const delivered = vi.spyOn(posthog, "trackProductEvent").mockResolvedValue();
    const email = "apple-web-new@lymi.test";
    const response = await webAppleSignIn(email);
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("/library");
    const cookie = cookieOf(response);
    expect(cookie).toContain("session_token=");
    const session = await web.fetch("/api/auth/get-session", { headers: { cookie } });
    expect(await session.json()).toMatchObject({ user: { email, name: "Ada Apple" } });
    const signup = delivered.mock.calls.find((call) => call[2].name === "signed_up");
    expect(signup?.[2]).toMatchObject({
      name: "signed_up",
      method: "apple",
      first_landing_page: "/explore/estonian-a1",
    });
    expect(delivered.mock.calls.filter((call) => call[2].name === "signed_in")).toHaveLength(1);
  });

  it("retires an unconfirmed password when Apple's web callback proves the address", async () => {
    const email = "apple-web-claims@lymi.test";
    await web.fetch(
      "/api/auth/sign-up/email",
      json(
        { email, password: PASSWORD, name: "Someone" },
        { headers: { origin: web.env.PRODUCT_URL } },
      ),
    );
    const response = await webAppleSignIn(email);
    expect(cookieOf(response)).toContain("session_token=");
    const [user] = await web.db.select().from(schema.user).where(eq(schema.user.email, email));
    const accounts = await web.db
      .select()
      .from(schema.account)
      .where(eq(schema.account.userId, user!.id));
    expect(accounts.map((account) => account.providerId)).toEqual(["apple"]);
  });

  it("does not claim an existing account with an unverified Apple address", async () => {
    const learner = await web.signUp("apple-web-unverified");
    const response = await webAppleSignIn(learner.email, { email_verified: "false" });
    expect(cookieOf(response)).not.toContain("session_token=");
    expect(response.headers.get("location")).toContain("error=");
  });

  it("refuses a callback with a forged state", async () => {
    const response = await web.fetch("/api/auth/callback/apple?code=apple-code&state=forged");
    expect(cookieOf(response)).not.toContain("session_token=");
    expect(response.headers.get("location")).toContain("error=");
  });

  it("still accepts the phone's bundle audience when the web Services ID is configured", async () => {
    stubAppleKeys();
    const response = await web.fetch(
      "/api/auth/sign-in/social",
      json(
        {
          provider: "apple",
          idToken: {
            token: appleToken({ sub: "apple-both", email: "apple-both@lymi.test" }),
            nonce: NONCE,
          },
        },
        { headers: { "expo-origin": "lymi://" } },
      ),
    );
    expect(response.status).toBe(200);
  });
});
