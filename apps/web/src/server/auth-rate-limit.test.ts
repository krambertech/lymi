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
    for (const _ of [1, 2, 3]) await attempt("/api/auth/request-password-reset", one);
    expect((await attempt("/api/auth/request-password-reset", one)).status).toBe(429);
    expect((await attempt("/api/auth/request-password-reset", address())).status).toBe(200);
  });

  it("counts each endpoint on its own", async () => {
    const email = address();
    for (const _ of [1, 2, 3]) await attempt("/api/auth/send-verification-email", email);
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

  it("leaves everything else under /api/auth alone", async () => {
    const email = address();
    for (const _ of Array.from({ length: 20 })) {
      expect((await attempt("/api/auth/sign-out", email)).status).toBe(200);
    }
  });
});
