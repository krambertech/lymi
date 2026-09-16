import type { EditionImportInput, PublicationInput } from "@lymi/core";
import { loadPublicDeck } from "@lymi/core/catalog";
import { and, eq, isNull, sql } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../db";
import { schema } from "../db";
import { addCards, updateCard } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck, listDeckCards, listDecks, updateDeck } from "./decks";
import {
  approveEdition,
  importEdition,
  listEditions,
  publishEdition,
  withdrawEdition,
} from "./editions";
import { addPublishedDeck, previewPublication, publishDeck } from "./publications";
import { createSection, listSections } from "./sections";
import { createSeries } from "./series";
import { updateSettings } from "./settings";
import { learner, testDb } from "./test-db";

/** Localized editions of one published deck. ADR 0015. */
let db: Db;
let dispose: () => Promise<void>;
let lymi: ServiceContext;
let anna: ServiceContext;
let bohdan: ServiceContext;
const publishers = new Set(["lymi@lymi.test"]);

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  lymi = await learner(db, "lymi", "Lymi Publisher Account");
  anna = await learner(db, "anna", "Anna");
  bohdan = await learner(db, "bohdan", "Bohdan");
}, 60_000);

afterAll(async () => {
  await dispose();
});

const publication = (slug: string): PublicationInput => ({
  slug,
  summary: "Words and phrases for your first weeks in Estonia.",
  publisher: "Lymi",
  meaningLanguage: "en",
  sources: [],
});

/** A published Estonian deck with one section and two cards, in its original English edition. */
async function estonian(slug: string) {
  const deck = await createDeckFor(slug);
  await publishDeck(lymi, deck.deckId, publication(slug), publishers);
  return deck;
}

async function createDeckFor(slug: string) {
  const deck = await createDeck(lymi, { name: `Everyday Estonian ${slug}`, defaultLanguage: "et" });
  const greetings = await createSection(lymi, deck.id, { name: "Greetings" });
  const outcomes = await addCards(lymi, [
    { deckId: deck.id, sectionId: greetings.id, term: `tere ${slug}`, meaning: "hello" },
    { deckId: deck.id, sectionId: greetings.id, term: `leib ${slug}`, meaning: "bread" },
  ]);
  const ids = outcomes.map((outcome) => {
    if (outcome.status !== "added") throw new Error("card not added");
    return outcome.card.id;
  });
  return { deckId: deck.id, sectionId: greetings.id, cardIds: ids as [string, string] };
}

function ukrainian(deck: Awaited<ReturnType<typeof estonian>>): EditionImportInput {
  return {
    deck: { provenance: "human", name: "Естонська на щодень", summary: "Перші тижні в Естонії." },
    sections: [{ sectionId: deck.sectionId, provenance: "human", name: "Вітання" }],
    cards: [
      { cardId: deck.cardIds[0], provenance: "human", meaning: "привіт" },
      { cardId: deck.cardIds[1], provenance: "human", meaning: "хліб" },
    ],
  };
}

/** Each card's meaning by its term, so the assertion does not depend on the list's order. */
function meanings(rows: { card: { term: string; meaning: string | null } }[]) {
  return Object.fromEntries(rows.map((row) => [row.card.term, row.card.meaning]));
}

/** Write, sign off and publish a whole Ukrainian edition. */
async function publishUkrainian(deck: Awaited<ReturnType<typeof estonian>>) {
  await importEdition(lymi, deck.deckId, "uk", ukrainian(deck), publishers);
  await approveEdition(lymi, deck.deckId, "uk", {}, publishers);
  return publishEdition(lymi, deck.deckId, "uk", publishers);
}

describe("an edition's own rows", () => {
  it("leaves an ordinary deck with none", async () => {
    await createDeckFor("ordinary");
    const rows = await db.select().from(schema.cardLocalizations);
    const editions = await db.select().from(schema.deckEditions);
    expect(rows).toEqual([]);
    expect(editions).toEqual([]);
  });

  it("lands as a draft and reports what is missing", async () => {
    const deck = await estonian("drafted");
    const report = await importEdition(lymi, deck.deckId, "uk", ukrainian(deck), publishers);
    expect(report).toMatchObject({ language: "uk", status: "draft", total: 4, missing: 4 });
    expect(report.blockers).toContain("The deck's name and summary are not signed off.");
    const [row] = await db
      .select()
      .from(schema.cardLocalizations)
      .where(eq(schema.cardLocalizations.cardId, deck.cardIds[0]));
    expect(row).toMatchObject({ status: "draft", provenance: "human", approvedBy: null });
  });

  it("refuses the deck's own language, and a card from another deck", async () => {
    const deck = await estonian("refusals");
    const other = await createDeckFor("elsewhere");
    await expect(
      importEdition(lymi, deck.deckId, "en", ukrainian(deck), publishers),
    ).rejects.toThrow(/original edition/);
    await expect(
      importEdition(
        lymi,
        deck.deckId,
        "uk",
        { sections: [], cards: [{ cardId: other.cardIds[0], provenance: "ai" }] },
        publishers,
      ),
    ).rejects.toThrow(/not an active card/);
  });
});

