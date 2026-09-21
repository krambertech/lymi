import { CardInput, CardPatch } from "@lymi/core";
import { and, eq, inArray } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type Db, schema } from "../db";
import {
  addCards,
  archiveCard,
  archiveCards,
  CARDS_PER_BATCH,
  foldForSearch,
  matchesSearch,
  restoreCard,
  restoreCards,
  searchCards,
  showCard,
  terseOutcome,
  updateCard,
  updateCards,
} from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { createSection } from "./sections";
import { learner, testDb } from "./test-db";

const card = (fields: Partial<Parameters<typeof matchesSearch>[0]>) => ({
  normalizedTerm: "",
  meaning: null,
  example: null,
  notes: null,
  ...fields,
});

describe("matchesSearch", () => {
  it("folds case beyond ASCII, so Cyrillic and accented text match; ß is not expanded", () => {
    expect(matchesSearch(card({ meaning: "Привіт, світе" }), foldForSearch("привіт"))).toBe(true);
    expect(matchesSearch(card({ example: "À l'École" }), foldForSearch("école"))).toBe(true);
    expect(matchesSearch(card({ notes: "straße" }), foldForSearch("STRASSE"))).toBe(false);
  });

  it("treats LIKE wildcards as plain characters", () => {
    expect(matchesSearch(card({ meaning: "100% sure" }), foldForSearch("100%"))).toBe(true);
    expect(matchesSearch(card({ meaning: "100 sure" }), foldForSearch("100%"))).toBe(false);
    expect(matchesSearch(card({ meaning: "a_b" }), foldForSearch("a_b"))).toBe(true);
    expect(matchesSearch(card({ meaning: "axb" }), foldForSearch("a_b"))).toBe(false);
  });

  it("matches the term through its duplicate key", () => {
    expect(matchesSearch(card({ normalizedTerm: "sbrigarsi" }), foldForSearch("Sbrig"))).toBe(true);
    expect(matchesSearch(card({ normalizedTerm: "sbrigarsi" }), foldForSearch("magari"))).toBe(
      false,
    );
  });

  it("matches a note's words across its Markdown, never its syntax", () => {
    const formatted = card({ notes: "**hea** aeg → *head aega*\n\n- one\n- two" });
    expect(matchesSearch(formatted, foldForSearch("hea aeg"))).toBe(true);
    expect(matchesSearch(formatted, foldForSearch("head aega"))).toBe(true);
    expect(matchesSearch(formatted, foldForSearch("**"))).toBe(false);
    expect(matchesSearch(formatted, foldForSearch("- one"))).toBe(false);
  });
});

describe("Markdown notes", () => {
  let db: Db;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ db, dispose } = await testDb());
  }, 60_000);

  afterAll(async () => {
    await dispose();
  });

  it("stores and returns the source exactly as the API and MCP send it", async () => {
    const ctx = await learner(db, "notes-1", "Kateryna");
    const deck = await createDeck(ctx, { name: "Everyday Estonian", defaultLanguage: "et" });
    const notes =
      "**hea aeg** → *head aega*\nPartitive after *soovin*.\n\n- hea → head\n- aeg → aega";
    const [added] = await addCards(ctx, [
      CardInput.parse({ deckId: deck.id, term: "Head aega!", notes }),
    ]);
    if (added?.status !== "added") throw new Error("not added");
    expect((await showCard(ctx, added.card.id)).notes).toBe(notes);

    const html = '<script>alert(1)</script>\n<img src=x onerror="alert(1)">';
    await updateCard(ctx, added.card.id, CardPatch.parse({ notes: html }));
    expect((await showCard(ctx, added.card.id)).notes).toBe(html);

    await updateCard(ctx, added.card.id, CardPatch.parse({ notes }));
    const found = await searchCards(ctx, { query: "hea aeg → head aega" });
    expect(found.map((row) => row.card.id)).toEqual([added.card.id]);
  });
});

