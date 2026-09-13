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

  it("maps legacy rows once, keeps every other fact, and converges when run again", async () => {
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
    // An older Worker kept writing between the two migrations, and one row already has its mode.
    await raw.batch([
      raw.prepare(
        `insert into card_states (id, card_id, user_id, direction, due, state, fsrs, created_at, updated_at)
         values ('s4', 'c2', 'u', 'production', ${at + 8}, 0, '{}', ${at}, ${at})`,
      ),
      raw.prepare("update card_states set mode = 'meaning_to_term' where id = 's2'"),
    ]);
    await migrate("0013_backfill_review_modes.sql");

    const modes = await raw.prepare("select id, mode from card_states order by id").all();
    expect(modes.results).toEqual([
      { id: "s1", mode: "term_to_meaning" },
      { id: "s2", mode: "meaning_to_term" },
      { id: "s3", mode: "term_to_meaning" },
      { id: "s4", mode: "meaning_to_term" },
    ]);
    const after = { states: await snapshot("card_states"), reviews: await snapshot("reviews") };
    expect(withoutMode(after.states.slice(0, 3))).toEqual(before.states);
    expect(withoutMode(after.reviews)).toEqual(before.reviews);
    expect(after.reviews[0]).toMatchObject({ mode: "term_to_meaning" });

    await migrate("0013_backfill_review_modes.sql");
    expect({ states: await snapshot("card_states"), reviews: await snapshot("reviews") }).toEqual(
      after,
    );
  });

  it("backfills an empty database without error", async () => {
    const empty = await testDb({ before: "0013_" });
    try {
      await empty.migrate("0013_backfill_review_modes.sql");
      await empty.migrate("0013_backfill_review_modes.sql");
    } finally {
      await empty.dispose();
    }
  }, 60_000);

  it("keeps reading a row an older Worker wrote without a mode", async () => {
    const ctx: ServiceContext = { db, userId: "u", actor: "user" };
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
