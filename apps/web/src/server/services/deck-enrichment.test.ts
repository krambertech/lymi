import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Db } from "../db";
import type { ServiceContext } from "./context";
import { createDeck, getDeck, listDecks, updateDeck } from "./decks";
import { join } from "./members";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;
let owner: ServiceContext;
let member: ServiceContext;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  owner = await learner(db, "enrich-owner", "Kateryna");
  member = await learner(db, "enrich-member", "Anna");
}, 60_000);

afterAll(async () => {
  await dispose();
});

describe("a deck's enrichment settings", () => {
  it("start from the deck's language until the owner chooses", async () => {
    const deck = await createDeck(owner, { name: "Eesti", defaultLanguage: "et" });
    expect(deck.enrichFields).toEqual(["meaning", "example", "notes"]);
    const chosen = await updateDeck(owner, deck.id, { enrichFields: ["meaning"] });
    expect(chosen.enrichFields).toEqual(["meaning"]);
    // A chosen list stays the owner's when the language changes.
    expect((await updateDeck(owner, deck.id, { defaultLanguage: "ja" })).enrichFields).toEqual([
      "meaning",
    ]);
  });

  it("keep the instructions the owner's, and blank instructions none", async () => {
    const deck = await createDeck(owner, {
      name: "Français médical",
      defaultLanguage: "fr",
      enrichInstructions: "French for nurses.",
    });
    await join(member, deck.id);
    expect((await getDeck(owner, deck.id)).enrichInstructions).toBe("French for nurses.");
    expect((await getDeck(member, deck.id)).enrichInstructions).toBeNull();
    const listed = (await listDecks(member)).find((row) => row.id === deck.id);
    expect(listed?.enrichInstructions).toBeNull();
    expect(
      (await updateDeck(owner, deck.id, { enrichInstructions: "  " })).enrichInstructions,
    ).toBeNull();
  });

  it("record a change once, as flags and never the words", async () => {
    const capture = vi.fn();
    const ctx = { ...owner, analytics: { capture, writeDataPoint: vi.fn() } };
    const deck = await createDeck(ctx, { name: "Deutsch", defaultLanguage: "de" });
    expect(capture).not.toHaveBeenCalledWith(
      expect.objectContaining({ name: "deck_enrichment_changed" }),
    );
    await updateDeck(ctx, deck.id, {
      enrichFields: ["meaning", "notes"],
      enrichInstructions: "A2",
    });
    await updateDeck(ctx, deck.id, {
      enrichFields: ["notes", "meaning"],
      enrichInstructions: "A2",
    });
    await updateDeck(ctx, deck.id, { name: "Deutsch A2" });
    const changes = capture.mock.calls
      .map(([event]) => event)
      .filter((event) => event.name === "deck_enrichment_changed");
    expect(changes).toEqual([
      {
        name: "deck_enrichment_changed",
        meaning: true,
        example: false,
        notes: true,
        pronunciation: false,
        has_instructions: true,
      },
    ]);
  });
});
