import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { addCards } from "./cards";
import { createDeck } from "./decks";
import { storeRecording } from "./recordings";
import { learner, type TestBindings, testDb } from "./test-db";
import { batchRacedBy } from "./test-race";

let db: Db;
let env: TestBindings;
let dispose: () => Promise<void>;

beforeAll(async () => {
  ({ db, env, dispose } = await testDb());
}, 60_000);
afterAll(async () => dispose());

const clip = (sound: string) => async () => new TextEncoder().encode(`ID3${sound}`);

it("says a clip was kept out, and keeps no object, when another recording landed first", async () => {
  const ctx = await learner(db, "raced-recording", "Learner");
  const deck = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
  const [added] = await addCards(ctx, [{ deckId: deck.id, term: "ciao" }]);
  if (added?.status !== "added") throw new Error("not added");
  const { id } = added.card;
  const late = batchRacedBy(ctx, () => storeRecording(ctx, id, clip("first"), env.AUDIO));

  expect(await storeRecording(late, id, clip("second"), env.AUDIO)).toBe("kept");

  const [card] = await db.select().from(schema.cards).where(eq(schema.cards.id, id));
  const { objects } = await env.AUDIO.list({ prefix: `cards/${id}/` });
  expect(objects.map((object) => object.key)).toEqual([card?.audioKey]);
});
