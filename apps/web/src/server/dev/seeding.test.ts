import { and, eq } from "@lymi/core/db";
import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuth } from "../auth";
import type { Db } from "../db";
import { schema } from "../db";
import type { Bindings } from "../env";
import type { AppEnv } from "../index";
import { dev } from "../routes/dev";
import { listDecks } from "../services/decks";
import { type TestBindings, testDb } from "../services/test-db";

let db: Db;
let env: Bindings;
let dispose: () => Promise<void>;

const app = new Hono<AppEnv>()
  .use("*", async (c, next) => {
    c.set("db", db);
    c.set("auth", createAuth(c.env, db));
    await next();
  })
  .route("/api/dev", dev);

const signIn = (query: string, method = "POST") =>
  app.request(`http://localhost/api/dev/sign-in?${query}`, { method }, env);

/** What an account holds, read as that account without touching its data. */
async function holdings(persona: string) {
  const signed = await signIn(`as=${persona}&seed=0`);
  const cookie = signed.headers
    .getSetCookie()
    .map((c) => c.split(";", 1)[0])
    .join("; ");
  const { user, counts } = (await (
    await app.request("http://localhost/api/dev/state", { headers: { cookie } }, env)
  ).json()) as { user: { id: string }; counts: { due: number } };
  const decks = await listDecks({ db, userId: user.id, actor: "system" });
  return {
    decks: decks.map((d) => d.name).sort(),
    due: counts.due,
    ids: Object.fromEntries(decks.map((d) => [d.name, d.id])),
  };
}

beforeAll(async () => {
  let bindings: TestBindings;
  ({ db, env: bindings, dispose } = await testDb());
  env = {
    ...bindings,
    PRODUCT_URL: "http://localhost:5241",
    BETTER_AUTH_SECRET: "a-test-secret-that-is-long-enough-for-better-auth",
  } as unknown as Bindings;
}, 60_000);

afterAll(async () => {
  await dispose();
});

describe("seeding accounts that share decks", () => {
  let learner: { decks: string[]; due: number };
  const kept = ({ decks, due }: { decks: string[]; due: number }) => ({ decks, due });

  it("signs in with seed=0 without seeding anyone else or landing anywhere", async () => {
    const response = await signIn("as=joining&seed=0", "GET");
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/today");
    expect((await holdings("shared")).decks).toEqual([]);
  }, 60_000);

  it("brings every account a persona needs and lands on Today with that deck", async () => {
    const response = await signIn("as=joining", "GET");
    expect(response.status).toBe(303);
    const landing = new URL(response.headers.get("location") ?? "");
    expect(landing.pathname).toBe("/today");

    const tomas = await holdings("joining");
    expect(tomas.decks).toEqual(["Lisboa a dois"]);
    // The deck opens one section at a time, so only its first section counts as due.
    expect(tomas.due).toBeGreaterThan(0);
    learner = kept(await holdings("learner"));
    expect(learner.decks).toContain("Lisboa a dois");
    expect(learner.decks).toContain("Everyday Finnish");
    expect(learner.due).toBe(9);
  }, 60_000);

  it("gives members back their decks and due counts when an owner reseeds", async () => {
    await signIn("as=publisher&reset=1");
    expect(kept(await holdings("learner"))).toEqual(learner);
    await signIn("as=shared&reset=1");
    expect(kept(await holdings("learner"))).toEqual(learner);
  }, 60_000);

  it("removes the old picture files when an account is reseeded", async () => {
    const pictures = async () =>
      (await env.PRIVATE_IMAGES.list({ prefix: "cards/" })).objects.length;
    const before = await pictures();
    expect(before).toBeGreaterThan(0);
    await signIn("as=learner&reset=1");
    expect(await pictures()).toBe(before);
  }, 60_000);

  it("keeps the owner's Activity as seeded when a member signs in again", async () => {
    await signIn("as=shared&reset=1");
    const joins = async () =>
      (
        await db
          .select({ id: schema.auditLog.id })
          .from(schema.auditLog)
          .innerJoin(schema.user, eq(schema.user.id, schema.auditLog.userId))
          .where(
            and(eq(schema.user.email, "shared@lymi.local"), eq(schema.auditLog.action, "join")),
          )
      ).length;
    const seeded = await joins();
    expect(seeded).toBe(4);
    await signIn("as=joining", "GET");
    await signIn("as=joining", "GET");
    await signIn("as=learner&reset=1");
    expect(await joins()).toBe(seeded);
  }, 60_000);

  it("removes the picture files when the account is emptied", async () => {
    await signIn("as=learner&reset=1");
    const signed = await signIn("as=learner&seed=0");
    const cookie = signed.headers
      .getSetCookie()
      .map((c) => c.split(";", 1)[0])
      .join("; ");
    const pictures = async () =>
      (await env.PRIVATE_IMAGES.list({ prefix: "cards/" })).objects.length;
    const before = await pictures();
    await app.request(
      "http://localhost/api/dev/commands/reset",
      { method: "POST", headers: { cookie, "content-type": "application/json" }, body: "{}" },
      env,
    );
    expect(await pictures()).toBe(before - 3);
  }, 60_000);
});
