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

/** Published decks are voiced ahead of a first play, once per card. #759. */
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

function voice(speech: SpeechProvider["speech"]) {
  const provider: SpeechProvider = {
    provider: "elevenlabs",
    model: "eleven_v4",
    voice: "voice",
    locale: "et-EE",
    contentType: "audio/mpeg",
    extension: "mp3",
    speech,
  };
  return { bucket, providers: () => [provider] };
}

async function deckWith(ctx: ServiceContext, name: string, terms: string[]) {
  const deck = await createDeck(ctx, { name, defaultLanguage: "et" });
  await addCards(
    ctx,
    terms.map((term) => ({ deckId: deck.id, term, meaning: `${term} meaning` })),
  );
  return deck;
}

const keysOf = async (deckId: string) =>
  (
    await db
      .select({ audioKey: schema.cards.audioKey })
      .from(schema.cards)
      .where(eq(schema.cards.deckId, deckId))
  ).map((row) => row.audioKey);

describe("published deck audio", () => {
  it("voices every card of a published deck once, and leaves other decks alone", async () => {
    const published = await deckWith(lymi, "Verbs", ["olema", "tegema", "minema"]);
    await publishDeck(
      lymi,
      published.id,
      {
        slug: "verbs",
        summary: "The most common Estonian verbs.",
        meaningLanguage: "en",
        publisher: "Lymi",
        sources: [{ title: "Frequency list" }],
      },
      publishers,
    );
    const unpublished = await deckWith(lymi, "Drafts", ["koer"]);
    const private_ = await deckWith(anna, "Mine", ["kass"]);

    const speech = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const first = await voicePublishedDecks(db, voice(speech), { limit: 2, concurrency: 2 });
    expect(first).toEqual({ voiced: 2, failed: 0, remaining: 1 });
    const second = await voicePublishedDecks(db, voice(speech));
    expect(second).toEqual({ voiced: 1, failed: 0, remaining: 0 });
    expect(speech).toHaveBeenCalledTimes(3);
    expect((await keysOf(published.id)).every(Boolean)).toBe(true);

    // Running again makes no new voice calls.
    expect(await voicePublishedDecks(db, voice(speech))).toEqual({
      voiced: 0,
      failed: 0,
      remaining: 0,
    });
    expect(speech).toHaveBeenCalledTimes(3);
    expect(await keysOf(unpublished.id)).toEqual([null]);
    expect(await keysOf(private_.id)).toEqual([null]);
  });

  it("keeps a card in the backlog when the provider fails", async () => {
    const deck = await deckWith(lymi, "Nouns", ["maja"]);
    await publishDeck(
      lymi,
      deck.id,
      {
        slug: "nouns",
        summary: "Common Estonian nouns.",
        meaningLanguage: "en",
        publisher: "Lymi",
        sources: [{ title: "Frequency list" }],
      },
      publishers,
    );
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const failing = vi.fn(async () => {
      throw new Error("down");
    });
    expect(await voicePublishedDecks(db, voice(failing), { deckId: deck.id })).toEqual({
      voiced: 0,
      failed: 1,
      remaining: 1,
    });
    expect(await keysOf(deck.id)).toEqual([null]);
  });
});
