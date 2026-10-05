import { newId, type PublicationInput } from "@lymi/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { archiveDeck, createDeck } from "./decks";
import { exploreCatalog, exploreDeck } from "./explore";
import { addPublishedDeck, publishDeck, withdrawDeck } from "./publications";
import { createSection } from "./sections";
import { updateSettings } from "./settings";
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
  category: "languages",
  meaningLanguage: "en",
  publisher: "Lymi",
  sources: [],
});

async function publish(slug: string, over: Partial<PublicationInput> & { language?: string } = {}) {
  const { language = "et", ...publication } = over;
  const deck = await createDeck(lymi, {
    name: `Everyday Estonian ${slug}`,
    defaultLanguage: language,
  });
  const greetings = await createSection(lymi, deck.id, { name: "Greetings" });
  await addCards(lymi, [
    { deckId: deck.id, sectionId: greetings.id, term: `tere ${slug}`, meaning: "hello" },
    { deckId: deck.id, sectionId: greetings.id, term: `aitäh ${slug}`, meaning: "thank you" },
  ]);
  await publishDeck(lymi, deck.id, { ...input(slug), ...publication }, publishers);
  return deck;
}

const find = (rows: Awaited<ReturnType<typeof exploreCatalog>>, slug: string) =>
  rows.decks.find((deck) => deck.slug === slug);

/** An edition row as publishing one leaves it, without the approval flow the editions tests cover. */
async function edition(deckId: string, language: string, status: "published" | "withdrawn") {
  await db.insert(schema.deckEditions).values({
    id: newId(),
    deckId,
    language,
    status,
    revision: 1,
    publishedAt: new Date(),
  });
}

async function reader(name: string, appLanguage: "en" | "uk" | "ru") {
  const ctx = await learner(db, name, name);
  await updateSettings(ctx, { appLanguage });
  return ctx;
}

describe("exploreCatalog", () => {
  it("lists a published deck with the counts and the card its tray shows", async () => {
    await publish("listed");
    const row = find(await exploreCatalog(anna), "listed");
    expect(row).toMatchObject({
      slug: "listed",
      name: "Everyday Estonian listed",
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

  it("counts a deck the learner owns as theirs, so a publisher is never offered its own", async () => {
    const deck = await publish("owned");
    expect((await exploreCatalog(lymi)).added.owned).toBe(deck.id);
    expect((await exploreDeck(lymi, "owned")).deckId).toBe(deck.id);
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

  it("lists a catalogue of more decks than D1 binds parameters for", async () => {
    // Written straight to the tables, a few rows a statement: the service path costs seconds a deck.
    const slugs = Array.from({ length: 110 }, (_, index) => `wide-${index}`);
    const rows = slugs.map((slug) => ({ slug, deckId: newId() }));
    for (const { slug, deckId } of rows) {
      await db.batch([
        db.insert(schema.decks).values({
          id: deckId,
          userId: lymi.userId,
          name: `Wide ${slug}`,
          defaultLanguage: "et",
        }),
        db.insert(schema.cards).values({
          id: newId(),
          userId: lymi.userId,
          deckId,
          term: slug,
          meaning: "hello",
        }),
        db.insert(schema.deckPublications).values({
          id: newId(),
          deckId,
          slug,
          status: "published",
          summary: "Words for a wide catalogue.",
          meaningLanguage: "en",
          publisher: "Lymi",
          sources: [],
          publishedAt: new Date(),
        }),
      ]);
    }
    await addPublishedDeck(anna, "wide-109");
    const catalog = await exploreCatalog(anna);
    expect(catalog.decks.filter((deck) => deck.slug.startsWith("wide-"))).toHaveLength(110);
    expect(catalog.added["wide-109"]).toBeDefined();
  });
});

describe("which decks a learner's Explore lists", () => {
  let english: ServiceContext;
  let ukrainian: ServiceContext;
  let russian: ServiceContext;
  const slugs = async (ctx: ServiceContext) =>
    new Set((await exploreCatalog(ctx)).decks.map((deck) => deck.slug));

  beforeAll(async () => {
    await publish("read-in-english");
    const both = await publish("read-in-uk-and-ru", { meaningLanguage: "uk" });
    await edition(both.id, "ru", "published");
    const withdrawn = await publish("read-in-uk-only", { meaningLanguage: "uk" });
    await edition(withdrawn.id, "en", "withdrawn");
    english = await reader("en-reader", "en");
    ukrainian = await reader("uk-reader", "uk");
    russian = await reader("ru-reader", "ru");
  }, 60_000);

  it("leaves a deck explained only in Ukrainian or Russian off an English learner's", async () => {
    const listed = await slugs(english);
    expect(listed).toContain("read-in-english");
    expect(listed).not.toContain("read-in-uk-and-ru");
    // A withdrawn English edition counts for nothing.
    expect(listed).not.toContain("read-in-uk-only");
  });

  it("lists a deck in its own meaning language and in each published edition", async () => {
    expect(await slugs(ukrainian)).toContain("read-in-uk-and-ru");
    expect(await slugs(ukrainian)).toContain("read-in-uk-only");
    expect(await slugs(russian)).toContain("read-in-uk-and-ru");
    expect(await slugs(russian)).not.toContain("read-in-uk-only");
  });

  it("lists a deck written in English for Ukrainian and Russian learners too", async () => {
    expect(await slugs(ukrainian)).toContain("read-in-english");
    expect(await slugs(russian)).toContain("read-in-english");
  });

  it("still opens a deck left off the learner's Explore by its address", async () => {
    const { deck } = await exploreDeck(english, "read-in-uk-and-ru");
    expect(deck.slug).toBe("read-in-uk-and-ru");
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

describe("more like this", () => {
  it("ranks decks sharing tags first and leaves out the ones in the learner's Library", async () => {
    const science = { category: "science" as const, language: "ja" };
    await publish("kanji-travel", { ...science, tags: ["travel", "alphabet"] });
    await publish("kana-plain", science);
    await publish("kana-travel", { ...science, tags: ["travel"] });
    await publish("kana-both", { ...science, tags: ["alphabet", "travel"] });
    await publish("kana-added", { ...science, tags: ["alphabet", "travel"] });
    await addPublishedDeck(anna, "kana-added");

    const { deck, related } = await exploreDeck(anna, "kanji-travel");
    expect(deck.tags).toEqual(["travel", "alphabet"]);
    expect(related.map((row) => row.slug)).toEqual(["kana-both", "kana-travel", "kana-plain"]);
    expect(related[0]?.tags).toEqual(["travel", "alphabet"]);
  });

  it("leaves out a related deck the learner cannot read", async () => {
    const tagged = { category: "geography" as const, language: "la" };
    await publish("latin-en", tagged);
    await publish("latin-en-too", tagged);
    await publish("latin-uk", { ...tagged, meaningLanguage: "uk" });
    const english = await reader("related-en", "en");
    expect((await exploreDeck(english, "latin-en")).related.map((row) => row.slug)).toEqual([
      "latin-en-too",
    ]);
    // The deck's own page still ranks the ones this learner can read.
    expect((await exploreDeck(english, "latin-uk")).related.map((row) => row.slug)).toEqual([
      "latin-en",
      "latin-en-too",
    ]);
  });

  it("is empty for a deck nothing relates to", async () => {
    await publish("lonely", { category: null, language: "is" });
    expect((await exploreDeck(anna, "lonely")).related).toEqual([]);
  });
});
