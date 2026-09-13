import { readFileSync } from "node:fs";
import { emptyState, serializeState } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { addCards, cardHistory, updateCard } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck, listDecks, updateDeck } from "./decks";
import { gradeCard, reviewQueue } from "./review";
import { testDb } from "./test-db";

/**
 * The expand-and-contract migration for review modes, ADR 0014: the backfill converges from any
 * starting point without touching schedules or review facts, and older clients keep working.
 */
/** The backfill statements at the end of migration 0012, which a contraction runs again. */
const backfill = readFileSync(
  new URL("../../../migrations/0012_review_modes.sql", import.meta.url),
  "utf8",
)
  .split("--> statement-breakpoint")
  .filter((statement) => statement.includes("UPDATE"));

async function runBackfill(raw: D1Database) {
  for (const statement of backfill) await raw.prepare(statement).run();
}

describe("review mode backfill", () => {
  let db: Db;
  let raw: D1Database;
  let migrate: (file: string) => Promise<void>;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ db, raw, migrate, dispose } = await testDb({ before: "0012_" }));
  }, 60_000);
  afterAll(async () => dispose());

  const snapshot = async (table: string) =>
    (await raw.prepare(`select * from ${table} order by id`).all()).results;
  const withoutMode = (rows: Record<string, unknown>[]) =>
    rows.map(({ mode: _mode, ...row }) => row);

  it("maps legacy rows in the migration, keeps every other fact, and converges when run again", async () => {
    const at = 1_757_000_000_000;
    await raw.batch([
      raw.prepare("insert into user (id, name, email) values ('u', 'U', 'u@lymi.test')"),
      raw.prepare(
        `insert into decks (id, user_id, name, directions, created_at, updated_at)
         values ('d-both', 'u', 'Both', 'both', ${at}, ${at})`,
      ),
      raw.prepare(
        `insert into cards (id, user_id, deck_id, term, created_at, updated_at)
         values ('c1', 'u', 'd-both', 'uno', ${at}, ${at}), ('c2', 'u', 'd-both', 'due', ${at}, ${at})`,
      ),
      raw.prepare(
        `insert into card_states (id, card_id, user_id, direction, due, state, fsrs, last_review, created_at, updated_at)
         values ('s1', 'c1', 'u', 'recognition', ${at + 5}, 2, '{"stability":3}', ${at}, ${at}, ${at}),
                ('s2', 'c1', 'u', 'production', ${at + 6}, 1, '{"stability":1}', null, ${at}, ${at}),
                ('s3', 'c2', 'u', 'recognition', ${at + 7}, 0, '{}', null, ${at}, ${at})`,
      ),
      raw.prepare(
        `insert into reviews (id, user_id, card_id, card_state_id, direction, rating, state, elapsed_days, scheduled_days, stability_after, difficulty_after, reviewed_at)
         values ('r1', 'u', 'c1', 's1', 'recognition', 3, 1, 0, 2, 3.0, 5.0, ${at})`,
      ),
    ]);
    const before = { states: await snapshot("card_states"), reviews: await snapshot("reviews") };

    await migrate("0012_review_modes.sql");
    const migrated = { states: await snapshot("card_states"), reviews: await snapshot("reviews") };
    expect(withoutMode(migrated.states)).toEqual(before.states);
    expect(withoutMode(migrated.reviews)).toEqual(before.reviews);
    expect(migrated.reviews[0]).toMatchObject({ mode: "term_to_meaning" });

    // An older Worker wrote a row without a mode during the deploy; running the backfill again
    // maps only that row.
    await raw
      .prepare(
        `insert into card_states (id, card_id, user_id, direction, due, state, fsrs, created_at, updated_at)
         values ('s4', 'c2', 'u', 'production', ${at + 8}, 0, '{}', ${at}, ${at})`,
      )
      .run();
    await runBackfill(raw);

    const modes = await raw.prepare("select id, mode from card_states order by id").all();
    expect(modes.results).toEqual([
      { id: "s1", mode: "term_to_meaning" },
      { id: "s2", mode: "meaning_to_term" },
      { id: "s3", mode: "term_to_meaning" },
      { id: "s4", mode: "meaning_to_term" },
    ]);
    const after = { states: await snapshot("card_states"), reviews: await snapshot("reviews") };
    expect(after.states.slice(0, 3)).toEqual(migrated.states);

    await runBackfill(raw);
    expect({ states: await snapshot("card_states"), reviews: await snapshot("reviews") }).toEqual(
      after,
    );
  });

  it("backfills an empty database without error", async () => {
    const empty = await testDb();
    try {
      await runBackfill(empty.raw);
      await runBackfill(empty.raw);
    } finally {
      await empty.dispose();
    }
  }, 60_000);

  it("keeps reading a row an older Worker wrote without a mode", async () => {
    const ctx: ServiceContext = { db, userId: "u", actor: "user" };
    await migrate("0013_card_images.sql");
    await raw
      .prepare(
        "update card_states set mode = case id when 's1' then null else mode end, due = 0, fsrs = ?",
      )
      .bind(serializeState(emptyState()))
      .run();
    const queue = await reviewQueue(ctx, { deckId: "d-both" });
    const item = queue.items.find((i) => i.stateId === "s1");
    expect(item).toMatchObject({
      mode: { cue: "term", target: "meaning" },
      direction: "recognition",
    });
    expect((await cardHistory(ctx, "c1")).states.map((s) => s.mode)).toContainEqual({
      cue: "term",
      target: "meaning",
    });
  });
});