describe("field sources", () => {
  let db: Db;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ db, dispose } = await testDb());
  }, 60_000);

  afterAll(async () => {
    await dispose();
  });

  it("makes an edited text the learner's unless the caller says it is the lesson's", async () => {
    const ctx = await learner(db, "sources-1", "Kateryna");
    const deck = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const [added] = await addCards(ctx, [
      CardInput.parse({
        deckId: deck.id,
        term: "sbrigarsi",
        meaning: "hurry",
        meaningSource: "lesson",
      }),
    ]);
    if (added?.status !== "added") throw new Error("expected an added card");
    // Only the app's own enrichment writes "ai"; stand in for it here.
    await db
      .update(schema.cards)
      .set({
        example: "Sbrigati!",
        exampleSource: "ai",
        pronunciation: "zbriˈɡarsi",
        pronunciationSource: "ai",
      })
      .where(eq(schema.cards.id, added.card.id));

    const edited = await updateCard(
      { ...ctx, actor: "mcp" },
      added.card.id,
      CardPatch.parse({ meaning: "to hurry up", example: "Devo sbrigarmi.", pronunciation: "" }),
    );
    expect(edited.meaningSource).toBe("manual");
    expect(edited.exampleSource).toBe("manual");
    expect(edited.pronunciationSource).toBeNull();

    const stated = await updateCard(
      ctx,
      added.card.id,
      CardPatch.parse({ meaning: "hurry", meaningSource: "lesson", notes: "reflexive" }),
    );
    expect(stated.meaningSource).toBe("lesson");
    expect(stated.exampleSource).toBe("manual");
  });

  it("refuses ai from a caller", () => {
    expect(
      CardInput.safeParse({ deckId: "d", term: "t", meaning: "m", meaningSource: "ai" }).success,
    ).toBe(false);
    expect(CardPatch.safeParse({ example: "e", exampleSource: "ai" }).success).toBe(false);
  });
});

