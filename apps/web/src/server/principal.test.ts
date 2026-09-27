import { ApiKeyCreatedOut } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { beforeAll, describe, expect, it } from "vitest";
import { schema } from "./db";
import { json, type Session, type TestApp, testApp } from "./test-app";

let app: TestApp;
let learner: Session;
let publisher: Session;

async function makeKey(as: Session) {
  const response = await app.fetch("/api/keys", {
    ...json({ name: "Script", scope: "write" }),
    as,
  });
  const { id, key } = ApiKeyCreatedOut.parse(await response.json());
  return { id, key };
}

const withKey = (key: string) => app.fetch("/api/decks", { headers: { "x-api-key": key } });

async function keyRow(id: string) {
  const [row] = await app.db.select().from(schema.apikey).where(eq(schema.apikey.id, id));
  if (!row) throw new Error("The key row is missing");
  return row;
}

/** Puts the key at its limit, as a run of 600 calls inside one window would. */
async function spend(id: string) {
  await app.db
    .update(schema.apikey)
    .set({ requestCount: 600, lastRequest: new Date() })
    .where(eq(schema.apikey.id, id));
}

beforeAll(async () => {
  app = await testApp({ publishers: ["rate-publisher@lymi.local"] });
  learner = await app.signUp("rate-learner");
  publisher = await app.signUp("rate-publisher");
});

describe("API key rate limit", () => {
  it("answers 429 with Retry-After in seconds when a key is over its limit", async () => {
    const { id, key } = await makeKey(learner);
    await spend(id);

    const response = await withKey(key);
    expect(response.status).toBe(429);
    const retryAfter = Number(response.headers.get("retry-after"));
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);
  });

  it("exempts a publisher's key, including one made before the exemption", async () => {
    const { id, key } = await makeKey(publisher);
    expect((await keyRow(id)).rateLimitEnabled).toBe(true);

    expect((await withKey(key)).status).toBe(200);
    expect((await keyRow(id)).rateLimitEnabled).toBe(false);

    await spend(id);
    expect((await withKey(key)).status).toBe(200);
  });

  it("limits a key again once its owner is not a publisher", async () => {
    const { id, key } = await makeKey(learner);
    await app.db
      .update(schema.apikey)
      .set({ rateLimitEnabled: false })
      .where(eq(schema.apikey.id, id));

    expect((await withKey(key)).status).toBe(200);
    expect((await keyRow(id)).rateLimitEnabled).toBe(true);
  });
});
