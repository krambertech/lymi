import type { PublicationInput } from "@lymi/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { archiveDeck, createDeck } from "./decks";
import { exploreCatalog, exploreDeck } from "./explore";
import { addPublishedDeck, publishDeck, withdrawDeck } from "./publications";
import { createSection } from "./sections";
import { learner, testDb } from "./test-db";

/** Explore inside the product: the public projection, plus what this learner already has. */
let db: Db;
let dispose: () => Promise<void>;
let lymi: ServiceContext;
let anna: ServiceContext;
const publishers = new Set(["lymi@lymi.test"]);

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  lymi = await learner(db, "lymi", "Lymi Publisher Account");
  anna = await learner(db, "anna", "Anna");
}, 60_000);

afterAll(async () => {
  await dispose();
});

const input = (slug: string): PublicationInput => ({
  slug,
  summary: "Words and phrases for your first weeks in Estonia.",
  level: "A1",
  category: "languages",
  meaningLanguage: "en",
  publisher: "Lymi",
  sources: [],
});

async function publish(slug: string) {
  const deck = await createDeck(lymi, { name: `Everyday Estonian ${slug}`, defaultLanguage: "et" });
  const greetings = await createSection(lymi, deck.id, { name: "Greetings" });
  await addCards(lymi, [
    { deckId: deck.id, sectionId: greetings.id, term: `tere ${slug}`, meaning: "hello" },
    { deckId: deck.id, sectionId: greetings.id, term: `aitäh ${slug}`, meaning: "thank you" },
  ]);
  await publishDeck(lymi, deck.id, input(slug), publishers);
  return deck;
}

const find = (rows: Awaited<ReturnType<typeof exploreCatalog>>, slug: string) =>
  rows.decks.find((deck) => deck.slug === slug);

describe("exploreCatalog", () => {
  it("lists a published deck with the counts and the card its tray shows", async () => {
    await publish("listed");
    const row = find(await exploreCatalog(anna), "listed");
    expect(row).toMatchObject({
      slug: "listed",
      name: "Everyday Estonian listed",
      level: "A1",
      category: "languages",
      language: "et",
      cardCount: 2,
      sectionCount: 1,
    });
    expect(row?.card?.section).toBe("Greetings");
  });

  it("says which deck in Library a deck the learner added is, and only for that learner", async () => {
    const deck = await publish("added");
    await addPublishedDeck(anna, "added");
    expect((await exploreCatalog(anna)).added.added).toBe(deck.id);
    expect((await exploreCatalog(await learner(db, "bo", "Bo"))).added.added).toBeUndefined();
  });

  it("drops a withdrawn deck, as the public page does", async () => {
    const deck = await publish("withdrawn");
    expect(find(await exploreCatalog(anna), "withdrawn")).toBeDefined();
    await withdrawDeck(lymi, deck.id);
    expect(find(await exploreCatalog(anna), "withdrawn")).toBeUndefined();
  });

  it("drops an archived deck", async () => {
    const deck = await publish("archived");
    await archiveDeck(lymi, deck.id);
    expect(find(await exploreCatalog(anna), "archived")).toBeUndefined();
  });
});

describe("exploreDeck", () => {
  it("returns the public projection and no deck id before the learner adds it", async () => {
    await publish("one");
    const { deck, deckId } = await exploreDeck(anna, "one");
    expect(deck).toMatchObject({ slug: "one", publisher: "Lymi", cardCount: 2 });
    expect(deck.sections.map((section) => section.name)).toEqual(["Greetings"]);
    expect(deckId).toBeNull();
  });

  it("carries the deck id once the learner has added it", async () => {
    const published = await publish("mine");
    await addPublishedDeck(anna, "mine");
    expect((await exploreDeck(anna, "mine")).deckId).toBe(published.id);
  });

  it("refuses an unknown slug and a withdrawn deck alike", async () => {
    await expect(exploreDeck(anna, "never-published")).rejects.toThrow();
    const deck = await publish("gone");
    await withdrawDeck(lymi, deck.id);
    await expect(exploreDeck(anna, "gone")).rejects.toThrow();
  });
});