describe("a long edition", () => {
  it("writes, signs off and publishes a deck of 120 cards", async () => {
    const deck = await createDeck(lymi, { name: "Long", defaultLanguage: "et" });
    const outcomes = await addCards(
      lymi,
      Array.from({ length: 120 }, (_, i) => ({
        deckId: deck.id,
        term: `sona-${i}`,
        meaning: `word ${i}`,
      })),
    );
    const cardIds = outcomes.map((outcome) => {
      if (outcome.status !== "added") throw new Error("card not added");
      return outcome.card.id;
    });
    await publishDeck(lymi, deck.id, publication("long-edition"), publishers);
    await importEdition(
      lymi,
      deck.id,
      "uk",
      {
        deck: { provenance: "imported", name: "Довга", summary: "Довга колода." },
        sections: [],
        cards: cardIds.map((cardId, i) => ({
          cardId,
          provenance: "imported" as const,
          meaning: `слово ${i}`,
        })),
      },
      publishers,
    );
    await approveEdition(lymi, deck.id, "uk", {}, publishers);
    const published = await publishEdition(lymi, deck.id, "uk", publishers);
    expect(published).toMatchObject({ status: "published", total: 121, ready: 121, missing: 0 });

    await addPublishedDeck(bohdan, "long-edition", "uk");
    const read = await listDeckCards(bohdan, deck.id);
    expect(read).toHaveLength(120);
    expect(meanings(read)["sona-7"]).toBe("слово 7");
  }, 60_000);
});

describe("what an edition may change", () => {
  it("refuses a localized term unless the publication declares one", async () => {
    const deck = await estonian("shared-terms");
    await expect(
      importEdition(
        lymi,
        deck.deckId,
        "uk",
        {
          sections: [],
          cards: [{ cardId: deck.cardIds[0], provenance: "ai", term: "привіт", meaning: "привіт" }],
        },
        publishers,
      ),
    ).rejects.toThrow(/terms are shared by every edition/);
  });

  it("takes one when the publication asks its terms to be localized", async () => {
    const deck = await createDeckFor("own-terms");
    await publishDeck(
      lymi,
      deck.deckId,
      { ...publication("own-terms"), editionFields: ["term", "meaning"] },
      publishers,
    );
    await importEdition(
      lymi,
      deck.deckId,
      "uk",
      {
        deck: { provenance: "human", name: "Своя", summary: "Своя колода." },
        sections: [{ sectionId: deck.sectionId, provenance: "human", name: "Вітання" }],
        cards: deck.cardIds.map((cardId, i) => ({
          cardId,
          provenance: "human" as const,
          term: `термін-${i}`,
          meaning: `значення ${i}`,
        })),
      },
      publishers,
    );
    await approveEdition(lymi, deck.deckId, "uk", {}, publishers);
    await publishEdition(lymi, deck.deckId, "uk", publishers);
    await addPublishedDeck(bohdan, "own-terms", "uk");
    const read = await listDeckCards(bohdan, deck.deckId);
    expect(read.map((row) => row.card.term).sort()).toEqual(["термін-0", "термін-1"]);
  });

  it("keeps a republished publication's declared fields when they are left out", async () => {
    const deck = await createDeckFor("kept-fields");
    await publishDeck(
      lymi,
      deck.deckId,
      { ...publication("kept-fields"), editionFields: ["term", "meaning"] },
      publishers,
    );
    await publishDeck(lymi, deck.deckId, publication("kept-fields"), publishers);
    expect((await listEditions(lymi, deck.deckId)).editionFields).toEqual(["term", "meaning"]);
  });
});

