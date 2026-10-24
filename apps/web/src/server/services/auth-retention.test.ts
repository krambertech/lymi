import { newId } from "@lymi/core";
import { beforeEach, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { purgeExpiredAuthRows } from "./auth-retention";
import { learner, testDb } from "./test-db";

const now = new Date("2026-10-24T12:00:00Z");
const hours = (count: number) => new Date(now.getTime() + count * 60 * 60 * 1000);

let db: Db;

beforeEach(async () => {
  ({ db } = await testDb());
}, 60_000);

async function session(userId: string, expiresAt: Date) {
  const id = newId();
  await db.insert(schema.session).values({
    id,
    userId,
    token: newId(),
    expiresAt,
    updatedAt: now,
    ipAddress: "203.0.113.7",
    userAgent: "Safari/18",
  });
  return id;
}

async function verification(expiresAt: Date) {
  const id = newId();
  await db.insert(schema.verification).values({ id, identifier: id, value: "code", expiresAt });
  return id;
}

const ids = async (table: typeof schema.session | typeof schema.verification) =>
  (await db.select({ id: table.id }).from(table)).map((row) => row.id).sort();

describe("purgeExpiredAuthRows", () => {
  it("deletes sessions a day past expiry and expired verification values, keeping the rest", async () => {
    const { userId } = await learner(db, "retention-learner", "Retention");
    const active = await session(userId, hours(1));
    const lately = await session(userId, hours(-23));
    await session(userId, hours(-25));
    const pending = await verification(hours(1));
    await verification(hours(-1));

    await expect(purgeExpiredAuthRows(db, now)).resolves.toEqual({
      sessions: 1,
      verifications: 1,
    });
    expect(await ids(schema.session)).toEqual([active, lately].sort());
    expect(await ids(schema.verification)).toEqual([pending]);
  });

  it("deletes at most one batch of each per run", async () => {
    const { userId } = await learner(db, "retention-backlog", "Backlog");
    for (let i = 0; i < 501; i += 1) await session(userId, hours(-48));
    for (let i = 0; i < 501; i += 1) await verification(hours(-1));

    await expect(purgeExpiredAuthRows(db, now)).resolves.toEqual({
      sessions: 500,
      verifications: 500,
    });
    await expect(purgeExpiredAuthRows(db, now)).resolves.toEqual({
      sessions: 1,
      verifications: 1,
    });
  });

  it("keeps the OAuth refresh token whose session it deletes", async () => {
    const { userId } = await learner(db, "retention-oauth", "Connected");
    const sessionId = await session(userId, hours(-48));
    await db.insert(schema.oauthClient).values({ id: newId(), clientId: "codex", redirectUris: [] });
    const refreshId = newId();
    await db.insert(schema.oauthRefreshToken).values({
      id: refreshId,
      token: "refresh",
      clientId: "codex",
      sessionId,
      userId,
      scopes: ["read", "offline_access"],
      expiresAt: hours(24 * 30),
      createdAt: now,
    });

    await purgeExpiredAuthRows(db, now);

    await expect(
      db
        .select({ id: schema.oauthRefreshToken.id, sessionId: schema.oauthRefreshToken.sessionId })
        .from(schema.oauthRefreshToken),
    ).resolves.toEqual([{ id: refreshId, sessionId: null }]);
  });
});
