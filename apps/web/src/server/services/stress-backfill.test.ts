import { and, eq, inArray } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { addCards } from "./cards";
import { createDeck } from "./decks";
import { runStressBackfill } from "./stress-backfill";
import { learner, testDb } from "./test-db";

describe("runStressBackfill", () => {
  let db: Db;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ db, dispose } = await testDb());
  }, 60_000);

  afterAll(async () => {
    await dispose();
  });

  /** Russian cards as they were stored before the stress fold: added in a language without it, then moved. */
  async function storedBeforeFold(id: string, cards: { term: string; pronunciation?: string }[]) {
    const ctx = await learner(db, id, "Kateryna");
    const deck = await createDeck(ctx, { name: "Слова", defaultLanguage: "bg" });
    const added = await addCards(
      ctx,
      cards.map((card) => ({ deckId: deck.id, ...card })),
    );
    const ids = added.flatMap((outcome) => (outcome.status === "added" ? [outcome.card.id] : []));
    await db.update(schema.cards).set({ language: "ru" }).where(inArray(schema.cards.id, ids));
    return { ctx, ids };
  }

  const read = (ids: string[]) =>
    db
      .select({
        id: schema.cards.id,
        term: schema.cards.term,
        normalizedTerm: schema.cards.normalizedTerm,
        pronunciation: schema.cards.pronunciation,
        revision: schema.cards.revision,
      })
      .from(schema.cards)
      .where(inArray(schema.cards.id, ids));

  it("counts in a dry run, writes the same, and leaves nothing for a second run", async () => {
    const { ids } = await storedBeforeFold("stress-backfill", [
      { term: "за́мок" },
      { term: "замо́к" },
      { term: "му́ка", pronunciation: "[ˈmukə]" },
      { term: "до́м" },
      { term: "мука" },
      { term: "мука́" },
    ]);
    const before = await read(ids);

    const dry = await runStressBackfill(db, { dryRun: true });
    expect(dry).toEqual({ split: 3, folded: 1, kept: 1, duplicates: 1, written: 0 });
    expect(await read(ids)).toEqual(before);

    const wet = await runStressBackfill(db, { dryRun: false });
    expect(wet).toEqual({ ...dry, written: 4 });
    const after = new Map((await read(ids)).map((row) => [row.id, row]));
    const card = (id: string | undefined) => after.get(id ?? "");
    const [castle, lock, torment, house, flour, flourStressed] = ids;
    expect(card(castle)).toMatchObject({
      term: "замок",
      normalizedTerm: "замок",
      pronunciation: "за́мок",
    });
    expect(card(lock)).toMatchObject({
      term: "замок",
      normalizedTerm: "замок",
      pronunciation: "замо́к",
    });
    // Beside IPA the stressed term keeps its key until the learner edits it.
    expect(card(torment)).toMatchObject({ term: "му́ка", normalizedTerm: "му́ка" });
    expect(card(house)).toMatchObject({ term: "дом", normalizedTerm: "дом", pronunciation: null });
    // мука and мука́ now share a key and nothing tells them apart; both stay.
    expect(card(flour)).toMatchObject({ term: "мука", pronunciation: null });
    expect(card(flourStressed)).toMatchObject({ term: "мука", pronunciation: "мука́" });
    expect(card(castle)?.revision).toBeGreaterThan(
      before.find((row) => row.id === castle)?.revision ?? 0,
    );

    expect(await runStressBackfill(db, { dryRun: false })).toEqual({
      split: 0,
      folded: 0,
      kept: 1,
      duplicates: 0,
      written: 0,
    });
  });

  it("writes as the system, with an audit row for each card", async () => {
    const { ids } = await storedBeforeFold("stress-audit", [{ term: "пла́чу" }]);
    await runStressBackfill(db, { dryRun: false });
    const rows = await db
      .select({ actor: schema.auditLog.actor, action: schema.auditLog.action })
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.entityId, ids[0] ?? ""), eq(schema.auditLog.action, "update")));
    expect(rows).toEqual([{ actor: "system", action: "update" }]);
  });
});
