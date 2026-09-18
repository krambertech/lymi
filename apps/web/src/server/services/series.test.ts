import { and, eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { archiveDeck, createDeck, getDeck, listDecks, restoreDeck, updateDeck } from "./decks";
import { join } from "./members";
import { reviewDraw, reviewQueue } from "./review";
import {
  createSeries,
  deleteSeries,
  getSeries,
  listSeries,
  renameSeries,
  reorderSeries,
  setSeriesDecks,
} from "./series";
import { learner, testDb } from "./test-db";

/** Each test uses its own learners, so series order in one never leaks into another. */
let db: Db;
let dispose: () => Promise<void>;
let n = 0;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60_000);

afterAll(async () => {
  await dispose();
});

async function person(name: string) {
  n += 1;
  return learner(db, `${name.toLowerCase()}-${n}`, name);
}

async function deckWith(ctx: ServiceContext, name: string, terms: string[]) {
  const deck = await createDeck(ctx, { name, defaultLanguage: "et" });
  await addCards(
    ctx,
    terms.map((term) => ({ deckId: deck.id, term })),
  );
  return deck;
}

const seriesAudits = (ctx: ServiceContext, seriesId: string) =>
  db
    .select({ action: schema.auditLog.action })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.userId, ctx.userId), eq(schema.auditLog.entityId, seriesId)));

const libraryOrder = async (ctx: ServiceContext) =>
  (await listDecks(ctx)).map((d) => ({ name: d.name, seriesId: d.seriesId }));

describe("decks without a series", () => {
  it("keep their order, and a new deck goes last", async () => {
    const me = await person("Kateryna");
    await createDeck(me, { name: "A" });
    await createDeck(me, { name: "B" });
    await createDeck(me, { name: "C" });

    expect(await libraryOrder(me)).toEqual([
      { name: "A", seriesId: null },
      { name: "B", seriesId: null },
      { name: "C", seriesId: null },
    ]);
    expect(await listSeries(me)).toEqual([]);
  });
});

