import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import { learner, testDb } from "./test-db";

/** Migration 0043 puts every account that already had a deck past Welcome, so only an empty one meets it. */
describe("Welcome backfill", () => {
  let db: Db;
  let raw: D1Database;
  let migrate: (file: string) => Promise<void>;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ db, raw, migrate, dispose } = await testDb({ before: "0043_" }));
  }, 60_000);
  afterAll(async () => dispose());

  const onboarded = async (userId: string) =>
    (await raw
      .prepare("SELECT onboarded_at, daily_goal FROM user_settings WHERE user_id = ?")
      .bind(userId)
      .first<{ onboarded_at: number | null; daily_goal: number }>()) ?? null;

  it("marks accounts with a deck, archived or not, and leaves an empty one alone", async () => {
    // Raw throughout, because the services read and write columns this migration predates.
    const deck = (id: string, userId: string, archivedAt: number | null) =>
      raw
        .prepare("INSERT INTO decks (id, user_id, name, archived_at) VALUES (?, ?, ?, ?)")
        .bind(id, userId, "Lessons", archivedAt)
        .run();
    const archived = await learner(db, "archived-only", "Archived");
    await deck("deck-archived", archived.userId, Date.now());
    const chooser = await learner(db, "chose-goal", "Chooser");
    await deck("deck-active", chooser.userId, null);
    await raw
      .prepare("INSERT INTO user_settings (user_id, daily_goal) VALUES (?, 100)")
      .bind(chooser.userId)
      .run();
    await learner(db, "empty", "Empty");

    await migrate("0043_mixed_ink.sql");

    expect((await onboarded("archived-only"))?.onboarded_at).toEqual(expect.any(Number));
    // A row that already existed keeps everything else.
    expect(await onboarded("chose-goal")).toMatchObject({
      onboarded_at: expect.any(Number),
      daily_goal: 100,
    });
    expect(await onboarded("empty")).toBeNull();
  });
});
