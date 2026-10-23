import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuth } from "../auth";
import type { Db } from "../db";
import type { Bindings } from "../env";
import type { AppEnv } from "../index";
import { dev } from "../routes/dev";
import { type TestBindings, testDb } from "../services/test-db";

let db: Db;
let env: Bindings;
let dispose: () => Promise<void>;
let cookie = "";

const app = new Hono<AppEnv>()
  .use("*", async (c, next) => {
    c.set("db", db);
    c.set("auth", createAuth(c.env, db));
    await next();
  })
  .route("/api/dev", dev);

const call = (path: string, init?: RequestInit) =>
  app.request(
    `http://localhost/api/dev${path}`,
    { ...init, headers: { cookie, "content-type": "application/json", ...init?.headers } },
    env,
  );
const run = (id: string, body: object = {}) =>
  call(`/commands/${id}`, { method: "POST", body: JSON.stringify(body) });

beforeAll(async () => {
  let bindings: TestBindings;
  ({ db, env: bindings, dispose } = await testDb());
  env = {
    ...bindings,
    PRODUCT_URL: "http://localhost:5241",
    BETTER_AUTH_SECRET: "a-test-secret-that-is-long-enough-for-better-auth",
  } as unknown as Bindings;
  // An empty account, so each command's blocked reason can be seen before cards arrive.
  const signedIn = await app.request(
    "http://localhost/api/dev/sign-in?as=fresh&seed=0",
    { method: "POST" },
    env,
  );
  cookie = signedIn.headers
    .getSetCookie()
    .map((c) => c.split(";", 1)[0])
    .join("; ");
}, 60_000);

afterAll(async () => {
  await dispose();
});

describe("dev commands", () => {
  it("lists every command with why it cannot run for this account", async () => {
    const { commands } = (await (await call("/commands")).json()) as {
      commands: { id: string; title: string; blocked: string | null }[];
    };
    const blocked = Object.fromEntries(commands.map((c) => [c.id, c.blocked]));
    expect(blocked).toMatchObject({
      claude: null,
      due: "No cards",
      owner: "No shared deck",
      reset: "Already empty",
    });
    expect(commands.find((c) => c.id === "claude")?.title).toBe("Claude adds {count} cards");
  });

  it("lists the commands signed out too, without blocked reasons, but runs none", async () => {
    const signedOut = await app.request("http://localhost/api/dev/commands", undefined, env);
    const { commands } = (await signedOut.json()) as { commands: { blocked: string | null }[] };
    expect(commands.length).toBeGreaterThan(0);
    expect(commands.every((c) => c.blocked === null)).toBe(true);
    const refused = await app.request(
      "http://localhost/api/dev/commands/claude",
      { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
      env,
    );
    expect(refused.status).toBe(401);
  });

  it("refuses a blocked command and runs one with the count it is given", async () => {
    expect((await run("due")).status).toBe(409);
    const added = await run("claude", { count: 2 });
    expect(added.status).toBe(200);
    expect(await added.json()).toMatchObject({
      note: "Claude added 2 cards.",
      counts: { cards: 2 },
    });
  });

  it("caps the count at the command's maximum and refuses an unknown command", async () => {
    const added = (await (await run("claude", { count: 500 })).json()) as { note: string };
    expect(added.note).toBe("Claude added 200 cards.");
    expect((await run("nothing")).status).toBe(404);
  });

  it("reopens a met day a few reviews short of its goal, so the goal can be reached again", async () => {
    expect((await run("goal")).status).toBe(200);
    const ahead = (await (await run("goal-ahead", { count: 2 })).json()) as { note: string };
    expect(ahead.note).toMatch(/^Today's goal is now \d+, 2 reviews away\.$/);
    const again = (await (await run("goal")).json()) as { note: string };
    expect(again.note).toBe("Graded 2 more. Today's goal is met.");
  });
});
