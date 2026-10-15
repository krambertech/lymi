import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import { learner, testDb } from "./test-db";

/** Migration 0049 moves every tag out of `cards.tags` into `tags` and `card_tags`. */
describe("Tags backfill", () => {
  let db: Db;
  let raw: D1Database;
  let migrate: (file: string) => Promise<void>;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ db, raw, migrate, dispose } = await testDb({ before: "0049_" }));
  }, 60_000);
  afterAll(async () => dispose());

  it("keeps every tag, joins case variants per owner, and archived cards keep theirs", async () => {
    // Raw throughout, because the services write tables this migration adds.
    const a = await learner(db, "backfill-a", "Kateryna");
    const b = await learner(db, "backfill-b", "Olena");
    for (const [id, userId] of [
      ["deck-a", a.userId],
      ["deck-b", b.userId],
    ] as const) {
      await raw
        .prepare("INSERT INTO decks (id, user_id, name) VALUES (?, ?, ?)")
        .bind(id, userId, "Lessons")
        .run();
    }
    const card = (id: string, userId: string, deckId: string, tags: string, archived = false) =>
      raw
        .prepare(
          "INSERT INTO cards (id, user_id, deck_id, term, tags, archived_at) VALUES (?, ?, ?, ?, ?, ?)",
        )
        .bind(id, userId, deckId, id, tags, archived ? Date.now() : null)
        .run();
    await card("a1", a.userId, "deck-a", JSON.stringify(["Verbs", "food", " verbs", ""]));
    await card("a2", a.userId, "deck-a", JSON.stringify(["verbs", "imported tag"]), true);
    await card("a3", a.userId, "deck-a", "[]");
    await card("b1", b.userId, "deck-b", JSON.stringify(["Verbs"]));

    await migrate("0049_card_tags.sql");

    const tags = await raw
      .prepare("SELECT user_id, name, normalized_name FROM tags ORDER BY user_id, normalized_name")
      .all<{ user_id: string; name: string; normalized_name: string }>();
    expect(tags.results).toEqual([
      { user_id: "backfill-a", name: "food", normalized_name: "food" },
      { user_id: "backfill-a", name: "imported tag", normalized_name: "imported tag" },
      { user_id: "backfill-a", name: "verbs", normalized_name: "verbs" },
      { user_id: "backfill-b", name: "Verbs", normalized_name: "verbs" },
    ]);
    const cards = await raw
      .prepare("SELECT id, tags FROM cards ORDER BY id")
      .all<{ id: string; tags: string }>();
    expect(cards.results.map((row) => [row.id, JSON.parse(row.tags)])).toEqual([
      ["a1", ["verbs", "food"]],
      ["a2", ["verbs", "imported tag"]],
      ["a3", []],
      ["b1", ["Verbs"]],
    ]);
    const links = await raw.prepare("SELECT count(*) AS n FROM card_tags").first<{ n: number }>();
    expect(links?.n).toBe(5);
  });
});