describe("review modes after the migration", () => {
  let db: Db;
  let dispose: () => Promise<void>;
  let ctx: ServiceContext;

  beforeAll(async () => {
    const test = await testDb();
    ({ db, dispose } = test);
    await test.raw
      .prepare("insert into user (id, name, email) values ('k', 'K', 'k@lymi.test')")
      .run();
    ctx = { db, userId: "k", actor: "user" };
  }, 60_000);
  afterAll(async () => dispose());

  async function card(deckId: string, term: string) {
    const [added] = await addCards(ctx, [{ deckId, term, meaning: `${term} meaning` }]);
    if (added?.status !== "added") throw new Error("card not added");
    return added.card;
  }

  it("replays a queued legacy grade once, and a mode grade for the same moment is the same grade", async () => {
    const deck = await createDeck(ctx, { name: "Replay", directions: "both" });
    const { id } = await card(deck.id, "replay");
    const reviewedAt = new Date(Date.now() - 60_000);

    const first = await gradeCard(ctx, {
      cardId: id,
      direction: "production",
      rating: 3,
      reviewedAt,
    });
    const replay = await gradeCard(ctx, {
      cardId: id,
      direction: "production",
      rating: 3,
      reviewedAt,
    });
    const mode = { cue: "meaning", target: "term" } as const;
    const asMode = await gradeCard(ctx, { cardId: id, mode, rating: 3, reviewedAt });

    expect([first.duplicate, replay.duplicate, asMode.duplicate]).toEqual([false, true, true]);
    const reviews = await db
      .select({ direction: schema.reviews.direction, mode: schema.reviews.mode })
      .from(schema.reviews)
      .where(eq(schema.reviews.cardId, id));
    expect(reviews).toEqual([{ direction: "production", mode: "meaning_to_term" }]);
  });

  it("treats reviewModes and directions as two spellings of one deck setting", async () => {
    const deck = await createDeck(ctx, {
      name: "Modes",
      reviewModes: [
        { cue: "meaning", target: "term" },
        { cue: "term", target: "meaning" },
      ],
    });
    expect(deck).toMatchObject({ directions: "both" });
    expect((await listDecks(ctx)).find((d) => d.id === deck.id)?.reviewModes).toEqual([
      { cue: "term", target: "meaning" },
      { cue: "meaning", target: "term" },
    ]);

    const legacy = await updateDeck(ctx, deck.id, { directions: "production" });
    expect(legacy.reviewModes).toEqual([{ cue: "meaning", target: "term" }]);
    await expect(
      updateDeck(ctx, deck.id, {
        directions: "recognition",
        reviewModes: [{ cue: "meaning", target: "term" }],
      }),
    ).rejects.toThrow("disagree");
  });

  it("lets a card override its deck with reviewModes and follow it again with null", async () => {
    const deck = await createDeck(ctx, { name: "Override" });
    const { id } = await card(deck.id, "override");

    const own = await updateCard(ctx, id, { reviewModes: [{ cue: "meaning", target: "term" }] });
    expect(own).toMatchObject({
      directions: "production",
      reviewModes: [{ cue: "meaning", target: "term" }],
    });
    const queue = await reviewQueue(ctx, { deckId: deck.id });
    expect(queue.items.map((i) => i.mode)).toEqual([{ cue: "meaning", target: "term" }]);

    const follows = await updateCard(ctx, id, { reviewModes: null });
    expect(follows).toMatchObject({ directions: null, reviewModes: null });
  });
});

describe("GET /api/cards/:id", () => {
  it("returns the card with its review modes, as PATCH and MCP do", async () => {
    const { Hono } = await import("hono");
    const { cards } = await import("../routes/cards");
    const test = await testDb();
    try {
      const ctx = await (await import("./test-db")).learner(test.db, "g", "G");
      const deck = await createDeck(ctx, { name: "Get", directions: "production" });
      const [added] = await addCards(ctx, [{ deckId: deck.id, term: "get" }]);
      if (added?.status !== "added") throw new Error("card not added");
      const app = new Hono<import("../index").AppEnv>();
      app.use("*", async (c, next) => {
        c.set("db", test.db);
        c.set("user", { id: "g" } as never);
        c.set("actor", "user");
        c.set("scope", "write");
        await next();
      });
      app.route("/api/cards", cards);
      const res = await app.request(`/api/cards/${added.card.id}`);
      const body = (await res.json()) as Record<string, unknown>;
      expect(res.status).toBe(200);
      expect(body).toMatchObject({ reviewModes: null, directions: null });
    } finally {
      await test.dispose();
    }
  }, 60_000);
describe("picture modes on cards", () => {
  let dispose: () => Promise<void>;
  let ctx: ServiceContext;

  beforeAll(async () => {
    const test = await testDb();
    dispose = test.dispose;
    await test.raw
      .prepare("insert into user (id, name, email) values ('p', 'P', 'p@lymi.test')")
      .run();
    ctx = { db: test.db, userId: "p", actor: "user" };
  }, 60_000);
  afterAll(async () => dispose());

  it("refuses picture modes on a deck", async () => {
    await expect(
      createDeck(ctx, { name: "Signs", reviewModes: [{ cue: "image", target: "meaning" }] }),
    ).rejects.toThrow("on each card");
  });

  it("keeps a card's picture modes when an older app writes only directions", async () => {
    const deck = await createDeck(ctx, { name: "Mixed" });
    const [added] = await addCards(ctx, [
      {
        deckId: deck.id,
        term: "mixed",
        reviewModes: [
          { cue: "meaning", target: "term" },
          { cue: "image", target: "term" },
        ],
      },
    ]);
    if (added?.status !== "added") throw new Error("card not added");
    expect(added.card.directions).toBe("production");

    const legacy = await updateCard(ctx, added.card.id, { directions: "both" });
    expect(legacy.reviewModes).toEqual([
      { cue: "term", target: "meaning" },
      { cue: "meaning", target: "term" },
      { cue: "image", target: "term" },
    ]);
  });
});
