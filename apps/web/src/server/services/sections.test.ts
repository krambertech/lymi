import { and, eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { addCards, updateCard } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck, listDeckCards, listDecks, updateDeck } from "./decks";
import { drawInputs } from "./draw";
import { join } from "./members";
import { gradeCard, reviewDraw, reviewRounds } from "./review";
import {
  archiveSection,
  createSection,
  listSections,
  renameSection,
  reorderSections,
  restoreSection,
  setCardsSection,
  startSection,
} from "./sections";
import { createSeries } from "./series";
import { learner, testDb } from "./test-db";

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

/** A deck whose sections hold the listed terms, in order, plus any terms left without a section. */
async function sectioned(
  ctx: ServiceContext,
  parts: Record<string, string[]>,
  loose: string[] = [],
  opts: { sectionProgression?: "automatic" | "manual" | "open" } = {},
) {
  const deck = await createDeck(ctx, { name: `Deck ${n}`, defaultLanguage: "et", ...opts });
  const sections: Record<string, string> = {};
  const cards: Record<string, string> = {};
  for (const [name, terms] of Object.entries(parts)) {
    const outcomes = await addCards(
      ctx,
      terms.map((term) => ({ deckId: deck.id, term })),
    );
    const ids = outcomes.flatMap((o) => (o.status === "added" ? [o.card.id] : []));
    outcomes.forEach((o) => {
      if (o.status === "added") cards[o.card.term] = o.card.id;
    });
    sections[name] = (await createSection(ctx, deck.id, { name, cardIds: ids })).id;
  }
  const outcomes = await addCards(
    ctx,
    loose.map((term) => ({ deckId: deck.id, term })),
  );
  outcomes.forEach((o) => {
    if (o.status === "added") cards[o.card.term] = o.card.id;
  });
  return { deck, sections, cards };
}

const inReview = async (ctx: ServiceContext, deckId?: string) => {
  const { cards } = await drawInputs(ctx, { zone: "UTC", deckId });
  const ids = new Set(cards.map((c) => c.cardId));
  const terms = await db
    .select({ id: schema.cards.id, term: schema.cards.term })
    .from(schema.cards);
  return terms
    .filter((t) => ids.has(t.id))
    .map((t) => t.term)
    .sort();
};

/** Grade a card Easy, which takes a new card straight to Known. */
const know = (ctx: ServiceContext, cardId: string) =>
  gradeCard(ctx, { cardId, direction: "recognition", rating: 4, timezone: "UTC" });

/** Grade a card Forgot: started, not Known. */
const forget = (ctx: ServiceContext, cardId: string) =>
  gradeCard(ctx, { cardId, direction: "recognition", rating: 1, timezone: "UTC" });

const statuses = async (ctx: ServiceContext, deckId: string) =>
  (await listSections(ctx, deckId)).sections.map((s) => [s.name, s.status]);

const sectionAudits = (ctx: ServiceContext, entityId: string) =>
  db
    .select({ action: schema.auditLog.action })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.userId, ctx.userId), eq(schema.auditLog.entityId, entityId)));

