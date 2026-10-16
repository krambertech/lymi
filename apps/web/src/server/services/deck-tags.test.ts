import { CardInput } from "@lymi/core";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { Db } from "../db";
import type { AnalyticsEvent } from "./analytics";
import { addCards, showCard, updateCard } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { join } from "./members";
import { archiveDeckTag, listDeckTags, listTags, renameDeckTag, restoreDeckTag } from "./tags";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60_000);

afterAll(async () => {
  await dispose();
});

async function add(ctx: ServiceContext, deckId: string, cards: Partial<CardInput>[]) {
  const outcomes = await addCards(
    ctx,
    cards.map((card) => CardInput.parse({ deckId, ...card })),
  );
  return outcomes.map((outcome) => {
    if (outcome.status !== "added") throw new Error(`${outcome.term} not added`);
    return outcome.card;
  });
}

const tagsOf = async (ctx: ServiceContext, id: string) => (await showCard(ctx, id)).tags;

/** Two of the learner's decks, both with "food", so a deck's change can be seen to stay in it. */
async function twoDecks(slug: string) {
  const ctx = await learner(db, slug, "Kateryna");
  const italian = await createDeck(ctx, { name: "Italian", defaultLanguage: "it" });
  const estonian = await createDeck(ctx, { name: "Estonian", defaultLanguage: "et" });
  const [pane, latte] = await add(ctx, italian.id, [
    { term: "il pane", tags: ["food", "noun"] },
    { term: "il latte", tags: ["noun", "food"] },
  ]);
  const [leib] = await add(ctx, estonian.id, [{ term: "leib", tags: ["food"] }]);
  if (!pane || !latte || !leib) throw new Error("not added");
  return { ctx, italian, estonian, pane, latte, leib };
}

