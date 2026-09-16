import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { limitCredentialRequests } from "./auth-rate-limit";
import type { Bindings } from "./env";
import type { AppEnv } from "./index";
import { type TestBindings, testDb } from "./services/test-db";

let env: Bindings;
let dispose: () => Promise<void>;

beforeAll(async () => {
  let bindings: TestBindings;
  ({ env: bindings, dispose } = await testDb());
  env = { ...bindings, PRODUCT_URL: "https://my.lymi.app" } as unknown as Bindings;
}, 60_000);

afterAll(async () => {
  await dispose();
});

/** The credential paths with the middleware in front and a handler that always succeeds. */
const app = new Hono<AppEnv>()
  .use("/api/auth/*", limitCredentialRequests)
  .all("/api/auth/*", (c) => c.json({ ok: true }));

function attempt(path: string, email: string, ip = "203.0.113.7") {
  return app.request(
    new Request(`https://my.lymi.app${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": ip },
      body: JSON.stringify({ email }),
    }),
    undefined,
    env,
  );
}

/** The other body Better Auth accepts on these endpoints. */
function formAttempt(path: string, email: string, ip = "203.0.113.7") {
  return app.request(
    new Request(`https://my.lymi.app${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "cf-connecting-ip": ip,
      },
      body: new URLSearchParams({ email }).toString(),
    }),
    undefined,
    env,
  );
}

/** A unique address per test, so one test's window never counts against another's. */
let next = 0;
function address() {
  next += 1;
  return `limit-${next}@lymi.test`;
}

describe("metering the credential endpoints", () => {
  it("lets a sign-up through three times an hour and then says when to try again", async () => {
    const email = address();
    for (const _ of [1, 2, 3]) {
      expect((await attempt("/api/auth/sign-up/email", email)).status).toBe(200);
    }

    const refused = await attempt("/api/auth/sign-up/email", email);
    expect(refused.status).toBe(429);
    expect(refused.headers.get("retry-after")).toMatch(/^\d+$/);
    const body = (await refused.json()) as { retryAfter: number };
    expect(body.retryAfter).toBeGreaterThan(0);
    expect(body.retryAfter).toBeLessThanOrEqual(60 * 60);
  });

  it("counts each address on its own", async () => {
    const one = address();
    for (const _ of Array.from({ length: 6 })) {
      await attempt("/api/auth/request-password-reset", one);
    }
    expect((await attempt("/api/auth/request-password-reset", one)).status).toBe(429);
    expect((await attempt("/api/auth/request-password-reset", address())).status).toBe(200);
  });

  it("counts each endpoint on its own", async () => {
    const email = address();
    for (const _ of Array.from({ length: 6 })) {
      await attempt("/api/auth/send-verification-email", email);
    }
    expect((await attempt("/api/auth/send-verification-email", email)).status).toBe(429);
    expect((await attempt("/api/auth/sign-in/email", email)).status).toBe(200);
  });

  it("stops one caller walking a list of addresses", async () => {
    const ip = "203.0.113.99";
    // Ten sign-ups from one machine, each on a fresh address, exhausts the caller's budget.
    for (const _ of Array.from({ length: 10 })) {
      await attempt("/api/auth/sign-up/email", address(), ip);
    }
    expect((await attempt("/api/auth/sign-up/email", address(), ip)).status).toBe(429);
    expect((await attempt("/api/auth/sign-up/email", address(), "203.0.113.5")).status).toBe(200);
  });

  it("meters a form-encoded body, which Better Auth accepts as readily as JSON", async () => {
    const email = address();
    for (const _ of [1, 2, 3]) {
      expect((await formAttempt("/api/auth/sign-up/email", email)).status).toBe(200);
    }
    expect((await formAttempt("/api/auth/sign-up/email", email)).status).toBe(429);
    // The same address is spent whichever shape the body arrived in.
    expect((await attempt("/api/auth/sign-up/email", email)).status).toBe(429);
  });

  it("refuses a body it cannot read rather than letting it past unmetered", async () => {
    const refused = await app.request(
      new Request("https://my.lymi.app/api/auth/sign-up/email", {
        method: "POST",
        headers: { "content-type": "text/plain", "cf-connecting-ip": "203.0.113.7" },
        body: "email=sneak@lymi.test",
      }),
      undefined,
      env,
    );
    expect(refused.status).toBe(400);
  });

  it("does not spend an address's budget on a sign-in that worked", async () => {
    const email = address();
    // Ten successes in the window, where ten failures would have locked the address.
    for (const _ of Array.from({ length: 12 })) {
      expect((await attempt("/api/auth/sign-in/email", email)).status).toBe(200);
    }
  });

  it("locks the address only after failures, and says when to try again", async () => {
    const failing = new Hono<AppEnv>()
      .use("/api/auth/*", limitCredentialRequests)
      .all("/api/auth/*", (c) => c.json({ error: "no" }, 401));
    const email = address();
    const tries = (path: string) =>
      failing.request(
        new Request(`https://my.lymi.app${path}`, {
          method: "POST",
          headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.7" },
          body: JSON.stringify({ email }),
        }),
        undefined,
        env,
      );
    for (const _ of Array.from({ length: 10 })) {
      expect((await tries("/api/auth/sign-in/email")).status).toBe(401);
    }
    const refused = await tries("/api/auth/sign-in/email");
    expect(refused.status).toBe(429);
    expect((await refused.json()) as { retryAfter: number }).toMatchObject({
      retryAfter: expect.any(Number),
    });
  });

  it("leaves everything else under /api/auth alone", async () => {
    const email = address();
    for (const _ of Array.from({ length: 20 })) {
      expect((await attempt("/api/auth/sign-out", email)).status).toBe(200);
    }
  });
});
