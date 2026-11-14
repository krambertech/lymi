import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { createAuth } from "./auth";
import { type Db, schema } from "./db";
import { type Bindings, DEV_EMAIL_DOMAIN } from "./env";
import { type TestBindings, testDb } from "./services/test-db";

const tracked = vi.hoisted(() => vi.fn());
vi.mock("./posthog", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./posthog")>()),
  trackProductEvent: tracked,
}));

/** The consent screen's answer, through Better Auth as the Worker mounts it. docs/testing.md has the manual recipe. */
const PRODUCT_URL = "http://localhost:5241";
const REDIRECT = "http://127.0.0.1:8765/callback";
const CLIENT = "lymi-local-test";
const PASSWORD = "a-long-test-password";

let db: Db;
let env: Bindings;
let dispose: () => Promise<void>;
let cookie = "";

beforeAll(async () => {
  let bindings: TestBindings;
  ({ db, env: bindings, dispose } = await testDb());
  env = {
    ...bindings,
    PRODUCT_URL,
    PUBLIC_SITE_URL: "https://lymi.app",
    ALLOWED_EMAILS: "",
    BETTER_AUTH_SECRET: "a-test-secret-that-is-long-enough-for-better-auth",
  } as unknown as Bindings;
  const auth = createAuth(env, db);
  const email = `consent${DEV_EMAIL_DOMAIN}`;
  await auth.api.signUpEmail({ body: { email, password: PASSWORD, name: "Consent" } });
  const signedIn = await auth.api.signInEmail({
    body: { email, password: PASSWORD },
    asResponse: true,
  });
  cookie = signedIn.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  const now = new Date();
  await db.insert(schema.oauthClient).values({
    id: CLIENT,
    clientId: CLIENT,
    disabled: false,
    skipConsent: false,
    scopes: ["read", "write", "offline_access"],
    redirectUris: [REDIRECT],
    tokenEndpointAuthMethod: "none",
    applicationType: "native",
    grantTypes: ["authorization_code", "refresh_token"],
    responseTypes: ["code"],
    requirePKCE: true,
    name: "Local MCP test client",
    createdAt: now,
    updatedAt: now,
  });
  // The resource row is seeded when Better Auth is first built; the client must be linked to it.
  await auth.handler(new Request(`${PRODUCT_URL}/api/auth/.well-known/openid-configuration`));
  await db.insert(schema.oauthClientResource).values({
    id: "link",
    clientId: CLIENT,
    resourceId: `${PRODUCT_URL}/mcp`,
    createdAt: now,
  });
}, 60_000);

afterAll(async () => {
  await dispose();
});

beforeEach(async () => {
  tracked.mockClear();
  await db.delete(schema.oauthConsent);
});

/** Opens authorize as the signed-in learner and returns the consent page's signed query. */
async function consentQuery(): Promise<string> {
  const url = new URL(`${PRODUCT_URL}/api/auth/oauth2/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT,
    redirect_uri: REDIRECT,
    scope: "read write offline_access",
    state: "state-1",
    code_challenge: "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWZ6TbFx3jZd8",
    code_challenge_method: "S256",
    resource: `${PRODUCT_URL}/mcp`,
  }).toString();
  const res = await createAuth(env, db).handler(new Request(url, { headers: { cookie } }));
  const location = res.headers.get("location") ?? "";
  expect(location, await res.clone().text()).toContain("/consent");
  return new URL(location, PRODUCT_URL).search.slice(1);
}

function answer(body: Record<string, unknown>) {
  return createAuth(env, db).handler(
    new Request(`${PRODUCT_URL}/api/auth/oauth2/consent`, {
      method: "POST",
      headers: { cookie, origin: PRODUCT_URL, "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

describe("the consent screen's answer", () => {
  it("records a grant, with whether the assistant may write", async () => {
    const res = await answer({ accept: true, oauth_query: await consentQuery() });

    expect(res.status, await res.clone().text()).toBe(200);
    expect(tracked).toHaveBeenCalledTimes(1);
    expect(tracked.mock.calls[0]?.[2]).toEqual({
      name: "app_connected",
      client: "other",
      write: true,
    });
  });

  it("records a refusal as declined", async () => {
    await answer({ accept: false, oauth_query: await consentQuery() });

    expect(tracked).toHaveBeenCalledTimes(1);
    expect(tracked.mock.calls[0]?.[2]).toEqual({
      name: "app_connect_failed",
      client: "other",
      reason: "declined",
    });
  });
});
