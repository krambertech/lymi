import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import { addCards, archiveCard, getCard, searchCards, updateCard } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck, listDeckCards, listDecks, updateDeck } from "./decks";
import { join, leave, listMembers, removeMember } from "./members";
import { gradeCard, reviewQueue } from "./review";
import { insights } from "./stats";
import { learner, testDb } from "./test-db";

/**
 * The group shares the material; each person owns their learning. ADR 0011. One database
 * for the file, and each test adds its own deck so order does not matter.
 */
let db: Db;
let dispose: () => Promise<void>;
let kateryna: ServiceContext;
let anna: ServiceContext;
let marko: ServiceContext;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  kateryna = await learner(db, "kateryna", "Kateryna");
  anna = await learner(db, "anna", "Anna");
  marko = await learner(db, "marko", "Marko");
}, 60_000);

afterAll(async () => {
  await dispose();
});

async function sharedDeck(name: string, terms: string[]) {
  const deck = await createDeck(kateryna, { name, defaultLanguage: "et" });
  const outcomes = await addCards(
    kateryna,
    terms.map((term) => ({ deckId: deck.id, term })),
  );
  const cards = outcomes.flatMap((o) => (o.status === "added" ? [o.card] : []));
  return { deck, cards };
}

const dueFor = async (ctx: ServiceContext, deckId: string) =>
  (await listDecks(ctx)).find((d) => d.id === deckId)?.due;

const forbidden = expect.objectContaining({ code: "forbidden" });

describe("a member studies the owner's deck", () => {
  it("sees the deck and its cards only after joining, with the role and owner", async () => {
    const { deck, cards } = await sharedDeck("Tervitused", ["tere", "head aega"]);
    const first = cards[0];
    if (!first) throw new Error("no card");

    expect((await listDecks(anna)).map((d) => d.id)).not.toContain(deck.id);
    await expect(getCard(anna, first.id)).rejects.toThrow("Card not found");

    await join(anna, deck.id);

    const seen = (await listDecks(anna)).find((d) => d.id === deck.id);
    expect(seen).toMatchObject({
      role: "learner",
      owner: { id: "kateryna", name: "Kateryna" },
      total: 2,
      due: 2,
    });
    expect((await listDeckCards(anna, deck.id)).map((r) => r.card.term).sort()).toEqual([
      "head aega",
      "tere",
    ]);
    expect((await getCard(anna, first.id)).term).toBe(first.term);
    expect((await searchCards(anna, { query: "tere" })).map((r) => r.card.id)).toEqual([first.id]);
    expect(await listMembers(kateryna, deck.id)).toMatchObject([{ userId: "anna", name: "Anna" }]);
    expect(await dueFor(kateryna, deck.id)).toBe(2);
  });

  it("grades their own state and leaves the owner's schedule alone", async () => {
    const { deck, cards } = await sharedDeck("Numbrid", ["üks", "kaks"]);
    const first = cards[0];
    if (!first) throw new Error("no card");
    const annaBefore = (await insights(anna)).cards;
    await join(anna, deck.id);

    const before = await reviewQueue(kateryna, { deckId: deck.id });
    await gradeCard(anna, { cardId: first.id, direction: "recognition", rating: 3 });

    expect(await dueFor(anna, deck.id)).toBe(1);
    expect(await dueFor(kateryna, deck.id)).toBe(2);
    expect((await reviewQueue(kateryna, { deckId: deck.id })).total).toBe(before.total);
    // Insights spans every deck Anna studies, so count the change this deck made.
    expect((await insights(anna)).cards).toMatchObject({
      total: annaBefore.total + 2,
      learning: annaBefore.learning + 1,
      new: annaBefore.new + 1,
    });
  });

  it("cannot change the deck or its cards through any service", async () => {
    const { deck, cards } = await sharedDeck("Värvid", ["punane"]);
    const first = cards[0];
    if (!first) throw new Error("no card");
    await join(anna, deck.id);

    await expect(updateCard(anna, first.id, { meaning: "red" })).rejects.toThrow(forbidden);
    await expect(archiveCard(anna, first.id)).rejects.toThrow(forbidden);
    await expect(addCards(anna, [{ deckId: deck.id, term: "sinine" }])).rejects.toThrow(forbidden);
    await expect(updateDeck(anna, deck.id, { name: "Mine" })).rejects.toThrow(forbidden);
    await expect(removeMember(anna, deck.id, "kateryna")).rejects.toThrow(forbidden);
    await expect(addCards(marko, [{ deckId: deck.id, term: "sinine" }])).rejects.toThrow(
      "Deck not found",
    );
  });
});

