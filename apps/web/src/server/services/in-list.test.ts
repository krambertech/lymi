import { and, asc, eq, gt, inArray, notInArray } from "@lymi/core/db";
import { afterAll, beforeAll, expect, it } from "vitest";
import { schema } from "../db";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { learner, type TestDb, testDb } from "./test-db";

let test: TestDb;
let ctx: ServiceContext;
let cardIds: string[];

const absent = Array.from({ length: 400 }, (_, i) => `absent-${i}`);

beforeAll(async () => {
  test = await testDb();
  ctx = await learner(test.db, "lists", "Lists");
  const deck = await createDeck(ctx, { name: "Lists" });
  const added = await addCards(
    ctx,
    ["uno", "dos", "tres"].map((term) => ({ deckId: deck.id, term, meaning: term })),
  );
  cardIds = added.map((outcome) => outcome.id);
});

afterAll(() => test.dispose());

it("reads, updates and deletes by a list past D1's 100 bound parameters", async () => {
  const { db } = test;
  const ids = [...absent, ...cardIds];
  const mine = eq(schema.cards.userId, ctx.userId);

  const found = await db.select().from(schema.cards).where(inArray(schema.cards.id, ids));
  expect(found.map((card) => card.id).sort()).toEqual([...cardIds].sort());

  const rest = await db
    .select()
    .from(schema.cards)
    .where(and(mine, notInArray(schema.cards.id, ids.slice(0, -1))));
  expect(rest.map((card) => card.id)).toEqual(cardIds.slice(-1));

  const updated = await db
    .update(schema.cards)
    .set({ notes: "listed" })
    .where(inArray(schema.cards.id, ids))
    .returning({ id: schema.cards.id });
  expect(updated).toHaveLength(3);

  const deleted = await db
    .delete(schema.cards)
    .where(inArray(schema.cards.id, [...absent, cardIds[0] as string]))
    .returning({ id: schema.cards.id });
  expect(deleted).toEqual([{ id: cardIds[0] }]);
});

it("matches dates as the column stores them", async () => {
  const [card] = await test.db
    .select()
    .from(schema.cards)
    .where(and(eq(schema.cards.userId, ctx.userId), gt(schema.cards.createdAt, new Date(0))))
    .orderBy(asc(schema.cards.id))
    .limit(1);
  const same = await test.db
    .select()
    .from(schema.cards)
    .where(inArray(schema.cards.createdAt, [card?.createdAt as Date]));
  expect(same.map((each) => each.id)).toContain(card?.id);
});