describe("a series", () => {
  it("holds the owner's decks in order and adds up to them", async () => {
    const me = await person("Kateryna");
    const a1 = await deckWith(me, "A1", ["tere", "aitäh"]);
    const a2 = await deckWith(me, "A2", ["kass"]);
    const other = await deckWith(me, "Other", ["koer"]);

    const estonian = await createSeries(me, { name: "Estonian", deckIds: [a2.id, a1.id] });

    expect(estonian).toMatchObject({ name: "Estonian", deckIds: [a2.id, a1.id], total: 3, due: 3 });
    const decks = await listDecks(me);
    expect(decks.find((d) => d.id === a1.id)?.seriesId).toBe(estonian.id);
    expect(decks.find((d) => d.id === other.id)?.seriesId).toBeNull();
    expect((await getDeck(me, a2.id)).seriesId).toBe(estonian.id);
  });

  it("goes last among series, and a full order puts them back once", async () => {
    const me = await person("Kateryna");
    const first = await createSeries(me, { name: "First" });
    const second = await createSeries(me, { name: "Second" });
    expect((await listSeries(me)).map((s) => s.name)).toEqual(["First", "Second"]);

    await reorderSeries(me, { seriesIds: [second.id, first.id] });
    await reorderSeries(me, { seriesIds: [second.id, first.id] });

    expect((await listSeries(me)).map((s) => s.name)).toEqual(["Second", "First"]);
    expect((await seriesAudits(me, second.id)).filter((a) => a.action === "reorder")).toHaveLength(
      1,
    );
    await expect(reorderSeries(me, { seriesIds: [first.id] })).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("takes a full deck list: moves decks in and out, and a retry changes nothing", async () => {
    const me = await person("Kateryna");
    const a = await createDeck(me, { name: "A" });
    const b = await createDeck(me, { name: "B" });
    const c = await createDeck(me, { name: "C" });
    const left = await createSeries(me, { name: "Left", deckIds: [a.id, b.id] });
    const right = await createSeries(me, { name: "Right", deckIds: [c.id] });

    // B leaves Left for Right, ahead of C; A is left out of Left and returns to Library.
    const updated = await setSeriesDecks(me, right.id, { deckIds: [b.id, c.id] });
    await setSeriesDecks(me, right.id, { deckIds: [b.id, c.id] });
    await setSeriesDecks(me, left.id, { deckIds: [] });

    expect(updated.deckIds).toEqual([b.id, c.id]);
    expect((await getSeries(me, left.id)).deckIds).toEqual([]);
    expect((await getDeck(me, a.id)).seriesId).toBeNull();
    expect((await seriesAudits(me, right.id)).map((x) => x.action).sort()).toEqual([
      "create",
      "update",
    ]);
  });

  it("moves one deck with its own edit: last in a series, back by date in Library", async () => {
    const me = await person("Kateryna");
    const a = await createDeck(me, { name: "A" });
    const b = await createDeck(me, { name: "B" });
    const flat = await createDeck(me, { name: "Flat" });
    const series = await createSeries(me, { name: "S", deckIds: [a.id] });

    await updateDeck(me, b.id, { seriesId: series.id });
    expect((await getSeries(me, series.id)).deckIds).toEqual([a.id, b.id]);

    await updateDeck(me, a.id, { seriesId: null });
    expect((await listDecks(me)).filter((d) => !d.seriesId).map((d) => d.name)).toEqual([
      "A",
      flat.name,
    ]);
    // A deck made after one left a series still goes last.
    const later = await createDeck(me, { name: "Later" });
    expect((await listDecks(me)).filter((d) => !d.seriesId).map((d) => d.id)).toEqual([
      a.id,
      flat.id,
      later.id,
    ]);

    const created = await createDeck(me, { name: "New", seriesId: series.id });
    expect((await getSeries(me, series.id)).deckIds).toEqual([b.id, created.id]);
  });

  it("renames without touching its decks", async () => {
    const me = await person("Kateryna");
    const a = await createDeck(me, { name: "A" });
    const series = await createSeries(me, { name: "Old", deckIds: [a.id] });

    expect(await renameSeries(me, series.id, "New")).toMatchObject({
      name: "New",
      deckIds: [a.id],
    });
  });
});

describe("only the owner has series", () => {
  it("a member sees the shared deck without the owner's series and cannot use it", async () => {
    const owner = await person("Kateryna");
    const member = await person("Anna");
    const shared = await deckWith(owner, "Shared", ["tere"]);
    const series = await createSeries(owner, { name: "Private name", deckIds: [shared.id] });
    await join(member, shared.id);

    expect((await listDecks(member)).find((d) => d.id === shared.id)?.seriesId).toBeNull();
    expect((await getDeck(member, shared.id)).seriesId).toBeNull();
    expect(await listSeries(member)).toEqual([]);
    await expect(getSeries(member, series.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(renameSeries(member, series.id, "Mine")).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(reviewDraw(member, { seriesId: series.id })).rejects.toMatchObject({
      code: "not_found",
    });

    // The member's own series cannot take a deck they only joined.
    const theirs = await createSeries(member, { name: "Theirs" });
    await expect(setSeriesDecks(member, theirs.id, { deckIds: [shared.id] })).rejects.toMatchObject(
      { code: "forbidden" },
    );
    await expect(updateDeck(member, shared.id, { seriesId: theirs.id })).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(createSeries(member, { name: "X", deckIds: [shared.id] })).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("refuses another learner's series and decks without saying they exist", async () => {
    const me = await person("Kateryna");
    const stranger = await person("Marko");
    const mine = await createDeck(me, { name: "Mine" });
    const theirs = await createSeries(stranger, { name: "Theirs" });
    const theirDeck = await createDeck(stranger, { name: "Their deck" });

    await expect(updateDeck(me, mine.id, { seriesId: theirs.id })).rejects.toMatchObject({
      code: "not_found",
    });
    await expect(createSeries(me, { name: "X", deckIds: [theirDeck.id] })).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("leaves a member's order alone when the owner rearranges a shared deck", async () => {
    const owner = await person("Kateryna");
    const member = await person("Anna");
    const shared = await deckWith(owner, "Shared", ["tere"]);
    await join(member, shared.id);
    const own = await createDeck(member, { name: "Own, made later" });
    const before = await libraryOrder(member);

    const other = await createDeck(owner, { name: "Other" });
    const series = await createSeries(owner, { name: "S", deckIds: [other.id, shared.id] });
    await setSeriesDecks(owner, series.id, { deckIds: [shared.id, other.id] });
    await setSeriesDecks(owner, series.id, { deckIds: [other.id] });

    expect(await libraryOrder(member)).toEqual(before);
    expect((await listDecks(member)).map((d) => [d.id, d.position])).toEqual([
      [shared.id, 0],
      [own.id, 0],
    ]);
  });
});

describe("reviewing a series", () => {
  it("draws only its decks and counts what its decks count", async () => {
    const me = await person("Kateryna");
    const a = await deckWith(me, "A", ["üks", "kaks"]);
    const b = await deckWith(me, "B", ["kolm"]);
    await deckWith(me, "Outside", ["neli", "viis"]);
    const series = await createSeries(me, { name: "Numbers", deckIds: [a.id, b.id] });

    const draw = await reviewDraw(me, { seriesId: series.id, zone: "UTC" });
    const queue = await reviewQueue(me, { seriesId: series.id });

    expect(draw.total).toBe(3);
    expect(new Set(draw.cards.map((c) => c.card.deckId))).toEqual(new Set([a.id, b.id]));
    expect(queue.total).toBe(3);
    expect((await getSeries(me, series.id)).due).toBe(3);
  });
});

describe("deleting a series", () => {
  it("can keep its decks in Library, loose and with no way back into it", async () => {
    const me = await person("Kateryna");
    const a = await deckWith(me, "A", ["tere"]);
    const series = await createSeries(me, { name: "S", deckIds: [a.id] });

    const loose = await createDeck(me, { name: "Loose deck" });
    await deleteSeries(me, series.id, { decks: "keep" });

    expect(await listSeries(me)).toEqual([]);
    // A kept deck returns to its place by creation date, and a deck made afterwards goes last.
    const newer = await createDeck(me, { name: "Newer loose deck" });
    expect((await listDecks(me)).map((d) => d.id)).toEqual([a.id, loose.id, newer.id]);
    expect((await listDecks(me)).find((d) => d.id === a.id)).toMatchObject({
      seriesId: null,
      due: 1,
    });
    await expect(getSeries(me, series.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(updateDeck(me, a.id, { seriesId: series.id })).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("can archive its decks, and each comes back on its own, loose", async () => {
    const me = await person("Kateryna");
    const a = await deckWith(me, "A", ["tere"]);
    const b = await deckWith(me, "B", ["kass"]);
    const earlier = await deckWith(me, "Archived before", ["koer"]);
    const series = await createSeries(me, { name: "S", deckIds: [a.id, b.id, earlier.id] });
    await archiveDeck(me, earlier.id);

    await deleteSeries(me, series.id, { decks: "archive" });
    // A second delete is harmless and archives nothing again.
    await deleteSeries(me, series.id, { decks: "keep" });

    const names = (await listDecks(me)).map((d) => d.name);
    expect(names).not.toContain("A");
    expect(names).not.toContain("B");
    expect((await reviewDraw(me, { zone: "UTC" })).total).toBe(0);

    // Both the decks it took and one archived before it lose the pointer to a series that is gone.
    await restoreDeck(me, a.id);
    await restoreDeck(me, earlier.id);
    const back = await listDecks(me);
    expect(back.find((d) => d.id === a.id)).toMatchObject({ seriesId: null });
    expect(back.find((d) => d.id === earlier.id)).toMatchObject({ seriesId: null });
    expect(await listSeries(me)).toEqual([]);

    expect((await seriesAudits(me, series.id)).map((x) => x.action).sort()).toEqual([
      "archive",
      "create",
    ]);
  });
});