describe("human approval", () => {
  it("refuses an API key or an MCP client, and records the person who signed off", async () => {
    const deck = await estonian("approval");
    await importEdition(lymi, deck.deckId, "uk", ukrainian(deck), publishers);
    for (const actor of ["api", "mcp", "ai"] as const) {
      await expect(
        approveEdition({ ...lymi, actor }, deck.deckId, "uk", {}, publishers),
      ).rejects.toThrow(/Only a person/);
    }
    const report = await approveEdition(lymi, deck.deckId, "uk", {}, publishers);
    expect(report).toMatchObject({ missing: 0, stale: 0, ready: 4, blockers: [] });
    const [row] = await db
      .select()
      .from(schema.cardLocalizations)
      .where(eq(schema.cardLocalizations.cardId, deck.cardIds[0]));
    expect(row).toMatchObject({ status: "approved", approvedBy: "lymi" });
  });

  it("signs off the series name with the rest of the edition", async () => {
    const deck = await estonian("with-series");
    const made = await createSeries(lymi, { name: "Estonian", deckIds: [deck.deckId] });
    await importEdition(
      lymi,
      deck.deckId,
      "uk",
      { ...ukrainian(deck), series: { provenance: "human", name: "Естонська" } },
      publishers,
    );
    await approveEdition(lymi, deck.deckId, "uk", {}, publishers);
    const [row] = await db
      .select()
      .from(schema.seriesLocalizations)
      .where(eq(schema.seriesLocalizations.seriesId, made.id));
    expect(row).toMatchObject({ status: "approved", approvedBy: "lymi", name: "Естонська" });
  });

  it("refuses an id that names nothing in the deck", async () => {
    const deck = await estonian("unknown-id");
    await importEdition(lymi, deck.deckId, "uk", ukrainian(deck), publishers);
    await expect(
      approveEdition(lymi, deck.deckId, "uk", { cardIds: ["not-a-card"] }, publishers),
    ).rejects.toThrow(/is not in the deck/);
  });

  it("is refused to a learner who is not a publisher", async () => {
    const deck = await estonian("outsider");
    await expect(
      importEdition(anna, deck.deckId, "uk", ukrainian(deck), publishers),
    ).rejects.toThrow();
  });
});

describe("publishing an edition", () => {
  it("refuses one that is incomplete", async () => {
    const deck = await estonian("incomplete");
    await importEdition(lymi, deck.deckId, "uk", { ...ukrainian(deck), cards: [] }, publishers);
    await approveEdition(lymi, deck.deckId, "uk", {}, publishers);
    await expect(publishEdition(lymi, deck.deckId, "uk", publishers)).rejects.toThrow(/not ready/);
  });

  it("refuses one whose canonical text moved after it was signed off", async () => {
    const deck = await estonian("stale");
    await importEdition(lymi, deck.deckId, "uk", ukrainian(deck), publishers);
    await approveEdition(lymi, deck.deckId, "uk", {}, publishers);
    await updateCard(lymi, deck.cardIds[0], { meaning: "hi there" });
    const [edition] = (await listEditions(lymi, deck.deckId)).editions;
    expect(edition).toMatchObject({ stale: 1, ready: 3 });
    await expect(publishEdition(lymi, deck.deckId, "uk", publishers)).rejects.toThrow(/not ready/);

    // Signing off again reads the text as it stands now, so the edition is current.
    await approveEdition(lymi, deck.deckId, "uk", { cardIds: [deck.cardIds[0]] }, publishers);
    await expect(publishEdition(lymi, deck.deckId, "uk", publishers)).resolves.toMatchObject({
      status: "published",
      stale: 0,
    });
  });

  it("goes stale when the AI fills a field the edition was written without", async () => {
    const deck = await estonian("enriched");
    await publishUkrainian(deck);
    // The same write the enrichment run makes: an empty column filled, guarded by that emptiness.
    await db
      .update(schema.cards)
      .set({ example: "Tere, kuidas läheb?", revision: sql`revision + 1` })
      .where(and(eq(schema.cards.id, deck.cardIds[0]), isNull(schema.cards.example)));
    const [edition] = (await listEditions(lymi, deck.deckId)).editions;
    expect(edition).toMatchObject({ stale: 1 });
    expect(edition?.blockers).toContain("1 card changed after being signed off.");
  });

  it("leaves an edition alone when an edit touches nothing it translates", async () => {
    const deck = await estonian("untouched");
    await publishUkrainian(deck);
    await updateCard(lymi, deck.cardIds[0], { tags: ["greeting"] });
    await updateDeck(lymi, deck.deckId, { defaultLanguage: "et" });
    const [edition] = (await listEditions(lymi, deck.deckId)).editions;
    expect(edition).toMatchObject({ stale: 0, blockers: [] });
  });
});