describe("bulk edits and archives", () => {
  let db: Db;
  let dispose: () => Promise<void>;

  beforeAll(async () => {
    ({ db, dispose } = await testDb());
  }, 60_000);

  afterAll(async () => {
    await dispose();
  });

  async function addTerms(ctx: ServiceContext, deckId: string, terms: string[]) {
    const outcomes = await addCards(
      ctx,
      terms.map((term) => CardInput.parse({ deckId, term, source: "Lezione 3" })),
    );
    return outcomes.map((outcome) => {
      if (outcome.status !== "added") throw new Error("expected an added card");
      return outcome.card.id;
    });
  }

  function auditRows(ctx: ServiceContext, action: string) {
    return db
      .select({ entityId: schema.auditLog.entityId, actor: schema.auditLog.actor })
      .from(schema.auditLog)
      .where(
        and(
          eq(schema.auditLog.userId, ctx.userId),
          eq(schema.auditLog.entity, "card"),
          eq(schema.auditLog.action, action),
        ),
      );
  }

  it("edits every card it can, reports the rest, and audits each edit on its own", async () => {
    const ctx = { ...(await learner(db, "bulk-edit-1", "Kateryna")), actor: "mcp" as const };
    const stranger = await learner(db, "bulk-edit-2", "Someone");
    const deck = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const other = await createDeck(ctx, { name: "Español", defaultLanguage: "es" });
    const elsewhere = await createSection(ctx, other.id, { name: "Lección 1" });
    const [first, second, third] = await addTerms(ctx, deck.id, ["ormai", "magari", "allora"]);
    const [theirs] = await addTerms(stranger, (await createDeck(stranger, { name: "Mine" })).id, [
      "ciao",
    ]);

    const outcomes = await updateCards(ctx, [
      { cardId: first as string, source: "" },
      { cardId: "no-such-card", source: "" },
      { cardId: theirs as string, source: "" },
      { cardId: second as string, sectionId: elsewhere.id },
      { cardId: third as string, source: "", meaning: "then" },
    ]);

    expect(outcomes[0]).toMatchObject({ id: first, status: "updated", card: { id: first } });
    expect(outcomes[1]).toEqual({
      id: "no-such-card",
      status: "error",
      code: "not_found",
      error: "Card not found",
    });
    expect(outcomes[2]).toMatchObject({ id: theirs, status: "error", code: "not_found" });
    expect(outcomes[3]).toMatchObject({
      id: second,
      code: "not_found",
      error: "Section not found",
    });
    expect(outcomes[4]).toMatchObject({
      id: third,
      card: { id: third, source: "", meaning: "then", meaningSource: "manual" },
    });
    expect((await showCard(ctx, second as string)).source).toBe("Lezione 3");
    expect((await showCard(stranger, theirs as string)).source).toBe("Lezione 3");

    const rows = await auditRows(ctx, "update");
    expect(rows.map((row) => row.entityId).sort()).toEqual([first, third].sort());
    expect(rows.every((row) => row.actor === "mcp")).toBe(true);

    expect(outcomes.map(terseOutcome)).toEqual([
      { id: first, status: "updated" },
      { id: "no-such-card", status: "error", code: "not_found", error: "Card not found" },
      { id: theirs, status: "error", code: "not_found", error: "Card not found" },
      { id: second, status: "error", code: "not_found", error: "Section not found" },
      { id: third, status: "updated" },
    ]);
  });

  it("keeps a single edit's refusal as the error it throws", async () => {
    const ctx = await learner(db, "bulk-edit-3", "Kateryna");
    await expect(updateCard(ctx, "no-such-card", { source: "" })).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("reports the cards of a batch that failed to save and still writes the later batches", async () => {
    const ctx = await learner(db, "bulk-fail-1", "Kateryna");
    const deck = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const terms = Array.from({ length: CARDS_PER_BATCH + 5 }, (_, i) => `parola ${i}`);
    const ids = (await addTerms(ctx, deck.id, terms)) as string[];
    const batch = vi
      .spyOn(db, "batch")
      .mockImplementationOnce(() => Promise.reject(new Error("D1 is unavailable")));

    const outcomes = await updateCards(
      ctx,
      ids.map((cardId) => ({ cardId, source: "" })),
    );
    batch.mockRestore();

    const lost = ids.slice(0, CARDS_PER_BATCH);
    const saved = ids.slice(CARDS_PER_BATCH);
    expect(outcomes.slice(0, CARDS_PER_BATCH)).toEqual(
      lost.map((id) => ({
        id,
        status: "error",
        code: "unavailable",
        error: expect.stringContaining("try it again"),
      })),
    );
    expect(outcomes.slice(CARDS_PER_BATCH).map((o) => [o.id, o.status])).toEqual(
      saved.map((id) => [id, "updated"]),
    );
    expect((await showCard(ctx, lost[0] as string)).source).toBe("Lezione 3");
    expect((await showCard(ctx, saved[0] as string)).source).toBe("");
    const rows = await auditRows(ctx, "update");
    expect(rows.map((row) => row.entityId).sort()).toEqual([...saved].sort());
  });

  it("moves many cards to another deck with review states set per batch, not per card", async () => {
    const ctx = await learner(db, "bulk-move-1", "Kateryna");
    const from = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const to = await createDeck(ctx, { name: "Lezione 4", defaultLanguage: "it" });
    const terms = Array.from({ length: CARDS_PER_BATCH + 5 }, (_, i) => `frase ${i}`);
    const ids = (await addTerms(ctx, from.id, terms)) as string[];
    const version = async () =>
      (
        await db
          .select({ v: schema.decks.statesVersion })
          .from(schema.decks)
          .where(eq(schema.decks.id, to.id))
      )[0]?.v ?? 0;
    const before = await version();
    const batch = vi.spyOn(db, "batch");

    const outcomes = await updateCards(
      ctx,
      ids.map((cardId) => ({
        cardId,
        deckId: to.id,
        reviewModes: [{ cue: "meaning" as const, target: "term" as const }],
      })),
    );

    const sizes = batch.mock.calls.map(([statements]) => statements.length);
    batch.mockRestore();
    expect(outcomes.every((o) => o.status === "updated")).toBe(true);
    expect(sizes).toHaveLength(2);
    expect(Math.max(...sizes)).toBeLessThanOrEqual(50);
    // One version bump per batch that touched the deck, not one per card.
    expect((await version()) - before).toBe(2);
    const states = await db
      .select({ cardId: schema.cardStates.cardId, mode: schema.cardStates.mode })
      .from(schema.cardStates)
      .where(and(eq(schema.cardStates.userId, ctx.userId), inArray(schema.cardStates.cardId, ids)));
    const produced = new Set(
      states.filter((s) => s.mode === "meaning_to_term").map((s) => s.cardId),
    );
    expect(produced.size).toBe(ids.length);
  });

  it("archives every card it can, reports the rest, and audits each archive once", async () => {
    const ctx = await learner(db, "bulk-archive-1", "Kateryna");
    const deck = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const [first, second] = (await addTerms(ctx, deck.id, ["ormai", "magari"])) as string[];

    const outcomes = await archiveCards(ctx, [first as string, "no-such-card", second as string]);

    expect(outcomes).toEqual([
      { id: first, status: "archived" },
      { id: "no-such-card", status: "error", code: "not_found", error: "Card not found" },
      { id: second, status: "archived" },
    ]);
    const archivedAt = (await showCard(ctx, first as string)).archivedAt;
    expect(archivedAt).not.toBeNull();

    // Archiving again reports the same and changes nothing: no new date, no new Activity row.
    expect(await archiveCards(ctx, [first as string])).toEqual([{ id: first, status: "archived" }]);
    await archiveCard(ctx, first as string);
    expect((await showCard(ctx, first as string)).archivedAt).toEqual(archivedAt);
    const rows = await auditRows(ctx, "archive");
    expect(rows.map((row) => row.entityId).sort()).toEqual([first, second].sort());
  });

  it("restores many cards with their schedules, and leaves an active card alone", async () => {
    const ctx = await learner(db, "bulk-restore-1", "Kateryna");
    const deck = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const [archived, active] = (await addTerms(ctx, deck.id, ["ormai", "magari"])) as string[];
    await archiveCards(ctx, [archived as string]);
    const activeUpdatedAt = (await showCard(ctx, active as string)).updatedAt;

    const outcomes = await restoreCards(ctx, [archived as string, active as string, "nope"]);

    expect(outcomes).toEqual([
      { id: archived, status: "restored" },
      { id: active, status: "restored" },
      { id: "nope", status: "error", code: "not_found", error: "Card not found" },
    ]);
    expect((await showCard(ctx, archived as string)).archivedAt).toBeNull();
    expect((await showCard(ctx, active as string)).updatedAt).toEqual(activeUpdatedAt);
    await restoreCard(ctx, active as string);
    const rows = await auditRows(ctx, "restore");
    expect(rows.map((row) => row.entityId)).toEqual([archived]);
    const states = await db
      .select({ cardId: schema.cardStates.cardId })
      .from(schema.cardStates)
      .where(eq(schema.cardStates.cardId, archived as string));
    expect(states.length).toBeGreaterThan(0);
  });

  it("reduces an add to the card's id and enrichment, the existing card's when skipped", async () => {
    const ctx = await learner(db, "bulk-terse-1", "Kateryna");
    const deck = await createDeck(ctx, { name: "Italiano", defaultLanguage: "it" });
    const [existing] = await addTerms(ctx, deck.id, ["ormai"]);

    const outcomes = await addCards(ctx, [
      CardInput.parse({ deckId: deck.id, term: "Ormai" }),
      CardInput.parse({ deckId: deck.id, term: "magari" }),
    ]);

    expect(outcomes[0]).toMatchObject({ id: existing, status: "skipped" });
    const [skipped, added] = outcomes.map(terseOutcome);
    expect(skipped).toEqual({ id: existing, status: "skipped", enrichmentStatus: null });
    expect(added).toMatchObject({ status: "added", enrichmentStatus: null });
    expect(added?.id).not.toBe(existing);
    expect(added?.id).toBe(outcomes[1]?.id);
  });
});
