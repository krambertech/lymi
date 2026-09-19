import { handleFetch } from "./app";
import { createAuth } from "./auth";
import type { Db } from "./db";
import type { Bindings } from "./env";
import { testDb } from "./services/test-db";

/** A signed-in learner: the account and the cookie header that carries its session. */
export type Session = { userId: string; email: string; cookie: string };

export type TestApp = {
  env: Bindings;
  db: Db;
  /** A request through the Worker's own fetch handler. `as` sends a learner's session cookie. */
  fetch: (path: string, init?: RequestInit & { as?: Session | undefined }) => Promise<Response>;
  /** A confirmed, signed-in account at `handle@lymi.local`, which is a persona and gets no mail. */
  signUp: (handle: string) => Promise<Session>;
};

export const PRODUCT_URL = "http://localhost:5173";
export const PUBLIC_SITE_URL = "http://localhost:4321";
const PASSWORD = "route-test-password-1234";

/**
 * The product app on the shared local D1, reached the way a request reaches it on Workers:
 * origin routing, preview access, authentication, validation and each route's own guards.
 * A loopback product writes email to the outbox and confirms `@lymi.local` accounts itself.
 */
export async function testApp(options: { operators?: string[] } = {}): Promise<TestApp> {
  const { db, env: bindings } = await testDb();
  const env = {
    ...bindings,
    PRODUCT_URL,
    PUBLIC_SITE_URL,
    BETTER_AUTH_SECRET: "a-test-secret-that-is-long-enough-for-better-auth",
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
    OPERATOR_EMAILS: (options.operators ?? []).join(","),
    PUBLISHER_EMAILS: "",
    CF_VERSION_METADATA: { id: "test", tag: "test", timestamp: new Date(0).toISOString() },
    EMAIL: {
      send: async () => {
        throw new Error("A loopback product writes to the outbox and never reaches the provider");
      },
    },
  } as unknown as Bindings;

  const fetch: TestApp["fetch"] = async (path, init = {}) => {
    const { as, ...rest } = init;
    const headers = new Headers(rest.headers);
    if (as) headers.set("cookie", as.cookie);
    const deferred: Promise<unknown>[] = [];
    const executionCtx = {
      waitUntil: (work: Promise<unknown>) => {
        deferred.push(work);
      },
      passThroughOnException: () => {},
      props: {},
    } as unknown as ExecutionContext;
    const response = await handleFetch(
      new Request(new URL(path, PRODUCT_URL), { ...rest, headers }),
      env,
      executionCtx,
    );
    // Work a route defers past its response has landed by the time the test reads the database.
    await Promise.all(deferred);
    return response;
  };

  const signUp: TestApp["signUp"] = async (handle) => {
    const email = `${handle}@lymi.local`;
    const auth = createAuth(env, db);
    const created = await auth.api.signUpEmail({
      body: { email, password: PASSWORD, name: handle },
      asResponse: true,
    });
    if (!created.ok) throw new Error(`Could not create ${email}: ${await created.text()}`);
    const signedIn = await auth.api.signInEmail({
      body: { email, password: PASSWORD },
      asResponse: true,
    });
    if (!signedIn.ok) throw new Error(`Could not sign ${email} in: ${await signedIn.text()}`);
    const { user } = (await signedIn.json()) as { user: { id: string } };
    const cookie = signedIn.headers
      .getSetCookie()
      .map((entry) => entry.split(";")[0])
      .join("; ");
    return { userId: user.id, email, cookie };
  };

  return { env, db, fetch, signUp };
}

export function json(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}
