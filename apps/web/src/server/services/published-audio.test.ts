import { deckPageHand, deckPageSpread } from "@lymi/core/catalog";
import { loadPublicDeck, publicDeckFrontCards } from "@lymi/core/catalog/server";
import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { SpeechProvider } from "../ai";
import { type Db, schema } from "../db";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { publishDeck } from "./publications";
import { voicePublishedDecks } from "./published-audio";
import { learner, testDb } from "./test-db";

/** What a deck page shows up front is voiced ahead of a first play; the rest waits for one. #759. */
let db: Db;
let bucket: R2Bucket;
let dispose: () => Promise<void>;
let lymi: ServiceContext;
let anna: ServiceContext;
const publishers = new Set(["lymi@lymi.test"]);

beforeAll(async () => {
  const test = await testDb();
  ({ db, dispose } = test);
  bucket = test.env.AUDIO;
  lymi = await learner(db, "lymi", "Lymi");
  anna = await learner(db, "anna", "Anna");
}, 60_000);

afterAll(async () => {
  await dispose();
});

function voice(speech: SpeechProvider["speech"], languages = ["et"]) {
  const provider: SpeechProvider = {
    provider: "elevenlabs",
    model: "eleven_v4",
    voice: "voice",
    locale: "et-EE",
    contentType: "audio/mpeg",
    extension: "mp3",
    speech,
  };
  return {
    bucket,
    providers: (language: string) => (languages.includes(language) ? [provider] : []),
  };
}

const publication = (slug: string) => ({
  slug,
  summary: "Common Estonian words.",
  meaningLanguage: "en",
  publisher: "Lymi",
  sources: [{ title: "Frequency list" }],
});

async function publishedDeck(slug: string, terms: string[]) {
  const deck = await createDeck(lymi, { name: slug, defaultLanguage: "et" });
  await addCards(
    lymi,
    terms.map((term) => ({ deckId: deck.id, term, meaning: `${term} meaning` })),
  );
  await publishDeck(lymi, deck.id, publication(slug), publishers);
  return deck;
}

const voicedIn = async (deckId: string) =>
  (
    await db
      .select({ id: schema.cards.id, audioKey: schema.cards.audioKey })
      .from(schema.cards)
      .where(eq(schema.cards.deckId, deckId))
  ).flatMap((row) => (row.audioKey ? [row.id] : []));

const terms = (count: number, word: string) =>
  Array.from({ length: count }, (_, i) => `${word} ${i + 1}`);

describe("published deck audio", () => {
  it("voices only the cards the deck page shows up front, once", async () => {
    const deck = await publishedDeck("verbs", terms(30, "olema"));
    const unpublished = await createDeck(lymi, { name: "Drafts", defaultLanguage: "et" });
    await addCards(lymi, [{ deckId: unpublished.id, term: "koer", meaning: "dog" }]);
    const mine = await createDeck(anna, { name: "Mine", defaultLanguage: "et" });
    await addCards(anna, [{ deckId: mine.id, term: "kass", meaning: "cat" }]);

    const front = await publicDeckFrontCards(db, "verbs");
    expect(front.length).toBeGreaterThan(0);
    expect(front.length).toBeLessThanOrEqual(10);

    const speech = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const run = await voicePublishedDecks(db, voice(speech));
    expect(run).toEqual({ voiced: front.length, failed: 0, remaining: 0 });
    expect((await voicedIn(deck.id)).sort()).toEqual([...front].sort());
    expect(await voicedIn(unpublished.id)).toEqual([]);
    expect(await voicedIn(mine.id)).toEqual([]);

    // Running again makes no new voice calls.
    expect(await voicePublishedDecks(db, voice(speech))).toEqual({
      voiced: 0,
      failed: 0,
      remaining: 0,
    });
    expect(speech).toHaveBeenCalledTimes(front.length);
  });

  it("picks the same cards the deck page lays out and deals", async () => {
    const deck = await createDeck(lymi, { name: "Sections", defaultLanguage: "et" });
    await addCards(
      lymi,
      terms(14, "sõna").map((term, i) => ({
        deckId: deck.id,
        term,
        ...(i % 4 === 3 ? {} : { meaning: `${term} meaning` }),
      })),
    );
    await publishDeck(lymi, deck.id, publication("sections"), publishers);
    const page = await loadPublicDeck(db, "sections");
    if (page.status !== "published") throw new Error("Expected a published deck");
    const groups = page.deck.sections
      .map((section) =>
        section.cards.flatMap((card) => (card.meaning ? [{ ...card, meaning: card.meaning }] : [])),
      )
      .filter((cards) => cards.length > 0);
    const shown = new Set(
      [...deckPageSpread(page.deck, groups), ...deckPageHand(page.deck, groups)].map(
        (card) => card.term,
      ),
    );
    const front = await publicDeckFrontCards(db, "sections");
    const frontTerms = await db
      .select({ id: schema.cards.id, term: schema.cards.term })
      .from(schema.cards)
      .where(eq(schema.cards.deckId, deck.id));
    expect(
      new Set(frontTerms.filter((card) => front.includes(card.id)).map((card) => card.term)),
    ).toEqual(shown);
  });

  it("stops at the batch size and leaves the rest for the next run", async () => {
    await publishedDeck("nouns", terms(12, "maja"));
    const speech = vi.fn(async () => new Response(new Uint8Array([1])));
    const first = await voicePublishedDecks(db, voice(speech), { slug: "nouns", limit: 2 });
    expect(first).toMatchObject({ voiced: 2, failed: 0 });
    expect(first.remaining).toBeGreaterThan(0);
    const second = await voicePublishedDecks(db, voice(speech), { slug: "nouns" });
    expect(second).toEqual({ voiced: first.remaining, failed: 0, remaining: 0 });
  });

  it("leaves out cards no provider can voice", async () => {
    const deck = await publishedDeck("welsh", ["bore da"]);
    await db.update(schema.cards).set({ language: "cy" }).where(eq(schema.cards.deckId, deck.id));
    const speech = vi.fn(async () => new Response(new Uint8Array([1])));
    expect(await voicePublishedDecks(db, voice(speech), { slug: "welsh" })).toEqual({
      voiced: 0,
      failed: 0,
      remaining: 0,
    });
    expect(speech).not.toHaveBeenCalled();
  });

  it("keeps a card in the backlog when the provider fails", async () => {
    const deck = await publishedDeck("broken", ["halb"]);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const failing = vi.fn(async () => {
      throw new Error("down");
    });
    expect(await voicePublishedDecks(db, voice(failing), { slug: "broken" })).toEqual({
      voiced: 0,
      failed: 1,
      remaining: 1,
    });
    expect(await voicedIn(deck.id)).toEqual([]);
  });
});
