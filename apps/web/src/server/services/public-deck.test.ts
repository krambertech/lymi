import type { PublicationInput } from "@lymi/core";
import { listPublicDeckSlugs, loadPublicDeck } from "@lymi/core/catalog";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
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
