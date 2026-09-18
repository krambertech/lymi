import { newId, type PublicationInput } from "@lymi/core";
import { listPublicCatalog, listPublicDeckSlugs, loadPublicDeck } from "@lymi/core/catalog";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { addCards, archiveCard } from "./cards";
import type { ServiceContext } from "./context";
import { archiveDeck, createDeck } from "./decks";
import { turnOnJoinLink } from "./invitations";
import { addPublishedDeck, publishDeck, withdrawDeck } from "./publications";
import { archiveSection, createSection } from "./sections";
import { learner, testDb } from "./test-db";

/** The public Worker's read of a published deck, against real product writes. ADR 0016. */
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
  sources: [{ title: "EKI A1 word list", url: "https://www.eki.ee/" }],
});

async function sectionedDeck(slug: string) {
  const deck = await createDeck(lymi, { name: `Everyday Estonian ${slug}`, defaultLanguage: "et" });
  const greetings = await createSection(lymi, deck.id, { name: "Greetings" });
  const shop = await createSection(lymi, deck.id, { name: "In the shop" });
  const later = await createSection(lymi, deck.id, { name: "Dropped" });
  const outcomes = await addCards(lymi, [
    { deckId: deck.id, sectionId: shop.id, term: `leib ${slug}`, meaning: "bread" },
    {
      deckId: deck.id,
      sectionId: greetings.id,
      term: `tere ${slug}`,
      meaning: "hello",
      notes: "PRIVATE-NOTE",
      example: "PRIVATE-EXAMPLE",
    },
    { deckId: deck.id, sectionId: greetings.id, term: `aitäh ${slug}`, meaning: "thank you" },
    { deckId: deck.id, sectionId: later.id, term: `kott ${slug}`, meaning: "bag" },
    { deckId: deck.id, sectionId: later.id, term: `buss ${slug}`, meaning: "bus" },
    { deckId: deck.id, sectionId: shop.id, term: `ARCHIVED-${slug}`, meaning: "archived" },
  ]);
  const archived = outcomes.at(-1);
  if (archived?.status !== "added") throw new Error("the archived card was not added");
  await archiveCard(lymi, archived.card.id);
  await archiveSection(lymi, later.id, { cards: "keep" });
  await publishDeck(lymi, deck.id, input(slug), publishers);
  return deck;
}

describe("loadPublicDeck", () => {
  it("shows active cards under active sections in order, and kept cards last", async () => {
    await sectionedDeck("ordered");
    const result = await loadPublicDeck(db, "ordered");
    if (result.status !== "published") throw new Error(result.status);
    expect(result.deck).toMatchObject({
      slug: "ordered",
      name: "Everyday Estonian ordered",
      language: "et",
      meaningLanguage: "en",
      publisher: "Lymi",
      level: "A1",
      revision: 1,
      cardCount: 5,
    });
    expect(result.deck.sections.map((s) => [s.name, s.cards.map((c) => c.term)])).toEqual([
      ["Greetings", ["tere ordered", "aitäh ordered"]],
      ["In the shop", ["leib ordered"]],
      [null, ["kott ordered", "buss ordered"]],
    ]);
    expect(JSON.stringify(result)).not.toContain("ARCHIVED");
  });

  it("never carries ids, account details, members, notes or examples", async () => {
    const deck = await sectionedDeck("private");
    await turnOnJoinLink(lymi, deck.id);
    await addPublishedDeck(anna, "private");
    const result = await loadPublicDeck(db, "private");
    const json = JSON.stringify(result);
    expect(result.status).toBe("published");
    for (const secret of [
      deck.id,
      "lymi@lymi.test",
      "anna",
      "Lymi Publisher Account",
      "PRIVATE-NOTE",
      "PRIVATE-EXAMPLE",
    ]) {
      expect(json).not.toContain(secret);
    }
    expect(json).not.toMatch(/"(id|userId|deckId|sectionId|notes|example|token)"/);
  });

  it("is unavailable once withdrawn or archived, and missing for an unknown slug", async () => {
    const withdrawn = await sectionedDeck("withdrawn-page");
    await withdrawDeck(lymi, withdrawn.id);
    expect(await loadPublicDeck(db, "withdrawn-page")).toEqual({ status: "unavailable" });

    const archived = await sectionedDeck("archived-page");
    await archiveDeck(lymi, archived.id);
    expect(await loadPublicDeck(db, "archived-page")).toEqual({ status: "unavailable" });

    expect(await loadPublicDeck(db, "never-published")).toEqual({ status: "missing" });
    expect(await loadPublicDeck(db, "Not/A slug")).toEqual({ status: "missing" });

    const slugs = (await listPublicDeckSlugs(db)).map((row) => row.slug);
    expect(slugs).toContain("ordered");
    expect(slugs).not.toContain("withdrawn-page");
    expect(slugs).not.toContain("archived-page");
  });

  it("raises the revision a cache keys on when the page changes", async () => {
    const deck = await sectionedDeck("revised-page");
    await publishDeck(lymi, deck.id, { ...input("revised-page"), summary: "New." }, publishers);
    const result = await loadPublicDeck(db, "revised-page");
    expect(result).toMatchObject({ status: "published", deck: { revision: 2, summary: "New." } });
  });
});