describe("a deck's tags", () => {
  it("lists the deck's tags with their counts, most used first", async () => {
    const { ctx, italian } = await twoDecks("deck-tags-list");
    expect(await listDeckTags(ctx, italian.id)).toEqual({
      tags: [
        { name: "food", cards: 2 },
        { name: "noun", cards: 2 },
      ],
      archived: [],
    });
  });

  it("renames a tag in one deck only, keeping its place on each card", async () => {
    const { ctx, italian, pane, leib } = await twoDecks("deck-tags-rename");
    const after = await renameDeckTag(ctx, italian.id, { from: "FOOD", to: "meals" });

    expect(after.tags.map((t) => t.name).sort()).toEqual(["meals", "noun"]);
    expect(await tagsOf(ctx, pane.id)).toEqual(["meals", "noun"]);
    expect(await tagsOf(ctx, leib.id)).toEqual(["food"]);
    const names = (await listTags(ctx)).map((t) => `${t.name}:${t.cards}`).sort();
    expect(names).toEqual(["food:1", "meals:2", "noun:2"]);
  });

  it("merges onto a name already in use, keeping one copy on a card that had both", async () => {
    const { ctx, italian, pane } = await twoDecks("deck-tags-merge");
    await renameDeckTag(ctx, italian.id, { from: "noun", to: "Food" });

    expect(await tagsOf(ctx, pane.id)).toEqual(["food"]);
    expect(await listDeckTags(ctx, italian.id)).toEqual({
      tags: [{ name: "food", cards: 2 }],
      archived: [],
    });
  });

  it("respells a tag everywhere when only its case changes", async () => {
    const { ctx, italian, pane, leib } = await twoDecks("deck-tags-respell");
    await renameDeckTag(ctx, italian.id, { from: "food", to: "Food" });

    expect(await tagsOf(ctx, pane.id)).toEqual(["Food", "noun"]);
    expect(await tagsOf(ctx, leib.id)).toEqual(["Food"]);
  });

  it("archives a tag from one deck, and restore puts it back in its place", async () => {
    const { ctx, italian, pane, latte, leib } = await twoDecks("deck-tags-archive");
    const archived = await archiveDeckTag(ctx, italian.id, { name: "food" });

    expect(archived).toEqual({
      tags: [{ name: "noun", cards: 2 }],
      archived: [{ name: "food", cards: 2 }],
    });
    expect(await tagsOf(ctx, pane.id)).toEqual(["noun"]);
    expect(await tagsOf(ctx, leib.id)).toEqual(["food"]);
    expect((await listTags(ctx)).find((t) => t.name === "food")?.cards).toBe(1);

    const restored = await restoreDeckTag(ctx, italian.id, { name: "food" });
    expect(restored.archived).toEqual([]);
    expect(await tagsOf(ctx, pane.id)).toEqual(["food", "noun"]);
    expect(await tagsOf(ctx, latte.id)).toEqual(["noun", "food"]);
  });

  it("brings an archived tag back on a card when it is typed on it again", async () => {
    const { ctx, italian, pane } = await twoDecks("deck-tags-retype");
    await archiveDeckTag(ctx, italian.id, { name: "food" });
    await updateCard(ctx, pane.id, { tags: ["noun", "food"] });

    expect(await tagsOf(ctx, pane.id)).toEqual(["noun", "food"]);
    expect((await listDeckTags(ctx, italian.id)).archived).toEqual([{ name: "food", cards: 1 }]);
  });

  it("leaves a card that has filled up since without the restored tag", async () => {
    const { ctx, italian, pane, latte } = await twoDecks("deck-tags-full");
    await archiveDeckTag(ctx, italian.id, { name: "food" });
    const twenty = Array.from({ length: 20 }, (_, i) => `t${i}`);
    await updateCard(ctx, pane.id, { tags: twenty });
    await restoreDeckTag(ctx, italian.id, { name: "food" });

    expect(await tagsOf(ctx, pane.id)).toEqual(twenty);
    expect(await tagsOf(ctx, latte.id)).toEqual(["noun", "food"]);
    expect((await listDeckTags(ctx, italian.id)).archived).toEqual([{ name: "food", cards: 1 }]);
  });

  it("reports each change by kind and band, never the tag", async () => {
    const { ctx, italian } = await twoDecks("deck-tags-events");
    const captured: AnalyticsEvent[] = [];
    const tracked = {
      ...ctx,
      analytics: {
        writeDataPoint: vi.fn(),
        capture: (event: AnalyticsEvent) => captured.push(event),
      },
    };
    await renameDeckTag(tracked, italian.id, { from: "food", to: "meals" });
    await renameDeckTag(tracked, italian.id, { from: "meals", to: "noun" });
    await archiveDeckTag(tracked, italian.id, { name: "noun" });
    await restoreDeckTag(tracked, italian.id, { name: "noun" });

    expect(captured.filter((e) => e.name === "deck_tag_changed")).toEqual([
      { name: "deck_tag_changed", action: "rename", channel: "app", cards: "1-20" },
      { name: "deck_tag_changed", action: "merge", channel: "app", cards: "1-20" },
      { name: "deck_tag_changed", action: "archive", channel: "app", cards: "1-20" },
      { name: "deck_tag_changed", action: "restore", channel: "app", cards: "1-20" },
    ]);
  });

  it("is the owner's: a member is refused and an unknown tag is not found", async () => {
    const { ctx, italian } = await twoDecks("deck-tags-owner");
    const member = await learner(db, "deck-tags-owner-member", "Olena");
    await join(member, italian.id);

    await expect(listDeckTags(member, italian.id)).rejects.toMatchObject({ code: "forbidden" });
    await expect(
      renameDeckTag(member, italian.id, { from: "food", to: "mine" }),
    ).rejects.toMatchObject({ code: "forbidden" });
    await expect(archiveDeckTag(ctx, italian.id, { name: "travel" })).rejects.toMatchObject({
      code: "not_found",
    });
  });
});
