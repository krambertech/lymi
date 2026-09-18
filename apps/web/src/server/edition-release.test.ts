import { Hono } from "hono";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createAuth } from "./auth";
import type { Db } from "./db";
import type { Bindings } from "./env";
import { handleError } from "./http";
import type { AppEnv } from "./index";
import { authenticate, permissionsFor } from "./principal";
import { decks } from "./routes/decks";
import { addCards } from "./services/cards";
import type { ServiceContext } from "./services/context";
import { createDeck } from "./services/decks";
import { importEdition } from "./services/editions";
import { publishDeck } from "./services/publications";
import { createSection } from "./services/sections";
import { learner, type TestBindings, testDb } from "./services/test-db";

/**
 * Releasing an edition over HTTP with a personal API key, the way Lymi publishes its own:
 * a real key verified by Better Auth, through the same guards the Worker mounts. Issue #305.
 */
const PRODUCT_URL = "https://my.lymi.test";
const publishers = new Set(["lymi@lymi.test", "mari@lymi.test"]);

let db: Db;
let env: Bindings;
let dispose: () => Promise<void>;
let deckId: string;
/** The plain keys, minted once: Lymi's write and read keys, another publisher's, an outsider's. */
const key = { write: "", read: "", otherPublisher: "", outsider: "" };

const app = new Hono<AppEnv>()
  .use("*", async (c, next) => {
    c.set("db", db);
    c.set("auth", createAuth(c.env, db));
    await next();
  })
  .use("/api/*", authenticate)
  .route("/api/decks", decks)
  .onError(handleError);

/** A personal key for one account, straight from the plugin that verifies it on the way in. */
async function mintKey(ctx: ServiceContext, name: string, scope: "read" | "write") {
  const created = await createAuth(env, db).api.createApiKey({
    body: { name, userId: ctx.userId, permissions: permissionsFor(scope) },
  });
  return created.key;
}

function call(path: string, method: string, apiKey: string, body?: unknown) {
  return app.request(
    `${PRODUCT_URL}${path}`,
    {
      method,
      headers: { "x-api-key": apiKey, "content-type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    env,
  );
}

beforeAll(async () => {
  let bindings: TestBindings;
  ({ db, env: bindings, dispose } = await testDb());
  env = {
    ...bindings,
    PRODUCT_URL,
    PUBLIC_SITE_URL: PRODUCT_URL,
    ALLOWED_EMAILS: "",
    PUBLISHER_EMAILS: [...publishers].join(","),
    BETTER_AUTH_SECRET: "a-test-secret-that-is-long-enough-for-better-auth",
  } as unknown as Bindings;

  const lymi = await learner(db, "lymi", "Lymi Publisher Account");
  const mari = await learner(db, "mari", "Mari, another publisher");
  const anna = await learner(db, "anna", "Anna");
  key.write = await mintKey(lymi, "Lymi release key", "write");
  key.read = await mintKey(lymi, "Lymi read key", "read");
  key.otherPublisher = await mintKey(mari, "Mari's key", "write");
  key.outsider = await mintKey(anna, "Anna's key", "write");

  const deck = await createDeck(lymi, { name: "Everyday Estonian", defaultLanguage: "et" });
  deckId = deck.id;
  const greetings = await createSection(lymi, deckId, { name: "Greetings" });
  const [added] = await addCards(lymi, [
    { deckId, sectionId: greetings.id, term: "tere", meaning: "hello" },
  ]);
  if (added?.status !== "added") throw new Error("card not added");
  await publishDeck(
    lymi,
    deckId,
    {
      slug: "everyday-estonian",
      summary: "Words and phrases for your first weeks in Estonia.",
      publisher: "Lymi",
      meaningLanguage: "en",
      sources: [],
    },
    publishers,
  );
  await importEdition(
    lymi,
    deckId,
    "uk",
    {
      deck: { provenance: "ai", name: "Естонська на щодень", summary: "Перші тижні в Естонії." },
      sections: [{ sectionId: greetings.id, provenance: "ai", name: "Вітання" }],
      cards: [{ cardId: added.card.id, provenance: "ai", meaning: "привіт" }],
    },
    publishers,
  );
}, 60_000);

afterAll(async () => {
  await dispose();
});

describe("releasing an edition with an API key", () => {
  it("refuses a read-only key, a non-publisher and a publisher who does not own the deck", async () => {
    const paths = [
      ["POST", `/api/decks/${deckId}/editions/uk/approval`, {}],
      ["PUT", `/api/decks/${deckId}/editions/uk/publication`, undefined],
    ] as const;
    for (const [method, path, body] of paths) {
      const readOnly = await call(path, method, key.read, body);
      expect(readOnly.status).toBe(403);
      expect(await readOnly.json()).toMatchObject({ error: expect.stringMatching(/only read/) });

      const outsider = await call(path, method, key.outsider, body);
      expect(outsider.status).toBe(403);
      expect(await outsider.json()).toMatchObject({ error: expect.stringMatching(/publishers/) });

      expect((await call(path, method, key.otherPublisher, body)).status).toBe(404);
    }
  });

  it("signs off and then publishes with the publisher's own write key", async () => {
    const signedOff = await call(
      `/api/decks/${deckId}/editions/uk/approval`,
      "POST",
      key.write,
      {},
    );
    expect(signedOff.status).toBe(200);
    expect(await signedOff.json()).toMatchObject({ status: "draft", missing: 0, blockers: [] });

    const published = await call(`/api/decks/${deckId}/editions/uk/publication`, "PUT", key.write);
    expect(published.status).toBe(200);
    expect(await published.json()).toMatchObject({ status: "published", stale: 0, missing: 0 });
  });
});