describe("a learner's pinned edition", () => {
  it("shares the deck's terms and ordering, and changes only the meaning side", async () => {
    const deck = await estonian("pinned");
    await publishUkrainian(deck);
    await addPublishedDeck(anna, "pinned", "uk");
    await addPublishedDeck(bohdan, "pinned");

    const [ukrainianCards, englishCards] = await Promise.all([
      listDeckCards(anna, deck.deckId),
      listDeckCards(bohdan, deck.deckId),
    ]);
    expect(ukrainianCards.map((row) => row.card.term)).toEqual(
      englishCards.map((row) => row.card.term),
    );
    expect(meanings(ukrainianCards)).toEqual({
      "tere pinned": "привіт",
      "leib pinned": "хліб",
    });
    expect(meanings(englishCards)).toEqual({ "tere pinned": "hello", "leib pinned": "bread" });

    const [ukrainianSections, englishSections] = await Promise.all([
      listSections(anna, deck.deckId),
      listSections(bohdan, deck.deckId),
    ]);
    expect(ukrainianSections.sections.map((s) => s.name)).toEqual(["Вітання"]);
    expect(englishSections.sections.map((s) => s.name)).toEqual(["Greetings"]);
  });

  it("does not move when the app language changes", async () => {
    const deck = await estonian("settled");
    await publishUkrainian(deck);
    await addPublishedDeck(anna, "settled", "uk");
    await updateSettings(anna, { appLanguage: "en" });
    expect(meanings(await listDeckCards(anna, deck.deckId))).toEqual({
      "tere settled": "привіт",
      "leib settled": "хліб",
    });
  });

  it("is refused a language the deck is not published in", async () => {
    const deck = await estonian("unpublished-edition");
    await importEdition(lymi, deck.deckId, "uk", ukrainian(deck), publishers);
    await expect(addPublishedDeck(anna, "unpublished-edition", "uk")).rejects.toThrow(
      /not published in that language/,
    );
  });

  it("admits a held sign-in to the original when its edition went away meanwhile", async () => {
    const deck = await estonian("held-edition");
    await publishUkrainian(deck);
    await withdrawEdition(lymi, deck.deckId, "uk", publishers);
    // What the sign-in hook does with a day-old cookie: the deck, rather than nothing.
    const added = await addPublishedDeck(bohdan, "held-edition", "uk", {
      fallBackToOriginal: true,
    });
    const [joined] = (await listDecks(bohdan)).filter((row) => row.id === added.deckId);
    expect(joined).toMatchObject({ meaningLanguage: null, name: "Everyday Estonian held-edition" });
  });

  it("keeps reading a withdrawn edition, which nobody new can add", async () => {
    const deck = await estonian("withdrawn-edition");
    await publishUkrainian(deck);
    await addPublishedDeck(anna, "withdrawn-edition", "uk");
    await withdrawEdition(lymi, deck.deckId, "uk", publishers);
    expect(meanings(await listDeckCards(anna, deck.deckId))).toEqual({
      "tere withdrawn-edition": "привіт",
      "leib withdrawn-edition": "хліб",
    });
    await expect(addPublishedDeck(bohdan, "withdrawn-edition", "uk")).rejects.toThrow();
  });
});

describe("the public page", () => {
  it("shows the edition asked for, and the original for a language with none", async () => {
    const deck = await estonian("public-edition");
    await publishUkrainian(deck);
    const uk = await loadPublicDeck(db, "public-edition", "uk");
    const en = await loadPublicDeck(db, "public-edition", "en");
    const ru = await loadPublicDeck(db, "public-edition", "ru");
    if (uk.status !== "published" || en.status !== "published" || ru.status !== "published") {
      throw new Error("the deck is not published");
    }
    expect(uk.deck).toMatchObject({
      name: "Естонська на щодень",
      summary: "Перші тижні в Естонії.",
      meaningLanguage: "uk",
      originalMeaningLanguage: "en",
      editions: ["en", "uk"],
      language: "et",
    });
    expect(uk.deck.sections).toEqual([
      {
        name: "Вітання",
        cards: [
          { term: "tere public-edition", meaning: "привіт" },
          { term: "leib public-edition", meaning: "хліб" },
        ],
      },
    ]);
    expect(en.deck.sections[0]?.cards.map((card) => card.meaning)).toEqual(["hello", "bread"]);
    expect(ru.deck).toMatchObject({
      meaningLanguage: "en",
      name: "Everyday Estonian public-edition",
    });
  });

  it("never shows a draft or withdrawn edition", async () => {
    const drafted = await estonian("draft-page");
    await importEdition(lymi, drafted.deckId, "uk", ukrainian(drafted), publishers);
    await approveEdition(lymi, drafted.deckId, "uk", {}, publishers);
    const draft = await loadPublicDeck(db, "draft-page", "uk");
    if (draft.status !== "published") throw new Error(draft.status);
    expect(draft.deck).toMatchObject({ meaningLanguage: "en", editions: ["en"] });
    expect(JSON.stringify(draft)).not.toContain("привіт");

    const gone = await estonian("gone-page");
    await publishUkrainian(gone);
    await withdrawEdition(lymi, gone.deckId, "uk", publishers);
    const after = await loadPublicDeck(db, "gone-page", "uk");
    if (after.status !== "published") throw new Error(after.status);
    expect(after.deck).toMatchObject({ meaningLanguage: "en", editions: ["en"] });
  });

  it("offers every published edition on the add page", async () => {
    const deck = await estonian("add-editions");
    await publishUkrainian(deck);
    const preview = await previewPublication(db, "add-editions", null);
    expect(preview.editions).toEqual(["en", "uk"]);
  });
});
