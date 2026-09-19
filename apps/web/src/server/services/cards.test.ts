import { CardInput, CardPatch } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { addCards, foldForSearch, matchesSearch, searchCards, showCard, updateCard } from "./cards";
import { createDeck } from "./decks";
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
