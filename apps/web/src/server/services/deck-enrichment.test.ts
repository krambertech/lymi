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

  it("start from the purpose, which an existing deck infers from its language", async () => {
    const language = await createDeck(owner, { name: "Deutsch", defaultLanguage: "de" });
    expect(language.purpose).toBe("language");
    expect((await createDeck(owner, { name: "Misc" })).purpose).toBe("other");

    const subject = await createDeck(owner, {
      name: "Anatomie",
      defaultLanguage: "de",
      purpose: "subject",
    });
    expect(subject).toMatchObject({ purpose: "subject", enrichFields: ["meaning"] });
    const moved = await updateDeck(owner, language.id, { purpose: "subject" });
    expect(moved).toMatchObject({ purpose: "subject", enrichFields: ["meaning"] });

    await join(member, subject.id);
    expect((await getDeck(member, subject.id)).purpose).toBeNull();
    const listed = (await listDecks(member)).find((row) => row.id === subject.id);
    expect(listed).toMatchObject({ purpose: null, enrichFields: ["meaning"] });
  });

  it("keep the fields an owner chose when the purpose changes", async () => {
    const deck = await createDeck(owner, {
      name: "Eesti",
      defaultLanguage: "et",
      enrichFields: ["meaning", "example"],
    });
    const after = await updateDeck(owner, deck.id, { purpose: "other" });
    expect(after.enrichFields).toEqual(["meaning", "example"]);
  });

  it("record a chosen purpose as its category, once per change", async () => {
    const capture = vi.fn();
    const ctx = { ...owner, analytics: { capture, writeDataPoint: vi.fn() } };
    const deck = await createDeck(ctx, { name: "Biology exam", purpose: "subject" });
    await updateDeck(ctx, deck.id, { purpose: "subject" });
    await updateDeck(ctx, deck.id, { purpose: "other" });
    await createDeck(ctx, { name: "No purpose" });
    const set = capture.mock.calls
      .map(([event]) => event)
      .filter((event) => event.name === "deck_purpose_set");
    expect(set).toEqual([
      { name: "deck_purpose_set", purpose: "subject", created: true, channel: "app" },
      { name: "deck_purpose_set", purpose: "other", created: false, channel: "app" },
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
