import { CardInput, type CardSearchInput, newId } from "@lymi/core";
import { and, eq, sql } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { addCards, archiveCard, SEARCH_SCAN_LIMIT, searchCards } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { join } from "./members";
import { archiveSection, createSection } from "./sections";
import { learner, testDb } from "./test-db";

const DAY = 86_400_000;

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

async function everyPage(ctx: ServiceContext, search: CardSearchInput) {
  const ids: string[] = [];
  const totals: (number | null)[] = [];
  const sizes: number[] = [];
  let cursor: string | undefined;
  for (let page = 0; page < 20; page++) {
    const result = await searchCards(ctx, { ...search, ...(cursor ? { cursor } : {}) });
    ids.push(...result.cards.map((row) => row.card.id));
    totals.push(result.total);
    sizes.push(result.cards.length);
    if (!result.nextCursor) return { ids, totals, sizes, pages: page + 1 };
    cursor = result.nextCursor;
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

  it("pages a text search, with a total on the first page only", async () => {
    const ctx = await learner(db, "paging-2", "Kateryna");
    const deck = await createDeck(ctx, { name: "Estonian", defaultLanguage: "et" });
    const cards = await add(ctx, deck.id, ["maja", "majas", "majad", "kass", "koer", "majake"]);
    const houses = cards.filter((card) => card.term.startsWith("maja")).map((card) => card.id);

    const listed = await everyPage(ctx, { query: "maja", limit: 2 });

    expect(listed.ids).toHaveLength(houses.length);
    expect(new Set(listed.ids)).toEqual(new Set(houses));
    expect(listed.totals).toEqual([4, null]);
  });

  it("pages archived cards by when they were archived, every card once", async () => {
    const ctx = await learner(db, "paging-archived", "Kateryna");
    const deck = await createDeck(ctx, { name: "Estonian", defaultLanguage: "et" });
    const cards = await add(ctx, deck.id, ["üks", "kaks", "kolm", "neli", "viis"]);
    for (const card of cards) await archiveCard(ctx, card.id);

    const listed = await everyPage(ctx, { archived: true, limit: 2 });

    expect(listed.ids).toEqual(cards.map((card) => card.id).reverse());
    expect(listed.totals).toEqual([5, 5, 5]);
  });

  it("carries a text scan on past its row limit with short and empty pages", async () => {
    const ctx = await learner(db, "paging-scan", "Kateryna");
    const deck = await createDeck(ctx, { name: "Big", defaultLanguage: "et" });
    const [needle] = await add(ctx, deck.id, ["haruldane"]);
    if (!needle) throw new Error("not added");
    await db
      .update(schema.cards)
      .set({ createdAt: new Date(Date.now() - 30 * DAY) })
      .where(eq(schema.cards.id, needle.id));
    // Newer filler than the scan reads in one call, written in one statement.
    const base = Date.now() - DAY;
    await db.run(sql`
      with recursive n(i) as (select 1 union all select i + 1 from n where i < ${SEARCH_SCAN_LIMIT + 10})
      insert into cards (id, user_id, deck_id, term, normalized_term, created_at, updated_at)
      select ${`${newId()}-`} || i, ${ctx.userId}, ${deck.id}, 'sõna ' || i, 'sõna ' || i,
        ${base} + i, ${base} + i
      from n`);

    const first = await searchCards(ctx, { query: "haruldane" });
    expect(first.cards).toEqual([]);
    expect(first.total).toBeNull();
    expect(first.nextCursor).not.toBeNull();

    const second = await searchCards(ctx, {
      query: "haruldane",
      ...(first.nextCursor ? { cursor: first.nextCursor } : {}),
    });
    expect(second.cards.map((row) => row.card.id)).toEqual([needle.id]);
    expect(second.total).toBeNull();
    expect(second.nextCursor).toBeNull();
  }, 60_000);

  it("filters to an active section only", async () => {
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
    expect(found.nextCursor).toBeNull();

    // Keeping the cards leaves their section id set; the archived section still has none.
    await archiveSection(ctx, greetings.id, { cards: "keep" });
    expect(await searchCards(ctx, { sectionId: greetings.id })).toEqual({
      cards: [],
      nextCursor: null,
      total: 0,
    });
  });

  it("finds a card by its exact term when newer cards containing it fill the page", async () => {
    const ctx = await learner(db, "paging-4", "Kateryna");
    const deck = await createDeck(ctx, { name: "Estonian", defaultLanguage: "et" });
    const [ema] = await add(ctx, deck.id, ["ema"]);
    if (!ema) throw new Error("not added");
    await db
      .update(schema.cards)
      .set({ createdAt: new Date(Date.now() - DAY) })
      .where(eq(schema.cards.id, ema.id));
    await add(ctx, deck.id, ["tema", "emakeel", "emand", "hema", "kemaline"]);

    const bySubstring = await searchCards(ctx, { query: "ema", limit: 3 });
    expect(bySubstring.cards.map((row) => row.card.id)).not.toContain(ema.id);
    expect(bySubstring.total).toBe(6);

    const byTerm = await searchCards(ctx, { term: "  EMA ", limit: 3 });
    expect(byTerm.cards.map((row) => row.card.id)).toEqual([ema.id]);
    expect(byTerm.total).toBe(1);
    expect(byTerm.nextCursor).toBeNull();
  });

  it("matches the term a member reads in their pinned edition", async () => {
    const owner = await learner(db, "edition-owner", "Kateryna");
    const member = await learner(db, "edition-member", "Olena");
    const deck = await createDeck(owner, { name: "Pere", defaultLanguage: "et" });
    const [ema] = await add(owner, deck.id, ["ema", "isa"]);
    if (!ema) throw new Error("not added");
    await join(member, deck.id);
    await db
      .update(schema.deckMembers)
      .set({ meaningLanguage: "uk" })
      .where(
        and(eq(schema.deckMembers.deckId, deck.id), eq(schema.deckMembers.userId, member.userId)),
      );
    await db.insert(schema.cardLocalizations).values({
      id: newId(),
      cardId: ema.id,
      language: "uk",
      term: "Мама",
      provenance: "human",
      status: "approved",
      sourceRevision: 1,
    });

    const onScreen = await searchCards(member, { term: "мама" });
    expect(onScreen.cards.map((row) => row.card.id)).toEqual([ema.id]);
    expect(onScreen.cards[0]?.card.term).toBe("Мама");
    expect((await searchCards(member, { term: "ema" })).cards).toEqual([]);
    expect((await searchCards(owner, { term: "ema" })).cards.map((row) => row.card.id)).toEqual([
      ema.id,
    ]);
  });

  it("refuses a cursor it did not hand out, or one that decodes to nonsense", async () => {
    const ctx = await learner(db, "paging-5", "Kateryna");
    for (const cursor of ["page-2", "9999999999999999.abc"]) {
      await expect(searchCards(ctx, { cursor })).rejects.toMatchObject({ code: "invalid" });
    }
  });
});
