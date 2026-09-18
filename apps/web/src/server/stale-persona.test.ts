import { eq } from "@lymi/core/db";
import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { createAuth } from "./auth";
import { type Db, schema } from "./db";
import { personaEmail } from "./dev/personas";
import type { Bindings } from "./env";
import type { AppEnv } from "./index";
import { dev } from "./routes/dev";
import { type TestBindings, testDb } from "./services/test-db";

/** An isolated pull-request preview: development tools on, and nothing loopback. */
const PRODUCT_URL = "https://preview-lymi-app-pr-256.k-porshnieva.workers.dev";

let db: Db;
let env: Bindings;
let dispose: () => Promise<void>;

beforeAll(async () => {
  let bindings: TestBindings;
  ({ db, env: bindings, dispose } = await testDb());
  env = {
    ...bindings,
    PRODUCT_URL,
    PUBLIC_SITE_URL: PRODUCT_URL,
    APP_PREVIEW: "true",
    BETTER_AUTH_SECRET: "a-test-secret-that-is-long-enough-for-better-auth",
    EMAIL: {
      send: async () => {
        throw new Error("a persona has no inbox, so nothing should be addressed to one");
      },
    },
  } as unknown as Bindings;
}, 60_000);

afterAll(async () => {
  await dispose();
});

/** The dev routes with the per-request services the Worker normally sets. */
const app = new Hono<AppEnv>()
  .use("*", async (c, next) => {
    c.set("db", db);
    c.set("auth", createAuth(c.env, db));
    await next();
  })
  .route("/api/dev", dev);

const signIn = (persona: string) =>
  app.request(`https://x/api/dev/sign-in?as=${persona}&seed=0`, undefined, env);

describe("signing a persona in on an isolated preview", () => {
  it("works on a store that has never seen this persona", async () => {
    const response = await signIn("learner");
    expect(response.status).toBe(303);
    expect(response.headers.getSetCookie().join(";")).toContain("session_token");
  });

  it("rebuilds one whose stored password predates the current fixture", async () => {
    const email = personaEmail("streak");
    // The account as an earlier push left it, created with a password that is no longer ours.
    const older = createAuth(env, db);
    expect(
      (
        await older.api.signUpEmail({
          body: { email, password: "an-older-fixture-password", name: "Streak" },
          asResponse: true,
        })
      ).ok,
    ).toBe(true);
    const [before] = await db.select().from(schema.user).where(eq(schema.user.email, email));
    expect(before).toBeDefined();

    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const response = await signIn("streak");

    // Before the fix this threw, and the preview check saw a 500.
    expect(response.status).toBe(303);
    expect(response.headers.getSetCookie().join(";")).toContain("session_token");
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("Rebuilding"));

    const [after] = await db.select().from(schema.user).where(eq(schema.user.email, email));
    expect(after?.id, "the stale account should have been replaced").not.toBe(before?.id);
    warn.mockRestore();
  });
});
