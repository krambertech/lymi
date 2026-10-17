import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuth } from "../auth";
import type { Db } from "../db";
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
  return { decks: decks.map((d) => d.name).sort(), due: counts.due };
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
  let learner: Awaited<ReturnType<typeof holdings>>;

  it("brings every account a persona needs and lands on the arrival Welcome", async () => {
    const response = await signIn("as=joining", "GET");
    expect(response.status).toBe(303);
    expect(new URL(response.headers.get("location") ?? "").pathname).toBe("/welcome");

    expect((await holdings("joining")).decks).toEqual(["Lisboa a dois"]);
    learner = await holdings("learner");
    expect(learner.decks).toContain("Lisboa a dois");
    expect(learner.decks).toContain("Everyday Estonian");
    expect(learner.due).toBe(9);
  }, 60_000);

  it("gives members back their decks and due counts when an owner reseeds", async () => {
    await signIn("as=publisher&reset=1");
    expect(await holdings("learner")).toEqual(learner);
    await signIn("as=shared&reset=1");
    expect(await holdings("learner")).toEqual(learner);
  }, 60_000);

  it("signs in with seed=0 without seeding anyone else", async () => {
    const before = await holdings("shared");
    await signIn("as=joining&seed=0");
    expect(await holdings("shared")).toEqual(before);
  }, 60_000);
});
