import { CardInput } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { addCards, searchCards } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { createSection } from "./sections";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60_000);

afterAll(async () => {
  await dispose();
});

async function add(ctx: ServiceContext, deckId: string, terms: string[]) {
  const outcomes = await addCards(
    ctx,
    terms.map((term) => CardInput.parse({ deckId, term })),
  );
  return outcomes.map((outcome) => {
    if (outcome.status !== "added") throw new Error(`${outcome.term} not added`);
    return outcome.card;
  });
}

async function everyPage(ctx: ServiceContext, search: Parameters<typeof searchCards>[1]) {
  const ids: string[] = [];
  const totals: number[] = [];
  let after: string | undefined;
  for (let page = 0; page < 20; page++) {
    const result = await searchCards(ctx, { ...search, ...(after ? { after } : {}) });
    ids.push(...result.cards.map((row) => row.card.id));
    totals.push(result.total);
    if (!result.next) return { ids, totals, pages: page + 1 };
    after = result.next;
  }
  throw new Error("search never reached its last page");
}

describe("card search paging", () => {
  it("returns every card exactly once across pages, even when cards share a timestamp", async () => {
    const ctx = await learner(db, "paging-1", "Kateryna");
    const deck = await createDeck(ctx, { name: "Estonian", defaultLanguage: "et" });
    const cards = await add(ctx, deck.id, [
      "üks",
      "kaks",
      "kolm",
      "neli",
      "viis",
      "kuus",
      "seitse",
    ]);

    const listed = await everyPage(ctx, { deckId: deck.id, limit: 3 });

    expect(listed.pages).toBe(3);
    expect(listed.ids).toHaveLength(cards.length);
    expect(new Set(listed.ids)).toEqual(new Set(cards.map((card) => card.id)));
    expect(listed.totals).toEqual([7, 7, 7]);
  });

  it("pages a text search the same way, counting every match", async () => {
    const ctx = await learner(db, "paging-2", "Kateryna");
    const deck = await createDeck(ctx, { name: "Estonian", defaultLanguage: "et" });
    const cards = await add(ctx, deck.id, ["maja", "majas", "majad", "kass", "koer", "majake"]);
    const houses = cards.filter((card) => card.term.startsWith("maja")).map((card) => card.id);

    const listed = await everyPage(ctx, { query: "maja", limit: 2 });

    expect(listed.ids).toHaveLength(houses.length);
    expect(new Set(listed.ids)).toEqual(new Set(houses));
    expect(listed.totals.every((total) => total === houses.length)).toBe(true);
  });

  it("filters to one section", async () => {
    const ctx = await learner(db, "paging-3", "Kateryna");
    const deck = await createDeck(ctx, { name: "Estonian", defaultLanguage: "et" });
    const [tere, head, aitah] = await add(ctx, deck.id, ["tere", "head aega", "aitäh"]);
    if (!tere || !head || !aitah) throw new Error("not added");
    const greetings = await createSection(ctx, deck.id, {
      name: "Greetings",
      cardIds: [tere.id, head.id],
    });

    const found = await searchCards(ctx, { sectionId: greetings.id });

    expect(new Set(found.cards.map((row) => row.card.id))).toEqual(new Set([tere.id, head.id]));
    expect(found.total).toBe(2);
    expect(found.next).toBeNull();
  });

  it("finds a card by its exact term when newer cards containing it fill the page", async () => {
    const ctx = await learner(db, "paging-4", "Kateryna");
    const deck = await createDeck(ctx, { name: "Estonian", defaultLanguage: "et" });
    const [ema] = await add(ctx, deck.id, ["ema"]);
    if (!ema) throw new Error("not added");
    await db
      .update(schema.cards)
      .set({ createdAt: new Date(Date.now() - 86_400_000) })
      .where(eq(schema.cards.id, ema.id));
    await add(ctx, deck.id, ["tema", "emakeel", "emand", "hema", "kemaline"]);

    const bySubstring = await searchCards(ctx, { query: "ema", limit: 3 });
    expect(bySubstring.cards.map((row) => row.card.id)).not.toContain(ema.id);
    expect(bySubstring.total).toBe(6);

    const byTerm = await searchCards(ctx, { term: "  EMA ", limit: 3 });
    expect(byTerm.cards.map((row) => row.card.id)).toEqual([ema.id]);
    expect(byTerm.total).toBe(1);
    expect(byTerm.next).toBeNull();
  });

  it("refuses a cursor it did not hand out", async () => {
    const ctx = await learner(db, "paging-5", "Kateryna");
    await expect(searchCards(ctx, { after: "page-2" })).rejects.toMatchObject({
      code: "invalid",
    });
  });
});