describe("what the owner changes reaches every member", () => {
  it("a new card is new for the member", async () => {
    const { deck } = await sharedDeck("Toit", ["leib"]);
    await join(anna, deck.id);

    await addCards(kateryna, [{ deckId: deck.id, term: "piim" }]);

    expect(await dueFor(anna, deck.id)).toBe(2);
    expect(await dueFor(kateryna, deck.id)).toBe(2);
  });

  it("a deck direction turned on gives the member the missing states", async () => {
    const { deck } = await sharedDeck("Loomad", ["koer", "kass"]);
    await join(anna, deck.id);

    await updateDeck(kateryna, deck.id, { directions: "both" });

    expect(await dueFor(anna, deck.id)).toBe(4);
    expect(await dueFor(kateryna, deck.id)).toBe(4);
  });

  it("a whole lesson lands complete for every member, across batches", async () => {
    const { deck } = await sharedDeck("Verbid", []);
    await updateDeck(kateryna, deck.id, { directions: "both" });
    await join(anna, deck.id);
    await join(marko, deck.id);

    const terms = Array.from({ length: 30 }, (_, i) => `verb ${i}`);
    const outcomes = await addCards(
      kateryna,
      terms.map((term) => ({ deckId: deck.id, term })),
    );

    expect(outcomes.every((o) => o.status === "added")).toBe(true);
    expect(await dueFor(kateryna, deck.id)).toBe(60);
    expect(await dueFor(anna, deck.id)).toBe(60);
    expect(await dueFor(marko, deck.id)).toBe(60);
  });

  it("a card's own direction override reaches the member", async () => {
    const { deck, cards } = await sharedDeck("Ilm", ["vihm"]);
    const first = cards[0];
    if (!first) throw new Error("no card");
    await join(anna, deck.id);

    await updateCard(kateryna, first.id, { directions: "both" });

    expect(await dueFor(anna, deck.id)).toBe(2);
  });
});

describe("leaving and being removed", () => {
  it("leaving hides the deck and rejoining resumes where they were", async () => {
    const { deck, cards } = await sharedDeck("Kohvik", ["kohv", "tee"]);
    const first = cards[0];
    if (!first) throw new Error("no card");
    await join(anna, deck.id);
    await gradeCard(anna, { cardId: first.id, direction: "recognition", rating: 3 });

    await leave(anna, deck.id);
    expect((await listDecks(anna)).map((d) => d.id)).not.toContain(deck.id);
    expect((await reviewQueue(anna)).items.map((i) => i.card.deckId)).not.toContain(deck.id);

    await join(anna, deck.id);
    expect(await dueFor(anna, deck.id)).toBe(1);
  });

  it("a member the owner removed cannot rejoin through the link", async () => {
    const { deck } = await sharedDeck("Linn", ["tänav"]);
    await join(anna, deck.id);

    await removeMember(kateryna, deck.id, "anna");

    expect((await listDecks(anna)).map((d) => d.id)).not.toContain(deck.id);
    await expect(join(anna, deck.id)).rejects.toThrow(forbidden);
    expect(await listMembers(kateryna, deck.id)).toEqual([]);
  });

  it("joining twice is one membership, and the owner joining is a no-op", async () => {
    const { deck } = await sharedDeck("Pere", ["ema"]);
    await join(anna, deck.id);
    await join(anna, deck.id);
    expect(await join(kateryna, deck.id)).toEqual({ ok: true, role: "owner" });
    expect(await listMembers(kateryna, deck.id)).toHaveLength(1);
    expect(await dueFor(anna, deck.id)).toBe(1);
  });
});
