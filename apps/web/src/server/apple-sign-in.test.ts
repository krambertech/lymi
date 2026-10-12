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
    const bare = await testApp();
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
