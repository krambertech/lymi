import { CardInput } from "@lymi/core";
import { and, asc, eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { addCards, archiveCard, showCard, updateCard, updateCards } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { join } from "./members";
import { listTags } from "./tags";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60_000);

afterAll(async () => {
  await dispose();
});

async function add(ctx: ServiceContext, deckId: string, cards: Partial<CardInput>[]) {
  const outcomes = await addCards(
    ctx,
    cards.map((card) => CardInput.parse({ deckId, ...card })),
  );
  return outcomes.map((outcome) => {
    if (outcome.status !== "added") throw new Error(`${outcome.term} not added`);
    return outcome.card;
  });
}

/** A card's tags as `card_tags` holds them, in order. */
async function stored(cardId: string) {
  const rows = await db
    .select({ name: schema.tags.name })
    .from(schema.cardTags)
    .innerJoin(schema.tags, eq(schema.tags.id, schema.cardTags.tagId))
    .where(eq(schema.cardTags.cardId, cardId))
    .orderBy(asc(schema.cardTags.position));
  return rows.map((row) => row.name);
}

describe("tags", () => {
  it("joins a name typed in another case to the owner's tag, and keeps its spelling", async () => {
    const ctx = await learner(db, "tags-case", "Kateryna");
    const deck = await createDeck(ctx, { name: "Italian", defaultLanguage: "it" });
    const [first, second] = await add(ctx, deck.id, [
      { term: "andare", tags: ["verbs", "travel"] },
      { term: "mangiare", tags: ["Verbs", " food ", "VERBS"] },
    ]);
    if (!first || !second) throw new Error("not added");

    expect(second.tags).toEqual(["verbs", "food"]);
    expect(await stored(second.id)).toEqual(["verbs", "food"]);
    const owned = await db.select().from(schema.tags).where(eq(schema.tags.userId, ctx.userId));
    expect(owned.map((tag) => tag.name).sort()).toEqual(["food", "travel", "verbs"]);
  });

  it("joins case beyond ASCII, which SQLite alone would not fold", async () => {
    const ctx = await learner(db, "tags-cyrillic", "Kateryna");
    const deck = await createDeck(ctx, { name: "Українська", defaultLanguage: "uk" });
    const [first, second] = await add(ctx, deck.id, [
      { term: "йти", tags: ["дієслова"] },
      { term: "їсти", tags: ["Дієслова", "Übung"] },
    ]);
    if (!first || !second) throw new Error("not added");
    expect(second.tags).toEqual(["дієслова", "Übung"]);

    const edited = await updateCard(ctx, first.id, { tags: ["ДІЄСЛОВА", "übung"] });
    expect(edited.tags).toEqual(["дієслова", "Übung"]);
    expect(await listTags(ctx)).toEqual([
      { name: "Übung", cards: 2, own: true },
      { name: "дієслова", cards: 2, own: true },
    ]);
  });

  it("replaces a card's tags on edit, in one write or many", async () => {
    const ctx = await learner(db, "tags-edit", "Kateryna");
    const deck = await createDeck(ctx, { name: "Italian", defaultLanguage: "it" });
    const [one, two] = await add(ctx, deck.id, [
      { term: "uno", tags: ["numbers"] },
      { term: "due", tags: ["numbers"] },
    ]);
    if (!one || !two) throw new Error("not added");

    const edited = await updateCard(ctx, one.id, { tags: ["Food", "numbers"] });
    expect(edited.tags).toEqual(["Food", "numbers"]);
    expect(await stored(one.id)).toEqual(["Food", "numbers"]);

    const [bulk] = await updateCards(ctx, [{ cardId: two.id, tags: [] }]);
    expect(bulk).toMatchObject({ status: "updated", card: { tags: [] } });
    expect(await stored(two.id)).toEqual([]);
    // An edit that leaves tags out leaves them alone.
    await updateCard(ctx, one.id, { meaning: "one" });
    expect(await stored(one.id)).toEqual(["Food", "numbers"]);
  });

  it("refuses a member's change to the owner's tags", async () => {
    const owner = await learner(db, "tags-owner", "Kateryna");
    const member = await learner(db, "tags-member", "Olena");
    const deck = await createDeck(owner, { name: "Estonian", defaultLanguage: "et" });
    const [card] = await add(owner, deck.id, [{ term: "leib", tags: ["food"] }]);
    if (!card) throw new Error("not added");
    await join(member, deck.id);

    await expect(updateCard(member, card.id, { tags: ["mine"] })).rejects.toMatchObject({
      code: "forbidden",
    });
    expect(await stored(card.id)).toEqual(["food"]);
  });

  it("lists one tag per name across own and joined decks, spelled the learner's way", async () => {
    const owner = await learner(db, "tags-list-owner", "Mari");
    const me = await learner(db, "tags-list-me", "Kateryna");
    const shared = await createDeck(owner, { name: "Estonian class", defaultLanguage: "et" });
    await add(owner, shared.id, [
      { term: "leib", tags: ["Food"] },
      { term: "piim", tags: ["Food", "drinks"] },
      { term: "kass", tags: ["animals"] },
    ]);
    await join(me, shared.id);
    const mine = await createDeck(me, { name: "Italian", defaultLanguage: "it" });
    const [pane, gone] = await add(me, mine.id, [
      { term: "pane", tags: ["food"] },
      { term: "vino", tags: ["drinks", "old"] },
    ]);
    if (!pane || !gone) throw new Error("not added");
    await archiveCard(me, gone.id);

    expect(await listTags(me)).toEqual([
      { name: "food", cards: 3, own: true },
      { name: "animals", cards: 1, own: false },
      { name: "drinks", cards: 1, own: false },
    ]);
  });

  it("hides a deck's tags from a learner who reads it in another edition", async () => {
    const owner = await learner(db, "tags-edition-owner", "Mari");
    const member = await learner(db, "tags-edition-member", "Olena");
    const deck = await createDeck(owner, { name: "Pere", defaultLanguage: "et" });
    const [ema] = await add(owner, deck.id, [{ term: "ema", tags: ["family"] }]);
    if (!ema) throw new Error("not added");
    await join(member, deck.id);
    await db
      .update(schema.deckMembers)
      .set({ meaningLanguage: "uk" })
      .where(
        and(eq(schema.deckMembers.deckId, deck.id), eq(schema.deckMembers.userId, member.userId)),
      );

    expect(await listTags(member)).toEqual([]);
    expect((await showCard(member, ema.id)).tags).toEqual([]);
    expect((await showCard(owner, ema.id)).tags).toEqual(["family"]);
    expect(await listTags(owner)).toEqual([{ name: "family", cards: 1, own: true }]);
  });
});
