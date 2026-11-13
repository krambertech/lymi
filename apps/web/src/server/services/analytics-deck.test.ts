import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { type Db, schema } from "../db";
import type { AnalyticsWriter } from "./analytics";
import { createDeck } from "./decks";
import { join, leave } from "./members";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;
beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60000);
afterAll(async () => {
  await dispose();
});

async function account(id: string) {
  const work: Promise<void>[] = [];
  const capture = vi.fn();
  const analytics: AnalyticsWriter = {
    capture,
    writeDataPoint: vi.fn(),
    later: (run) => {
      work.push(run());
    },
  };
  const ctx = { ...(await learner(db, id, "Learner")), analytics };
  const deckFinishes = async () => {
    await Promise.all(work.splice(0));
    return capture.mock.calls
      .map((call) => call[0])
      .filter((event) => event.name === "welcome_step_finished");
  };
  return { ctx, deckFinishes };
}

const finished = [{ name: "welcome_step_finished", step_name: "deck", skipped: false }];

it("finishes the deck step once when the first deck is joined", async () => {
  const owner = await learner(db, "deck-step-owner", "Owner");
  const first = await createDeck(owner, { name: "Ready" });
  const second = await createDeck(owner, { name: "Another" });
  const { ctx, deckFinishes } = await account("deck-step-joiner");
  await join(ctx, first.id);
  await join(ctx, first.id);
  expect(await deckFinishes()).toEqual(finished);
  await join(ctx, second.id);
  await createDeck(ctx, { name: "Mine" });
  expect(await deckFinishes()).toEqual(finished);
});

it("finishes the deck step once when the first deck is created", async () => {
  const { ctx, deckFinishes } = await account("deck-step-creator");
  const deck = await createDeck(ctx, { id: "deck-step-first", name: "First" });
  await createDeck(ctx, { id: deck.id, name: "First" });
  expect(await deckFinishes()).toEqual(finished);
  await createDeck(ctx, { name: "Second" });
  expect(await deckFinishes()).toEqual(finished);
});

it("does not finish the step for an account that already had a deck", async () => {
  const owner = await learner(db, "deck-step-earlier-owner", "Owner");
  const shared = await createDeck(owner, { name: "Shared" });
  const { ctx, deckFinishes } = await account("deck-step-earlier");
  await createDeck({ ...ctx, analytics: undefined }, { name: "Before the marker" });
  await createDeck(ctx, { name: "After" });
  expect(await deckFinishes()).toEqual([]);

  const { ctx: rejoiner, deckFinishes: rejoined } = await account("deck-step-rejoiner");
  await join({ ...rejoiner, analytics: undefined }, shared.id);
  await leave(rejoiner, shared.id);
  await join(rejoiner, shared.id);
  expect(await rejoined()).toEqual([]);
  expect(
    await db
      .select()
      .from(schema.analyticsReviewStarts)
      .where(eq(schema.analyticsReviewStarts.userId, rejoiner.userId)),
  ).toEqual([]);
});

it("finishes the step once when two first decks arrive at nearly the same moment", async () => {
  const { ctx, deckFinishes } = await account("deck-step-race");
  // Both runs read the account before either marks it, as two requests landing together do.
  await Promise.all([
    createDeck(ctx, { name: "Queued offline" }),
    createDeck(ctx, { name: "Queued too" }),
  ]);
  expect(await deckFinishes()).toEqual(finished);

  const owner = await learner(db, "deck-step-race-owner", "Owner");
  const shared = await createDeck(owner, { name: "Shared" });
  const { ctx: both, deckFinishes: bothFinished } = await account("deck-step-race-join");
  await Promise.all([createDeck(both, { name: "Mine" }), join(both, shared.id)]);
  expect(await bothFinished()).toEqual(finished);
});
