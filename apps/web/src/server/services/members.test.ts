import { and, eq, lte } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { addCards, archiveCard, getCard, restoreCard, searchCards, updateCard } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck, listDeckCards, listDecks, updateDeck } from "./decks";
import { join, leave, listMembers, removeMember } from "./members";
import { catchUpStates } from "./modes";
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

/** Due direction states, one per card per direction, so a missing state shows as a gap. */
const dueStatesFor = async (ctx: ServiceContext, deckId: string) =>
  (
    await db
      .select({ id: schema.cardStates.id })
      .from(schema.cardStates)
      .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
      .where(
        and(
          eq(schema.cards.deckId, deckId),
          eq(schema.cardStates.userId, ctx.userId),
          lte(schema.cardStates.due, new Date()),
        ),
      )
  ).length;

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
    // Good on a new card graduates it: the one learning step is only for a miss.
    expect((await insights(anna)).cards).toMatchObject({
      total: annaBefore.total + 2,
      known: annaBefore.known + 1,
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

/** What every request that reads progress does first. ADR 0022. */
const nextRequest = (ctx: ServiceContext, now?: Date) => catchUpStates(db, ctx.userId, now);

describe("what the owner changes reaches every member on their next request", () => {
  it("joining while the owner adds a card leaves a complete learner state", async () => {
    const { deck } = await sharedDeck("Kool", []);

    await Promise.all([
      join(anna, deck.id),
      addCards(kateryna, [{ deckId: deck.id, term: "õpik" }]),
    ]);
    await nextRequest(anna);

    expect(await dueFor(anna, deck.id)).toBe(1);
    expect(await dueFor(kateryna, deck.id)).toBe(1);
  });

  it("a new card writes only the owner's state until the member comes back", async () => {
    const { deck } = await sharedDeck("Toit", ["leib"]);
    await join(anna, deck.id);

    await addCards(kateryna, [{ deckId: deck.id, term: "piim" }]);

    expect(await dueFor(kateryna, deck.id)).toBe(2);
    expect(await dueStatesFor(anna, deck.id)).toBe(1);
    await nextRequest(anna);
    expect(await dueFor(anna, deck.id)).toBe(2);
  });

  it("a caught-up card counts as added when the owner added it, not when the member came back", async () => {
    const { deck } = await sharedDeck("Puu", []);
    await join(anna, deck.id);
    const [outcome] = await addCards(kateryna, [{ deckId: deck.id, term: "kask" }]);
    if (outcome?.status !== "added") throw new Error("not added");

    const later = new Date(Date.now() + 30 * 86_400_000);
    await nextRequest(anna, later);

    const [state] = await db
      .select({ createdAt: schema.cardStates.createdAt, due: schema.cardStates.due })
      .from(schema.cardStates)
      .where(
        and(eq(schema.cardStates.cardId, outcome.card.id), eq(schema.cardStates.userId, "anna")),
      );
    const [card] = await db
      .select({ createdAt: schema.cards.createdAt })
      .from(schema.cards)
      .where(eq(schema.cards.id, outcome.card.id));
    expect(state?.createdAt).toEqual(card?.createdAt);
    expect(state?.due).toEqual(later);
  });

  it("a member who is caught up matches the deck's version and stays that way", async () => {
    const { deck } = await sharedDeck("Tee", ["sild"]);
    await join(anna, deck.id);
    const versions = async () => {
      const [row] = await db
        .select({ deck: schema.decks.statesVersion, member: schema.deckMembers.statesVersion })
        .from(schema.deckMembers)
        .innerJoin(schema.decks, eq(schema.decks.id, schema.deckMembers.deckId))
        .where(and(eq(schema.deckMembers.deckId, deck.id), eq(schema.deckMembers.userId, "anna")));
      return row;
    };
    const joined = await versions();
    expect(joined?.member).toBe(joined?.deck);

    await addCards(kateryna, [{ deckId: deck.id, term: "jõgi" }]);
    const behind = await versions();
    expect(behind?.member).toBeLessThan(behind?.deck ?? 0);

    await nextRequest(anna);
    await nextRequest(anna);
    const caughtUp = await versions();
    expect(caughtUp?.member).toBe(caughtUp?.deck);
    expect(await dueFor(anna, deck.id)).toBe(2);
  });

  it("a member behind on many decks catches up on all of them in more than one batch", async () => {
    const decks = [];
    for (let i = 0; i < 12; i++) {
      const { deck } = await sharedDeck(`Kursus ${i}`, [`sõna ${i}`]);
      await join(marko, deck.id);
      await addCards(kateryna, [{ deckId: deck.id, term: `uus ${i}` }]);
      decks.push(deck);
    }

    await nextRequest(marko);

    for (const deck of decks) expect(await dueFor(marko, deck.id)).toBe(2);
  });

  it("a deck direction turned on gives the member the missing states", async () => {
    const { deck } = await sharedDeck("Loomad", ["koer", "kass"]);
    await join(anna, deck.id);

    await updateDeck(kateryna, deck.id, { directions: "both" });
    await nextRequest(anna);

    expect(await dueStatesFor(anna, deck.id)).toBe(4);
    expect(await dueStatesFor(kateryna, deck.id)).toBe(4);
    // A card asked both ways is still one card due: a session asks one direction per card.
    expect(await dueFor(anna, deck.id)).toBe(2);
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
    await nextRequest(anna);
    await nextRequest(marko);

    expect(outcomes.every((o) => o.status === "added")).toBe(true);
    expect(await dueStatesFor(kateryna, deck.id)).toBe(60);
    expect(await dueStatesFor(anna, deck.id)).toBe(60);
    expect(await dueStatesFor(marko, deck.id)).toBe(60);
  });

  it("a card's own direction override reaches the member", async () => {
    const { deck, cards } = await sharedDeck("Ilm", ["vihm"]);
    const first = cards[0];
    if (!first) throw new Error("no card");
    await join(anna, deck.id);

    await updateCard(kateryna, first.id, { directions: "both" });
    await nextRequest(anna);

    expect(await dueStatesFor(anna, deck.id)).toBe(2);
  });

  it("repeating a card direction update repairs a missing member state", async () => {
    const { deck, cards } = await sharedDeck("Aeg", ["hommik"]);
    const first = cards[0];
    if (!first) throw new Error("no card");
    await join(anna, deck.id);
    await updateCard(kateryna, first.id, { directions: "both" });
    await nextRequest(anna);
    await db
      .delete(schema.cardStates)
      .where(
        and(
          eq(schema.cardStates.cardId, first.id),
          eq(schema.cardStates.userId, "anna"),
          eq(schema.cardStates.direction, "production"),
        ),
      );

    await updateCard(kateryna, first.id, { directions: "both" });
    await nextRequest(anna);

    expect(await dueStatesFor(anna, deck.id)).toBe(2);
  });

  it("restoring a card reaches a member who joined while it was archived", async () => {
    const { deck, cards } = await sharedDeck("Meri", ["laev"]);
    const first = cards[0];
    if (!first) throw new Error("no card");
    await archiveCard(kateryna, first.id);
    await join(anna, deck.id);

    await restoreCard(kateryna, first.id);
    await nextRequest(anna);

    expect(await dueFor(anna, deck.id)).toBe(1);
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

  it("joining twice repairs states without duplicating membership or audit", async () => {
    const { deck, cards } = await sharedDeck("Pere", ["ema"]);
    const first = cards[0];
    if (!first) throw new Error("no card");
    await join(anna, deck.id);
    await db
      .delete(schema.cardStates)
      .where(and(eq(schema.cardStates.cardId, first.id), eq(schema.cardStates.userId, "anna")));
    await join(anna, deck.id);
    expect(await join(kateryna, deck.id)).toEqual({ ok: true, role: "owner" });
    expect(await listMembers(kateryna, deck.id)).toHaveLength(1);
    expect(await dueFor(anna, deck.id)).toBe(1);
    const audits = await db
      .select({ id: schema.auditLog.id })
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.action, "join"),
          eq(schema.auditLog.entityId, deck.id),
          eq(schema.auditLog.userId, "kateryna"),
        ),
      );
    expect(audits).toHaveLength(1);
  });
});

describe("who may see the member list", () => {
  it("is the owner alone, and it names nobody who left or was removed", async () => {
    const { deck } = await sharedDeck("Klass", ["kutse"]);
    await join(anna, deck.id);
    await join(marko, deck.id);

    // A member sees the owner's name on the deck and nothing about the others. ADR 0011.
    await expect(listMembers(anna, deck.id)).rejects.toThrow(forbidden);
    expect(await listMembers(kateryna, deck.id)).toMatchObject([
      { userId: "anna", name: "Anna", role: "learner" },
      { userId: "marko", name: "Marko", role: "learner" },
    ]);

    await leave(anna, deck.id);
    await removeMember(kateryna, deck.id, "marko");
    expect(await listMembers(kateryna, deck.id)).toEqual([]);
  });

  it("is refused to someone outside the deck entirely", async () => {
    const { deck } = await sharedDeck("Privaatne", ["saladus"]);

    await expect(listMembers(marko, deck.id)).rejects.toThrow("Deck not found");
  });

  it("removing the same member twice removes them once and says so", async () => {
    const { deck } = await sharedDeck("Kodu", ["maja"]);
    await join(anna, deck.id);

    await removeMember(kateryna, deck.id, "anna");
    await expect(removeMember(kateryna, deck.id, "anna")).rejects.toThrow("Member not found");
    const audits = await db
      .select({ id: schema.auditLog.id })
      .from(schema.auditLog)
      .where(
        and(eq(schema.auditLog.action, "remove_member"), eq(schema.auditLog.entityId, deck.id)),
      );
    expect(audits).toHaveLength(1);
  });

  it("a removed member cannot go on grading the cards they had open", async () => {
    const { deck, cards } = await sharedDeck("Turg", ["õun", "pirn"]);
    const first = cards[0];
    const second = cards[1];
    if (!first || !second) throw new Error("no cards");
    await join(anna, deck.id);
    await gradeCard(anna, { cardId: first.id, direction: "recognition", rating: 3 });

    await removeMember(kateryna, deck.id, "anna");

    // The card is still on their screen; the next grade must not land.
    await expect(
      gradeCard(anna, { cardId: second.id, direction: "recognition", rating: 3 }),
    ).rejects.toThrow("Card not found");
  });
});
