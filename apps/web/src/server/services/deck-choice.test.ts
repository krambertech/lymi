import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { TextProvider } from "../ai";
import type { Db } from "../db";
import { addCards } from "./cards";
import { chooseDeck, deckFor, termLanguage } from "./deck-choice";
import { createDeck } from "./decks";
import { learner, testDb } from "./test-db";

const model = (language: string | null) => {
  const complete = vi.fn(async () => ({ language }));
  return { provider: { provider: "openai", model: "test", complete } as TextProvider, complete };
};

describe("termLanguage", () => {
  it("reads a script only one language uses without asking the model", async () => {
    const { provider, complete } = model("et");
    expect(await termLanguage("ありがとう", undefined, ["et", "ja"], provider)).toBe("ja");
    expect(await termLanguage("ありがとう", undefined, ["et", "en"], provider)).toBeNull();
    expect(complete).not.toHaveBeenCalled();
  });

  it("takes the model's answer only when it is one of the learner's languages", async () => {
    expect(await termLanguage("rahulik", "ERR", ["et", "en"], model("et").provider)).toBe("et");
    expect(await termLanguage("rahulik", undefined, ["et", "en"], model("fi").provider)).toBeNull();
    expect(await termLanguage("rahulik", undefined, ["et", "en"], model(null).provider)).toBeNull();
  });

  it("keeps the caller's choice without a model, or when it fails", async () => {
    expect(await termLanguage("rahulik", undefined, ["et", "en"], null)).toBeNull();
    const failing = {
      provider: "openai",
      model: "test",
      complete: async () => {
        throw new Error("down");
      },
    } as TextProvider;
    expect(await termLanguage("rahulik", undefined, ["et", "en"], failing)).toBeNull();
  });
});

describe("deckFor", () => {
  it("picks the deck in that language added to last", () => {
    const decks = [
      { id: "kitchen", language: "et", lastAdded: 1 },
      { id: "news", language: "et", lastAdded: 5 },
      { id: "idioms", language: "en", lastAdded: 9 },
    ];
    expect(deckFor(decks, "et")).toBe("news");
    expect(deckFor(decks, "fr")).toBeNull();
    expect(deckFor(decks, null)).toBeNull();
  });
});

describe("chooseDeck", () => {
  let db: Db;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ db, dispose } = await testDb());
  }, 60_000);

  afterAll(async () => {
    await dispose();
  });

  it("names the learner's deck in the term's language, reading a deck's cards when it has no default", async () => {
    const ctx = await learner(db, "deck-choice-1", "Kateryna");
    const idioms = await createDeck(ctx, { name: "Idioms", defaultLanguage: "en" });
    const eesti = await createDeck(ctx, { name: "Eesti" });
    await addCards(ctx, [{ deckId: eesti.id, term: "kurb", meaning: "sad", language: "et" }]);
    expect(await chooseDeck(ctx, { term: "rahulik" }, model("et").provider)).toEqual({
      deckId: eesti.id,
      language: "et",
    });
    expect(await chooseDeck(ctx, { term: "break a leg" }, model("en").provider)).toEqual({
      deckId: idioms.id,
      language: "en",
    });
  });

  it("asks nothing when the decks teach one language between them", async () => {
    const ctx = await learner(db, "deck-choice-2", "Kateryna");
    await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    await createDeck(ctx, { name: "Köök", defaultLanguage: "et" });
    const { provider, complete } = model("et");
    expect(await chooseDeck(ctx, { term: "rahulik" }, provider)).toEqual({
      deckId: null,
      language: null,
    });
    expect(complete).not.toHaveBeenCalled();
  });
});
