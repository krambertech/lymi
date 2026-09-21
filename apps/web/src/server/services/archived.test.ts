import { CardInput } from "@lymi/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import { addCards, archiveCard, searchCards } from "./cards";
import { archiveDeck, createDeck, listDecks, restoreDeck } from "./decks";
import { learner, testDb } from "./test-db";

/** One learner, two decks, and a card in each, so an archive can be seen from both sides. */
describe("Archived", () => {
  let db: Db;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ db, dispose } = await testDb());
  }, 60_000);

  afterAll(async () => {
    await dispose();
  });

  it("lists archived decks and leaves them out of the active list", async () => {
    const ctx = await learner(db, "archived-decks", "Kateryna");
    const kept = await createDeck(ctx, { name: "Everyday Estonian" });
    const shelved = await createDeck(ctx, { name: "Old Italian" });
    await archiveDeck(ctx, shelved.id);

    expect((await listDecks(ctx)).map((d) => d.id)).toEqual([kept.id]);
    const archived = await listDecks(ctx, { archived: true });
    expect(archived.map((d) => d.id)).toEqual([shelved.id]);
    expect(archived[0]?.archivedAt).toBeInstanceOf(Date);

    await restoreDeck(ctx, shelved.id);
    expect((await listDecks(ctx, { archived: true })).length).toBe(0);
    expect((await listDecks(ctx)).map((d) => d.id).sort()).toEqual([kept.id, shelved.id].sort());
  });

  it("returns archived decks newest first, so the last one archived is on top", async () => {
    const ctx = await learner(db, "archived-order", "Kateryna");
    const first = await createDeck(ctx, { name: "First" });
    const second = await createDeck(ctx, { name: "Second" });
    await archiveDeck(ctx, first.id);
    await new Promise((resolve) => setTimeout(resolve, 10));
    await archiveDeck(ctx, second.id);

    expect((await listDecks(ctx, { archived: true })).map((d) => d.name)).toEqual([
      "Second",
      "First",
    ]);
  });

  it("finds only cards archived on their own, in a deck restore can still reach", async () => {
    const ctx = await learner(db, "archived-cards", "Kateryna");
    const open = await createDeck(ctx, { name: "Everyday Estonian" });
    const shelved = await createDeck(ctx, { name: "Old Italian" });
    const [loose, inShelved, alsoInShelved] = await addCards(ctx, [
      CardInput.parse({ deckId: open.id, term: "aitäh" }),
      CardInput.parse({ deckId: shelved.id, term: "magari" }),
      CardInput.parse({ deckId: shelved.id, term: "sbrigarsi" }),
    ]);
    if (loose?.status !== "added" || inShelved?.status !== "added") throw new Error("not added");
    if (alsoInShelved?.status !== "added") throw new Error("not added");

    // One card archived on its own, one archived inside a deck that is then archived too.
    await archiveCard(ctx, loose.card.id);
    await archiveCard(ctx, inShelved.card.id);
    await archiveDeck(ctx, shelved.id);

    const found = (await searchCards(ctx, { archived: true })).cards;
    expect(found.map((row) => row.card.id)).toEqual([loose.card.id]);
    // The deck's own cards come back with the deck, so neither of them is listed here.
    expect(found.map((row) => row.card.term)).not.toContain(alsoInShelved.card.term);
  });

  it("keeps an archived deck's cards out of the active search", async () => {
    const ctx = await learner(db, "archived-hidden", "Kateryna");
    const shelved = await createDeck(ctx, { name: "Old Italian" });
    const [added] = await addCards(ctx, [CardInput.parse({ deckId: shelved.id, term: "magari" })]);
    if (added?.status !== "added") throw new Error("not added");

    expect((await searchCards(ctx, {})).cards.map((row) => row.card.id)).toEqual([added.card.id]);
    await archiveDeck(ctx, shelved.id);
    expect(await searchCards(ctx, {})).toEqual({ cards: [], next: null, total: 0 });
    expect(await searchCards(ctx, { archived: true })).toEqual({ cards: [], next: null, total: 0 });
  });
});
