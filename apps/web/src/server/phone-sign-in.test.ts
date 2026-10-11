import { DeckOut } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createAuth } from "./auth";
import { schema } from "./db";
import { latestLocalEmail } from "./services/email";
import { json, type TestApp, testApp } from "./test-app";

/**
 * The phone app signs in through Better Auth's Expo plugin: it sends no Origin, names itself in
 * `expo-origin`, and keeps the session cookie itself. ADR 0029.
 */
let app: TestApp;
const realFetch = globalThis.fetch;
const PASSWORD = "lantern-over-the-water-58";

beforeAll(async () => {
  app = await testApp({ env: { GOOGLE_CLIENT_ID: "client-id", GOOGLE_CLIENT_SECRET: "secret" } });
}, 60_000);

afterEach(() => {
  vi.unstubAllGlobals();
});

/** A request as the phone sends it: no Origin, the app's scheme in `expo-origin`. */
function fromPhone(body: unknown, appOrigin = "lymi://", cookie?: string): RequestInit {
  const headers: Record<string, string> = { "expo-origin": appOrigin };
  if (cookie) headers.cookie = cookie;
  return json(body, { headers });
}

function cookieOf(response: Response): string {
  return response.headers
    .getSetCookie()
    .map((entry) => entry.split(";")[0])
    .join("; ");
}

async function signInFromPhone(handle: string): Promise<string> {
  const email = `${handle}@lymi.local`;
  const created = await app.fetch(
    "/api/auth/sign-up/email",
    fromPhone({ email, password: PASSWORD, name: handle }),
  );
  expect(created.status).toBe(200);
  const signedIn = await app.fetch(
    "/api/auth/sign-in/email",
    fromPhone({ email, password: PASSWORD }),
  );
  expect(signedIn.status).toBe(200);
  return cookieOf(signedIn);
}

describe("signing in from the phone app", () => {
  it("signs a learner in with a password from the app's scheme", async () => {
    const cookie = await signInFromPhone("phone-password");
    expect(cookie).toContain("session_token=");
    const session = await app.fetch("/api/auth/get-session", {
      headers: { cookie, "expo-origin": "lymi://" },
    });
    expect(await session.json()).toMatchObject({ user: { email: "phone-password@lymi.local" } });
  });

  it("trusts the app's own scheme and no other", async () => {
    // Better Auth skips its origin check under test, so this asks the rule itself.
    const context = await createAuth(app.env, app.db).$context;
    expect(context.isTrustedOrigin("lymi://")).toBe(true);
    expect(context.isTrustedOrigin("lymi:///today")).toBe(true);
    expect(context.isTrustedOrigin("other://")).toBe(false);
    expect(context.isTrustedOrigin("exp://192.168.1.2:8081")).toBe(false);
  });

  it("records a write from the phone as the learner's, as on the web", async () => {
    const cookie = await signInFromPhone("phone-writer");
    const made = await app.fetch(
      "/api/decks",
      fromPhone({ name: "Phone deck", defaultLanguage: "et" }, "lymi://", cookie),
    );
    expect(made.status).toBe(201);
    const deck = DeckOut.parse(await made.json());
    const [row] = await app.db
      .select()
      .from(schema.auditLog)
      .where(eq(schema.auditLog.entityId, deck.id));
    expect(row).toMatchObject({ actor: "user", action: "create", actorClient: null });
  });
});

