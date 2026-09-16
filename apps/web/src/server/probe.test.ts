import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createAuth } from "./auth";
import type { Db } from "./db";
import { DEV_PASSWORD, personaEmail } from "./dev/personas";
import type { Bindings } from "./env";
import { type TestBindings, testDb } from "./services/test-db";

const PRODUCT_URL = "https://preview-lymi-app-pr-256.k-porshnieva.workers.dev";
let db: Db;
let base: TestBindings;
let dispose: () => Promise<void>;

beforeAll(async () => {
  ({ db, env: base, dispose } = await testDb());
}, 60_000);
afterAll(async () => {
  await dispose();
});

function envWith(secret: unknown): Bindings {
  return {
    ...base,
    PRODUCT_URL,
    PUBLIC_SITE_URL: PRODUCT_URL,
    APP_PREVIEW: "true",
    ALLOWED_EMAILS: "",
    BETTER_AUTH_SECRET: secret,
    EMAIL: { send: async () => {} },
  } as unknown as Bindings;
}

it("shows what the after hook sees, and what a missing secret does", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const auth = createAuth(envWith("a-test-secret-that-is-long-enough-for-better-auth"), db);
  const created = await auth.api.signUpEmail({
    body: { email: personaEmail("fresh"), password: DEV_PASSWORD, name: "Fresh" },
    asResponse: true,
  });
  console.log("with secret ->", created.status, created.headers.getSetCookie());
  expect(created.ok).toBe(true);
  log.mockRestore();
});

it("survives a sign-up when the signing secret is missing", async () => {
  const auth = createAuth(envWith(undefined), db);
  const created = await auth.api.signUpEmail({
    body: { email: personaEmail("streak"), password: DEV_PASSWORD, name: "Streak" },
    asResponse: true,
  });
  console.log("without secret ->", created.status, (await created.clone().text()).slice(0, 160));
  expect(created.ok).toBe(true);
});