describe("sections", () => {
  it("hold a deck's cards in order, and cards without one stay valid", async () => {
    const me = await person("Kateryna");
    const { deck, sections, cards } = await sectioned(
      me,
      { "Lesson 1": ["tere", "aitäh"], "Lesson 2": ["kass"] },
      ["koer"],
    );

    const list = await listSections(me, deck.id);
    expect(list.sections.map((s) => [s.name, s.total])).toEqual([
      ["Lesson 1", 2],
      ["Lesson 2", 1],
    ]);
    const rows = await listDeckCards(me, deck.id);
    const sectionOf = (term: string) => rows.find((r) => r.card.term === term)?.card.sectionId;
    expect(sectionOf("tere")).toBe(sections["Lesson 1"]);
    expect(sectionOf("koer")).toBeNull();
    expect(cards.koer).toBeDefined();
  });

  it("rename, and a full order puts them back once; a stale list is 409", async () => {
    const me = await person("Kateryna");
    const { deck, sections } = await sectioned(me, { A: [], B: [], C: [] });
    const a = sections.A as string;
    const b = sections.B as string;
    const c = sections.C as string;

    await renameSection(me, a, "First");
    await reorderSections(me, deck.id, { sectionIds: [c, a, b] });
    await reorderSections(me, deck.id, { sectionIds: [c, a, b] });

    expect((await listSections(me, deck.id)).sections.map((s) => s.name)).toEqual([
      "C",
      "First",
      "B",
    ]);
    expect((await sectionAudits(me, c)).filter((x) => x.action === "reorder")).toHaveLength(1);
    await expect(reorderSections(me, deck.id, { sectionIds: [a, b] })).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("move many cards at once, and moving them again adds nothing to Activity", async () => {
    const me = await person("Kateryna");
    const { deck, sections, cards } = await sectioned(me, { A: ["üks", "kaks"], B: [] }, ["kolm"]);
    const b = sections.B as string;
    const ids = [cards.üks, cards.kolm] as string[];

    await setCardsSection(me, deck.id, { cardIds: ids, sectionId: b });
    await setCardsSection(me, deck.id, { cardIds: ids, sectionId: b });

    const list = await listSections(me, deck.id);
    expect(list.sections.map((s) => [s.name, s.total])).toEqual([
      ["A", 1],
      ["B", 2],
    ]);
    expect((await sectionAudits(me, b)).filter((x) => x.action === "move")).toHaveLength(1);

    await setCardsSection(me, deck.id, { cardIds: [cards.kaks as string], sectionId: null });
    expect((await listSections(me, deck.id)).sections[0]?.total).toBe(0);
  });

  it("refuse a card or section from another deck", async () => {
    const me = await person("Kateryna");
    const one = await sectioned(me, { A: ["üks"] });
    const two = await sectioned(me, { B: ["kaks"] });

    await expect(
      setCardsSection(me, one.deck.id, { cardIds: [two.cards.kaks as string], sectionId: null }),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      setCardsSection(me, one.deck.id, {
        cardIds: [one.cards.üks as string],
        sectionId: two.sections.B as string,
      }),
    ).rejects.toMatchObject({ code: "not_found" });
    await expect(
      addCards(me, [{ deckId: one.deck.id, term: "kolm", sectionId: two.sections.B as string }]),
    ).rejects.toMatchObject({ code: "not_found" });
  });

  it("add a card straight into a section", async () => {
    const me = await person("Kateryna");
    const { deck, sections } = await sectioned(me, { A: [] });
    await addCards(me, [{ deckId: deck.id, term: "neli", sectionId: sections.A as string }]);
    expect((await listSections(me, deck.id)).sections[0]?.total).toBe(1);
  });

  it("a card moved to another deck leaves its section and keeps its schedule", async () => {
    const me = await person("Kateryna");
    const { deck, cards } = await sectioned(me, { A: ["jõgi"] });
    const other = await createDeck(me, { name: "Other" });
    const cardId = cards.jõgi as string;
    await know(me, cardId);

    const moved = await updateCard(me, cardId, { deckId: other.id });

    expect(moved.sectionId).toBeNull();
    expect((await listSections(me, deck.id)).sections[0]?.total).toBe(0);
    const [state] = await db
      .select({ state: schema.cardStates.state })
      .from(schema.cardStates)
      .where(and(eq(schema.cardStates.cardId, cardId), eq(schema.cardStates.userId, me.userId)));
    expect(state?.state).toBe(2);
  });

  it("archive keeping the cards, then restore regroups them", async () => {
    const me = await person("Kateryna");
    const { deck, sections, cards } = await sectioned(me, { A: ["mets", "puu"] });
    const a = sections.A as string;

    await archiveSection(me, a, { cards: "keep" });
    let rows = await listDeckCards(me, deck.id);
    expect(rows.map((r) => r.card.sectionId)).toEqual([null, null]);
    expect((await listSections(me, deck.id)).sections).toEqual([]);

    await restoreSection(me, a);
    rows = await listDeckCards(me, deck.id);
    expect(rows.every((r) => r.card.sectionId === a)).toBe(true);
    expect(cards.mets).toBeDefined();
  });

  it("archive with the cards, then restore brings exactly them back", async () => {
    const me = await person("Kateryna");
    const { deck, sections } = await sectioned(me, { A: ["meri", "laev"], B: ["saar"] });
    const a = sections.A as string;
    // A card archived on its own earlier stays archived after Restore.
    const [lonely] = await addCards(me, [{ deckId: deck.id, term: "sadam", sectionId: a }]);
    if (lonely?.status !== "added") throw new Error("not added");
    await db
      .update(schema.cards)
      .set({ archivedAt: new Date(1) })
      .where(eq(schema.cards.id, lonely.card.id));

    await archiveSection(me, a, { cards: "archive" });
    await archiveSection(me, a, { cards: "archive" });
    expect((await listDeckCards(me, deck.id)).map((r) => r.card.term)).toEqual(["saar"]);
    const archived = await listSections(me, deck.id, { archived: true });
    expect(archived.sections.map((s) => [s.name, s.archivedCards])).toEqual([["A", 2]]);

    await restoreSection(me, a);
    expect((await listDeckCards(me, deck.id)).map((r) => r.card.term).sort()).toEqual([
      "laev",
      "meri",
      "saar",
    ]);
    expect((await sectionAudits(me, a)).map((x) => x.action).sort()).toEqual([
      "archive",
      "create",
      "restore",
    ]);
  });

  it("are the owner's to change and a member's to read", async () => {
    const me = await person("Kateryna");
    const member = await person("Mari");
    const stranger = await person("Juhan");
    const { deck, sections } = await sectioned(me, { A: ["tuul"] });
    await join(member, deck.id);

    expect((await listSections(member, deck.id)).sections.map((s) => s.name)).toEqual(["A"]);
    await expect(createSection(member, deck.id, { name: "B" })).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(renameSection(member, sections.A as string, "X")).rejects.toMatchObject({
      code: "forbidden",
    });
    await expect(listSections(stranger, deck.id)).rejects.toMatchObject({ code: "not_found" });
    await expect(renameSection(stranger, sections.A as string, "X")).rejects.toMatchObject({
      code: "not_found",
    });
  });
});

describe("opening sections in order", () => {
  it("reviews only the first section and cards without one", async () => {
    const me = await person("Kateryna");
    const { deck } = await sectioned(me, { A: ["a1", "a2"], B: ["b1"], C: ["c1"] }, ["loose"]);

    expect(await inReview(me, deck.id)).toEqual(["a1", "a2", "loose"]);
    expect(await statuses(me, deck.id)).toEqual([
      ["A", "open"],
      ["B", "locked"],
      ["C", "locked"],
    ]);
    expect((await reviewDraw(me, { deckId: deck.id, zone: "UTC" })).total).toBe(3);
    const decks = await listDecks(me);
    expect(decks.find((d) => d.id === deck.id)?.due).toBe(3);
  });

  it("is ready once every card is started and 80% are Known, and Start opens it when manual", async () => {
    const me = await person("Kateryna");
    const terms = ["a1", "a2", "a3", "a4", "a5"];
    const { deck, sections, cards } = await sectioned(me, { A: terms, B: ["b1"] }, [], {
      sectionProgression: "manual",
    });

    for (const term of ["a1", "a2", "a3"]) await know(me, cards[term] as string);
    await forget(me, cards.a4 as string);
    let list = await listSections(me, deck.id);
    expect(list.progress).toEqual({ currentId: sections.A, nextId: sections.B, ready: false });
    expect(list.sections[0]).toMatchObject({ known: 3, notStarted: 1, knownNeeded: 4 });

    // Four Known, but a5 has never come up.
    await know(me, cards.a4 as string);
    expect((await listSections(me, deck.id)).progress?.ready).toBe(false);

    await forget(me, cards.a5 as string);
    list = await listSections(me, deck.id);
    expect(list.progress?.ready).toBe(true);
    expect(list.sections[1]?.status).toBe("ready");
    // Ready is not open: B waits for Start.
    expect(await inReview(me, deck.id)).not.toContain("b1");

    await startSection(me, sections.B as string);
    expect(await inReview(me, deck.id)).toContain("b1");
    const [start] = await db
      .select({ how: schema.sectionStarts.how })
      .from(schema.sectionStarts)
      .where(eq(schema.sectionStarts.sectionId, sections.B as string));
    expect(start?.how).toBe("ready");
  });

  it("Start anyway opens every section before it, once, and nothing locks again", async () => {
    const me = await person("Kateryna");
    const { deck, sections } = await sectioned(me, {
      A: ["a1"],
      B: ["b1"],
      C: ["c1"],
      D: ["d1"],
    });
    const c = sections.C as string;

    await Promise.all([startSection(me, c), startSection(me, c)]);
    await startSection(me, c);

    expect(await statuses(me, deck.id)).toEqual([
      ["A", "open"],
      ["B", "open"],
      ["C", "open"],
      ["D", "locked"],
    ]);
    const starts = await db
      .select({ sectionId: schema.sectionStarts.sectionId, how: schema.sectionStarts.how })
      .from(schema.sectionStarts)
      .where(eq(schema.sectionStarts.userId, me.userId));
    expect(starts.map((s) => s.sectionId).sort()).toEqual([sections.B, c].sort());
    expect(starts.every((s) => s.how === "early")).toBe(true);

    // The owner moves C to the front: B and C stay open, and so does A before them.
    await reorderSections(me, deck.id, {
      sectionIds: [c, sections.A, sections.B, sections.D] as string[],
    });
    expect(await statuses(me, deck.id)).toEqual([
      ["C", "open"],
      ["A", "open"],
      ["B", "open"],
      ["D", "locked"],
    ]);
    expect((await listSections(me, deck.id)).progress?.currentId).toBe(sections.B);
  });

  it("keeps a started card in review when it moves into a locked section", async () => {
    const me = await person("Kateryna");
    const { deck, sections, cards } = await sectioned(me, { A: ["a1", "a2"], B: ["b1"] });
    await forget(me, cards.a1 as string);

    await setCardsSection(me, deck.id, {
      cardIds: [cards.a1 as string, cards.a2 as string],
      sectionId: sections.B as string,
    });

    // B now holds a started card, so it is open, and a2 with it.
    expect(await inReview(me, deck.id)).toEqual(["a1", "a2", "b1"]);
  });

  it("keeps each learner's place in a shared deck", async () => {
    const me = await person("Kateryna");
    const member = await person("Mari");
    const { deck, sections } = await sectioned(me, { A: ["a1"], B: ["b1"], C: ["c1"] });
    await join(member, deck.id);

    await startSection(member, sections.C as string);

    expect(await inReview(me, deck.id)).toEqual(["a1"]);
    expect(await inReview(member, deck.id)).toEqual(["a1", "b1", "c1"]);
    expect((await listSections(me, deck.id)).progress?.currentId).toBe(sections.A);
    expect((await listSections(member, deck.id)).progress).toMatchObject({
      currentId: sections.C,
      nextId: null,
    });
  });

  it("opens the next section on the grade that makes it ready, once, by default", async () => {
    const me = await person("Kateryna");
    const { deck, sections, cards } = await sectioned(me, {
      A: ["a1", "a2"],
      B: ["b1", "b2"],
      C: ["c1"],
    });

    await know(me, cards.a1 as string);
    expect(await inReview(me, deck.id)).toEqual(["a1", "a2"]);

    // The second Known card makes A ready, and the same grade opens B.
    await know(me, cards.a2 as string);
    const list = await listSections(me, deck.id);
    expect(list.sections.map((s) => s.status)).toEqual(["open", "open", "locked"]);
    expect(list.progress).toMatchObject({
      currentId: sections.B,
      nextId: sections.C,
      ready: false,
    });
    expect(await inReview(me, deck.id)).toEqual(["a1", "a2", "b1", "b2"]);
    const starts = await db
      .select({ sectionId: schema.sectionStarts.sectionId, how: schema.sectionStarts.how })
      .from(schema.sectionStarts)
      .where(eq(schema.sectionStarts.userId, me.userId));
    expect(starts).toEqual([{ sectionId: sections.B, how: "auto" }]);

    // Forgetting A's cards afterwards never locks B again.
    await gradeCard(me, {
      cardId: cards.a2 as string,
      direction: "recognition",
      rating: 1,
      timezone: "UTC",
      reviewedAt: new Date(Date.now() + 60_000),
    });
    expect(await statuses(me, deck.id)).toEqual([
      ["A", "open"],
      ["B", "open"],
      ["C", "locked"],
    ]);
  });

  it("opens the next section when the current one was already known before its last card came up", async () => {
    const me = await person("Kateryna");
    const { deck, cards, sections } = await sectioned(me, { A: ["a1"], B: ["b1"], C: ["c1"] });
    // b1 was studied, then moved into A while B was locked; now A holds both and B takes it back.
    await setCardsSection(me, deck.id, {
      cardIds: [cards.b1 as string],
      sectionId: sections.A as string,
    });
    await know(me, cards.b1 as string);
    await setCardsSection(me, deck.id, {
      cardIds: [cards.b1 as string],
      sectionId: sections.B as string,
    });

    await know(me, cards.a1 as string);
    expect(await statuses(me, deck.id)).toEqual([
      ["A", "open"],
      ["B", "open"],
      ["C", "open"],
    ]);
  });

  it("opens everything when the owner chooses all at once, and going back keeps what was started", async () => {
    const me = await person("Kateryna");
    const { deck, sections, cards } = await sectioned(me, { A: ["a1"], B: ["b1"], C: ["c1"] }, [], {
      sectionProgression: "manual",
    });

    await updateDeck(me, deck.id, { sectionProgression: "open" });
    expect(await inReview(me, deck.id)).toEqual(["a1", "b1", "c1"]);
    expect((await listSections(me, deck.id)).progress).toBeNull();

    await forget(me, cards.b1 as string);
    await updateDeck(me, deck.id, { sectionProgression: "manual" });
    expect(await statuses(me, deck.id)).toEqual([
      ["A", "open"],
      ["B", "open"],
      ["C", "locked"],
    ]);
    expect(sections.C).toBeDefined();
  });

  it("an archived section's cards follow the deck again", async () => {
    const me = await person("Kateryna");
    const { deck, sections } = await sectioned(me, { A: ["a1"], B: ["b1"] });
    await archiveSection(me, sections.B as string, { cards: "keep" });
    expect(await inReview(me, deck.id)).toEqual(["a1", "b1"]);
  });

  it("applies to Today, series review and the new cards round", async () => {
    const me = await person("Kateryna");
    const flat = await createDeck(me, { name: "Flat" });
    await addCards(me, [{ deckId: flat.id, term: "flat1" }]);
    const { deck } = await sectioned(me, { A: ["a1"], B: ["b1", "b2"] });
    const series = await createSeries(me, { name: "Estonian", deckIds: [deck.id, flat.id] });

    expect(await inReview(me)).toEqual(["a1", "flat1"]);
    expect((await reviewDraw(me, { zone: "UTC" })).total).toBe(2);
    expect((await reviewDraw(me, { seriesId: series.id, zone: "UTC" })).total).toBe(2);
    expect((await reviewRounds(me, { zone: "UTC" })).new).toBe(2);
    expect(series.total).toBe(4);
  });

  it("leaves a deck without sections exactly as it was", async () => {
    const me = await person("Kateryna");
    const flat = await createDeck(me, { name: "Flat" });
    await addCards(
      me,
      ["x", "y", "z"].map((term) => ({ deckId: flat.id, term })),
    );
    expect(await inReview(me, flat.id)).toEqual(["x", "y", "z"]);
    expect((await listSections(me, flat.id)).progress).toBeNull();
    await startSection(me, "missing").catch((error) => expect(error.code).toBe("not_found"));
  });
});
