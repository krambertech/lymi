import { ApiKeyCreatedOut, MeOut } from "@lymi/core";
import { beforeAll, describe, expect, it } from "vitest";
import { json, type Session, type TestApp, testApp } from "../test-app";

/** The learner's name, which the phone's You edits. */
let app: TestApp;
let learner: Session;
let key: string;

beforeAll(async () => {
  app = await testApp();
  learner = await app.signUp("renamer");
  const made = await app.fetch("/api/keys", {
    ...json({ name: "Lesson notes script", scope: "write" }),
    as: learner,
  });
  key = ApiKeyCreatedOut.parse(await made.json()).key;
}, 60_000);

const rename = (name: unknown, init: { headers?: Record<string, string> } = {}) =>
  json({ name }, { method: "PATCH", ...init });

describe("PATCH /api/me", () => {
  it("renames the learner, trimmed, and /api/me reads the new name", async () => {
    const response = await app.fetch("/api/me", { ...rename("  Kateryna P.  "), as: learner });
    expect(response.status).toBe(200);
    expect(MeOut.parse(await response.json())).toMatchObject({ name: "Kateryna P." });

    const me = await app.fetch("/api/me", { as: learner });
    expect(MeOut.parse(await me.json())).toMatchObject({ name: "Kateryna P." });
  });

  it("refuses an empty name and one over 80 characters", async () => {
    expect((await app.fetch("/api/me", { ...rename("   "), as: learner })).status).toBe(400);
    expect((await app.fetch("/api/me", { ...rename("a".repeat(81)), as: learner })).status).toBe(
      400,
    );
  });

  it("is the learner's to change, never a key's", async () => {
    const response = await app.fetch("/api/me", rename("Bot", { headers: { "x-api-key": key } }));
    expect(response.status).toBe(403);
  });
});