/** Explore's read of the whole catalogue. The second allowlist of ADR 0016. */
/** Rows go in a few at a time: D1 binds 100 parameters to a statement, every column counted. */
async function insertAll<T>(table: Parameters<Db["insert"]>[0], rows: T[], perStatement: number) {
  for (let from = 0; from < rows.length; from += perStatement) {
    // biome-ignore lint/suspicious/noExplicitAny: one helper for tables of different shapes.
    await db.insert(table).values(rows.slice(from, from + perStatement) as any);
  }
}

/**
 * A published deck of `count` cards with a published Ukrainian edition of every one. The cards
 * and their text are written straight to the tables: the service path costs about a second a
 * card, and this test needs more cards than D1 will bind parameters for.
 */
async function wideUkrainianDeck(slug: string, count: number) {
  const deck = await createDeck(lymi, { name: `Wide Estonian ${slug}`, defaultLanguage: "et" });
  const cards = Array.from({ length: count }, (_, index) => ({
    id: newId(),
    userId: lymi.userId,
    deckId: deck.id,
    term: `${slug} ${index}`,
    meaning: `word ${index}`,
  }));
  await insertAll(schema.cards, cards, 4);
  await publishDeck(lymi, deck.id, input(slug), publishers);
  await db.insert(schema.deckEditions).values({
    id: newId(),
    deckId: deck.id,
    language: "uk",
    status: "published",
    revision: 1,
    publishedAt: new Date(),
  });
  await db.insert(schema.deckLocalizations).values({
    id: newId(),
    deckId: deck.id,
    language: "uk",
    provenance: "human",
    status: "approved",
    sourceRevision: 1,
    name: `Естонська ${slug}`,
    summary: "Перші тижні в Естонії.",
  });
  await insertAll(
    schema.cardLocalizations,
    cards.map((card, index) => ({
      id: newId(),
      cardId: card.id,
      language: "uk",
      provenance: "human",
      status: "approved",
      sourceRevision: 1,
      meaning: `слово ${index}`,
    })),
    6,
  );
}

describe("listPublicCatalog", () => {
  it("carries a deck's shelf, its counts and one of its cards, and nothing private", async () => {
    const deck = await sectionedDeck("shelf");
    await turnOnJoinLink(lymi, deck.id);
    await addPublishedDeck(anna, "shelf");

    const row = (await listPublicCatalog(db)).find((entry) => entry.slug === "shelf");
    expect(row).toMatchObject({
      name: "Everyday Estonian shelf",
      category: "languages",
      level: "A1",
      language: "et",
      meaningLanguage: "en",
      cardCount: 5,
      sectionCount: 2,
    });
    // The card on the tray is a real one from the deck, with its meaning and its section.
    expect(row?.card?.term).toContain("shelf");
    expect(row?.card?.meaning).toBeTruthy();

    const json = JSON.stringify(row);
    for (const secret of [
      deck.id,
      "lymi@lymi.test",
      "anna",
      "Lymi Publisher Account",
      "PRIVATE-NOTE",
      "PRIVATE-EXAMPLE",
      "ARCHIVED",
    ]) {
      expect(json).not.toContain(secret);
    }
    expect(json).not.toMatch(/"(id|userId|deckId|sectionId|notes|example|token|publisher)"/);
  });

  it("holds exactly the decks whose own page answers 200", async () => {
    const gone = await sectionedDeck("withdrawn-shelf");
    await withdrawDeck(lymi, gone.id);
    const slugs = (await listPublicCatalog(db)).map((row) => row.slug);
    expect(slugs).toContain("shelf");
    expect(slugs).not.toContain("withdrawn-shelf");
    expect(slugs).not.toContain("archived-page");
    expect(new Set(slugs)).toEqual(new Set((await listPublicDeckSlugs(db)).map((row) => row.slug)));
  });

  it("gives the same deck the same tray card until its revision moves", async () => {
    await sectionedDeck("steady");
    const first = (await listPublicCatalog(db)).find((row) => row.slug === "steady")?.card?.term;
    const again = (await listPublicCatalog(db)).find((row) => row.slug === "steady")?.card?.term;
    expect(again).toBe(first);
  });

  it("reads an edition whose decks hold more cards than D1 binds parameters", async () => {
    // The tray used to ask for every candidate card's text at once, a bound parameter apiece,
    // and D1 stops a query at 100. Three decks of these put 102 on it. Explore's own 500.
    for (const slug of ["cap-one", "cap-two", "cap-three"]) await wideUkrainianDeck(slug, 34);
    const rows = await listPublicCatalog(db, "uk");
    const row = rows.find((entry) => entry.slug === "cap-one");
    expect(row).toMatchObject({ name: "Естонська cap-one", meaningLanguage: "uk", cardCount: 34 });
    expect(row?.card?.meaning).toMatch(/^слово /);
  }, 60_000);
});
