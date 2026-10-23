import { ApiKeyCreatedOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { json, type Session, type TestApp, testApp } from "../test-app";

/** The door Yomitan calls from its extension. What each action does is `services/anki-connect.test.ts`. */
let app: TestApp;
let learner: Session;
let writeKey: string;
let readKey: string;

const EXTENSION = "chrome-extension://likgccmbimhjbgkjambclfkhldnlhbnn";

async function makeKey(name: string, scope: "read" | "write") {
  const made = await app.fetch("/api/keys", { ...json({ name, scope }), as: learner });
  return ApiKeyCreatedOut.parse(await made.json()).key;
}

const post = (body: unknown) =>
  app.fetch("/api/anki-connect", {
    method: "POST",
    headers: { "content-type": "application/json", origin: EXTENSION },
    body: JSON.stringify(body),
  });

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("anki-connect");
  writeKey = await makeKey("Yomitan", "write");
  readKey = await makeKey("Yomitan read", "read");
  await app.fetch("/api/decks", {
    ...json({ name: "日本語", defaultLanguage: "ja" }),
    as: learner,
  });
}, 60_000);

describe("/api/anki-connect", () => {
  it("answers an extension's preflight and lets any origin read the reply", async () => {
    const preflight = await app.fetch("/api/anki-connect", {
      method: "OPTIONS",
      headers: {
        origin: EXTENSION,
        "access-control-request-method": "POST",
        "access-control-request-headers": "content-type",
      },
    });
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("*");
    expect(preflight.headers.get("access-control-allow-headers")).toBe("content-type");

    const reply = await post({ action: "version", version: 2, key: writeKey });
    expect(reply.headers.get("access-control-allow-origin")).toBe("*");
    expect(await reply.json()).toBe(6);
  });

  it("grants permission before a key, and asks for a Lymi key for anything else", async () => {
    expect(await (await post({ action: "requestPermission", version: 6 })).json()).toEqual({
      result: { permission: "granted", requireApikey: true, version: 6 },
      error: null,
    });
    const missing = await post({ action: "deckNames", version: 2 });
    expect(missing.status).toBe(200);
    expect(await missing.json()).toMatchObject({
      error: expect.stringContaining("Lymi’s Settings"),
    });
    const wrong = await post({ action: "deckNames", version: 6, key: "lymi_not_a_key" });
    expect(await wrong.json()).toMatchObject({ result: null, error: expect.any(String) });
    expect(await (await post("not a call")).json()).toMatchObject({ error: expect.any(String) });
  });

  it("adds a card with a write key, named after the key in Activity", async () => {
    const note = {
      deckName: "日本語",
      modelName: "Lymi card",
      fields: { Term: "散歩", Reading: "さんぽ", Meaning: "walk" },
      tags: ["yomitan"],
    };
    expect(
      await (await post({ action: "addNote", version: 2, key: readKey, params: { note } })).json(),
    ).toMatchObject({ error: expect.stringContaining("can only read") });
    const added = await post({ action: "addNote", version: 2, key: writeKey, params: { note } });
    expect(await added.json()).toEqual(expect.any(Number));

    const activity = await app.fetch("/api/activity", { as: learner });
    const { entries } = (await activity.json()) as {
      entries: { kind: string; actor: string; app: string; cards: { term: string }[] }[];
    };
    expect(entries[0]).toMatchObject({
      kind: "cards_added",
      actor: "api",
      app: "Yomitan",
      cards: [{ term: "散歩" }],
    });
  });
});
