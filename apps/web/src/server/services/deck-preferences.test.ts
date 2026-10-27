import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Db } from "../db";
import type { ServiceContext } from "./context";
import { createDeck, getDeck, listDecks, setDeckPreferences } from "./decks";
import { join } from "./members";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;
let owner: ServiceContext;
let member: ServiceContext;
let other: ServiceContext;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  owner = await learner(db, "mei", "Mei");
  member = await learner(db, "tomas", "Tomás");
  other = await learner(db, "noor", "Noor");
}, 60_000);

afterAll(async () => {
  await dispose();
});

const display = async (ctx: ServiceContext, deckId: string) =>
  (await listDecks(ctx)).find((d) => d.id === deckId)?.pronunciationDisplay;

describe("a learner's pronunciation choice for a deck", () => {
  it("defaults to showing pronunciation until a card is Known", async () => {
    const deck = await createDeck(owner, { name: "汉语", defaultLanguage: "zh-CN" });
    expect(deck.pronunciationDisplay).toBe("adaptive");
    expect(await display(owner, deck.id)).toBe("adaptive");
  });

  it("stays each learner's own on a shared deck", async () => {
    const deck = await createDeck(owner, { name: "日本語", defaultLanguage: "ja" });
    await join(member, deck.id);
    await join(other, deck.id);

    const separate = await setDeckPreferences(member, deck.id, {
      pronunciationDisplay: "separate",
    });
    expect(separate.pronunciationDisplay).toBe("separate");
    expect(await display(member, deck.id)).toBe("separate");
    expect(await display(owner, deck.id)).toBe("adaptive");
    expect(await display(other, deck.id)).toBe("adaptive");

    await setDeckPreferences(owner, deck.id, { pronunciationDisplay: "separate" });
    await setDeckPreferences(member, deck.id, { pronunciationDisplay: "adaptive" });
    expect((await getDeck(owner, deck.id)).pronunciationDisplay).toBe("separate");
    expect((await getDeck(member, deck.id)).pronunciationDisplay).toBe("adaptive");
  });

  it("is refused for a deck the learner cannot see", async () => {
    const deck = await createDeck(owner, { name: "Русский", defaultLanguage: "ru" });
    await expect(
      setDeckPreferences(other, deck.id, { pronunciationDisplay: "separate" }),
    ).rejects.toThrow("Deck not found");
  });

  it("records each change once, with the notation and never the deck", async () => {
    const capture = vi.fn();
    const ctx = { ...owner, analytics: { capture, writeDataPoint: vi.fn() } };
    const deck = await createDeck(owner, { name: "粵語", defaultLanguage: "zh-yue" });
    const plain = await createDeck(owner, { name: "Español", defaultLanguage: "es" });
    await setDeckPreferences(ctx, deck.id, { pronunciationDisplay: "separate" });
    await setDeckPreferences(ctx, deck.id, { pronunciationDisplay: "separate" });
    await setDeckPreferences(ctx, plain.id, { pronunciationDisplay: "separate" });
    const set = capture.mock.calls
      .map(([event]) => event)
      .filter((event) => event.name === "pronunciation_display_set");
    expect(set).toEqual([
      {
        name: "pronunciation_display_set",
        display: "separate",
        notation: "jyutping",
        owner: true,
        channel: "app",
      },
    ]);
  });
});