describe("signing in with Google from the phone app", () => {
  function stubGoogle(email: string) {
    vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : String(input));
      if (url.hostname !== "oauth2.googleapis.com") return realFetch(input, init);
      const now = Math.floor(Date.now() / 1000);
      const part = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
      const claims = {
        iss: "https://accounts.google.com",
        aud: "client-id",
        sub: `google-${email}`,
        email,
        email_verified: true,
        name: "Phone Learner",
        iat: now,
        exp: now + 3600,
      };
      return Response.json({
        access_token: "access",
        id_token: `${part({ alg: "RS256", kid: "k" })}.${part(claims)}.sig`,
        expires_in: 3600,
        token_type: "Bearer",
      });
    });
  }

  it("ends on the app's deep link with the session on it", async () => {
    stubGoogle("phone-google@lymi.test");
    const start = await app.fetch(
      "/api/auth/sign-in/social",
      fromPhone({ provider: "google", callbackURL: "lymi:///" }),
    );
    expect(start.status).toBe(200);
    const { url } = (await start.json()) as { url: string };
    const state = new URL(url).searchParams.get("state") ?? "";

    const callback = await app.fetch(`/api/auth/callback/google?code=the-code&state=${state}`, {
      headers: { cookie: cookieOf(start) },
    });
    expect(callback.status).toBe(302);
    const location = new URL(callback.headers.get("location") ?? "");
    expect(location.protocol).toBe("lymi:");
    expect(location.searchParams.get("cookie")).toContain("session_token=");
  });

  it("never hands the session to another app's deep link", async () => {
    stubGoogle("other-app@lymi.test");
    const start = await app.fetch(
      "/api/auth/sign-in/social",
      fromPhone({ provider: "google", callbackURL: "other:///" }),
    );
    const { url } = (await start.json()) as { url: string };
    const state = new URL(url).searchParams.get("state") ?? "";
    const callback = await app.fetch(`/api/auth/callback/google?code=the-code&state=${state}`, {
      headers: { cookie: cookieOf(start) },
    });
    const location = callback.headers.get("location") ?? "";
    expect(location.startsWith("other:")).toBe(true);
    expect(location).not.toContain("cookie=");
  });
});

describe("creating an account from the phone app", () => {
  const EMAIL = "phone-new@lymi.test";

  it("sends a code rather than a link, and the code signs the learner in", async () => {
    const created = await app.fetch(
      "/api/auth/sign-up/email",
      fromPhone({ email: EMAIL, password: PASSWORD, name: "Phone" }),
    );
    expect(created.status).toBe(200);
    const mail = latestLocalEmail(EMAIL);
    expect(mail?.kind).toBe("verify-email-code");
    const code = mail?.text.match(/^\d{6}$/m)?.[0] ?? "";
    expect(code).toHaveLength(6);
    expect(mail?.text).not.toContain("http");

    // The phone keeps the sign-up cookie, which is what lets it keep the password it chose.
    const confirmed = await app.fetch(
      "/api/auth/email-otp/verify-email",
      fromPhone({ email: EMAIL, otp: code }, "lymi://", cookieOf(created)),
    );
    expect(confirmed.status).toBe(200);
    expect(cookieOf(confirmed)).toContain("session_token=");
    const signedIn = await app.fetch(
      "/api/auth/sign-in/email",
      fromPhone({ email: EMAIL, password: PASSWORD }),
    );
    expect(signedIn.status).toBe(200);
  });

  it("refuses a wrong code", async () => {
    const email = "phone-wrong@lymi.test";
    await app.fetch("/api/auth/sign-up/email", fromPhone({ email, password: PASSWORD, name: "W" }));
    const code = latestLocalEmail(email)?.text.match(/^\d{6}$/m)?.[0] ?? "";
    expect(code).toHaveLength(6);
    const wrong = code === "000000" ? "111111" : "000000";
    const response = await app.fetch(
      "/api/auth/email-otp/verify-email",
      fromPhone({ email, otp: wrong }),
    );
    expect(response.status).toBe(400);
    expect(cookieOf(response)).not.toContain("session_token=");
  });

  it("still sends the web a link", async () => {
    const email = "web-new@lymi.test";
    const created = await app.fetch(
      "/api/auth/sign-up/email",
      json(
        { email, password: PASSWORD, name: "Web" },
        { headers: { origin: app.env.PRODUCT_URL } },
      ),
    );
    expect(created.status).toBe(200);
    expect(latestLocalEmail(email)?.kind).toBe("verify-email");
  });

  it("answers none of the code routes Lymi does not use", async () => {
    for (const path of [
      "/sign-in/email-otp",
      "/email-otp/reset-password",
      "/email-otp/change-email",
    ]) {
      const response = await app.fetch(
        `/api/auth${path}`,
        fromPhone({ email: EMAIL, otp: "123456" }),
      );
      expect(response.status, path).toBe(404);
    }
  });
});
