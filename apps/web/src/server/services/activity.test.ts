import { newId } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { listActivity } from "./activity";
import { audit } from "./audit";
import { addCards, archiveCard, updateCard } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { startExport } from "./exports";
import { turnOffJoinLink, turnOnJoinLink } from "./invitations";
import { join, leave, removeMember } from "./members";
import { setReviewTimezone } from "./review-days";
import { createSection } from "./sections";
import { createSeries } from "./series";
import { learner, testDb } from "./test-db";

/**
 * Activity shows what came in from outside the app and who is in a shared deck. One database
 * for the file; each test writes to its own deck so the order of the tests does not matter.
 */
let db: Db;
let dispose: () => Promise<void>;
let kateryna: ServiceContext;
let maryna: ServiceContext;
/** The same learner, called by a connected app rather than sitting in the app. */
let claude: ServiceContext;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  kateryna = await learner(db, "kateryna", "Kateryna");
  maryna = await learner(db, "maryna", "Maryna");
  await db.insert(schema.oauthClient).values({
    id: newId(),
    clientId: "cl-1",
    name: "Claude",
    redirectUris: "https://claude.ai/api/mcp/auth_callback",
  });
  claude = { ...kateryna, actor: "mcp", client: "cl-1" };
}, 60_000);

afterAll(async () => {
  await dispose();
});

// Every test in this file writes to one database, so a read that stops at the newest page would
// quietly stop covering the tests that ran first.
const entries = async (ctx: ServiceContext = kateryna) =>
  (await listActivity(ctx, { limit: 200 })).entries;
const inDeck = async (deckId: string) =>
  (await entries()).filter((entry) => entry.deck?.id === deckId);

describe("writes from outside", () => {
  it("makes one row of an app's cards and names the app", async () => {
    const deck = await createDeck(kateryna, { name: "Italian", defaultLanguage: "it" });
    await addCards(claude, [
      { deckId: deck.id, term: "sbrigarsi" },
      { deckId: deck.id, term: "affrettarsi" },
    ]);

    const [row, ...rest] = await inDeck(deck.id);
    expect(row).toMatchObject({ kind: "cards_added", actor: "mcp", app: "Claude", count: 2 });
    // Two cards written in one call share a millisecond, so their order inside the row is free.
    expect(new Set(row?.cards.map((card) => card.term))).toEqual(
      new Set(["sbrigarsi", "affrettarsi"]),
    );
    // The deck the app made is the learner's own, so only the cards are a row.
    expect(rest).toHaveLength(0);
  });

  it("leaves the learner's own writes out", async () => {
    const deck = await createDeck(kateryna, { name: "Quiet", defaultLanguage: "it" });
    await addCards(kateryna, [{ deckId: deck.id, term: "silenzio" }]);
    expect(await inDeck(deck.id)).toHaveLength(0);
  });

  it("tells an archive from an add, and says the card is archived", async () => {
    const deck = await createDeck(kateryna, { name: "Portuguese", defaultLanguage: "pt" });
    const [added] = await addCards(claude, [{ deckId: deck.id, term: "saudade" }]);
    if (added?.status !== "added") throw new Error("the card was not added");
    await archiveCard(claude, added.card.id);

    const rows = await inDeck(deck.id);
    expect(rows.map((row) => row.kind)).toEqual(["cards_archived", "cards_added"]);
    expect(rows[0]?.cards[0]).toMatchObject({ term: "saudade", archived: true });
  });

  it("says who made a deck an app created", async () => {
    const deck = await createDeck(claude, { name: "From the news", defaultLanguage: "it" });
    const [row] = await inDeck(deck.id);
    expect(row).toMatchObject({
      kind: "deck_added",
      app: "Claude",
      deck: { name: "From the news" },
    });
  });
});

describe("files the learner moved", () => {
  it("lists an export the learner started, with its file", async () => {
    const started = await startExport(kateryna, { format: "lymi" }, async () => {});
    const [row] = (await entries()).filter((entry) => entry.export?.id === started.id);
    // An export is the learner's own act, so it is listed even though the actor is the learner.
    expect(row).toMatchObject({ kind: "export", actor: "user", count: 1 });
    expect(row?.export?.fileName).toBe(started.fileName);
  });
});

describe("one learner's log is their own", () => {
  it("holds nothing of another learner's, whoever wrote it", async () => {
    const mine = await createDeck(kateryna, { name: "Mine", defaultLanguage: "it" });
    await addCards(claude, [{ deckId: mine.id, term: "il mio" }]);
    const theirs = await createDeck(maryna, { name: "Theirs", defaultLanguage: "it" });
    await addCards({ ...maryna, actor: "mcp", client: "cl-1" }, [
      { deckId: theirs.id, term: "il loro" },
    ]);

    const hers = await entries(maryna);
    expect(hers.every((row) => row.deck?.id !== mine.id)).toBe(true);
    expect(hers.flatMap((row) => row.cards.map((c) => c.term))).not.toContain("il mio");
    const ours = await entries();
    expect(ours.every((row) => row.deck?.id !== theirs.id)).toBe(true);
  });
});

describe("the people of a shared deck", () => {
  it("names who joined, who left and who was removed", async () => {
    const deck = await createDeck(kateryna, { name: "Estonian A2", defaultLanguage: "et" });
    await turnOnJoinLink(kateryna, deck.id);
    await join(maryna, deck.id);
    await leave(maryna, deck.id);
    await join(maryna, deck.id);
    await removeMember(kateryna, deck.id, maryna.userId);
    await turnOffJoinLink(kateryna, deck.id);

    const rows = await inDeck(deck.id);
    // Writes this close together share a millisecond, so the set is the assertion, not the order.
    expect(new Set(rows.map((row) => row.kind))).toEqual(
      new Set(["link_on", "link_off", "member_joined", "member_left", "member_removed"]),
    );
    // The two joins of one day are one row; the member is named on every row about her.
    expect(rows.find((row) => row.kind === "member_joined")?.count).toBe(2);
    for (const kind of ["member_joined", "member_left", "member_removed"]) {
      expect(rows.find((row) => row.kind === kind)?.person).toBe("Maryna");
    }
  });

  it("keeps a deck's people to its owner", async () => {
    const deck = await createDeck(kateryna, { name: "Estonian B1", defaultLanguage: "et" });
    await turnOnJoinLink(kateryna, deck.id);
    await join(maryna, deck.id);
    // The member's own Activity holds nothing about the deck they study.
    expect((await entries(maryna)).filter((row) => row.deck?.id === deck.id)).toHaveLength(0);
  });
});

describe("naming the caller", () => {
  it("keeps an app's name after the connection behind it is gone", async () => {
    const deck = await createDeck(kateryna, { name: "Named", defaultLanguage: "it" });
    const gone = { ...kateryna, actor: "mcp" as const, client: "cl-gone", clientName: "Codex" };
    await addCards(gone, [{ deckId: deck.id, term: "il ricordo" }]);
    // Nothing in oauth_client answers for "cl-gone": the row's own name is all there is.
    const [row] = await inDeck(deck.id);
    expect(row).toMatchObject({ kind: "cards_added", app: "Codex" });
  });

  it("names the app on a section and a series it created", async () => {
    const deck = await createDeck(kateryna, { name: "Lessons", defaultLanguage: "it" });
    await createSection(claude, deck.id, { name: "Lesson 1" });
    const series = await createSeries(claude, { name: "Italian A1" });

    const [section] = await inDeck(deck.id);
    expect(section).toMatchObject({ kind: "section_added", actor: "mcp", app: "Claude" });
    const row = (await entries()).find((entry) => entry.kind === "series_added");
    expect(row).toMatchObject({ app: "Claude", person: series.name });
  });

  it("falls back to the live name for a row written before the name was kept", async () => {
    const deck = await createDeck(kateryna, { name: "Legacy", defaultLanguage: "it" });
    await addCards(claude, [{ deckId: deck.id, term: "il passato" }]);
    // An older row carries the id and no name, as every row did before this column existed.
    await db
      .update(schema.auditLog)
      .set({ actorClientName: null })
      .where(eq(schema.auditLog.entityId, (await inDeck(deck.id))[0]?.cards[0]?.id ?? ""));
    const [row] = await inDeck(deck.id);
    expect(row?.app).toBe("Claude");
  });
});

describe("what the AI filled in", () => {
  it("says a card was enriched, not edited", async () => {
    const deck = await createDeck(kateryna, { name: "Enriched", defaultLanguage: "it" });
    const [added] = await addCards(kateryna, [{ deckId: deck.id, term: "la fattura" }]);
    if (added?.status !== "added") throw new Error("the card was not added");
    // What `enrichment.ts` writes when a run fills empty fields on a card the learner added.
    await audit(
      { ...kateryna, actor: "ai" },
      {
        entity: "card",
        action: "enrich",
        id: added.card.id,
        deckId: deck.id,
        details: { meaning: "the bill" },
      },
    );

    const [row] = await inDeck(deck.id);
    expect(row).toMatchObject({ kind: "cards_enriched", actor: "ai", count: 1 });
    expect(row?.cards[0]?.term).toBe("la fattura");
  });

  it("still reads a run written before enrichment had its own action", async () => {
    const deck = await createDeck(kateryna, { name: "Enriched then", defaultLanguage: "it" });
    const [added] = await addCards(kateryna, [{ deckId: deck.id, term: "lo scontrino" }]);
    if (added?.status !== "added") throw new Error("the card was not added");
    // An older row: the AI's fill-in recorded as an update by the AI.
    await db.insert(schema.auditLog).values({
      id: newId(),
      userId: kateryna.userId,
      actor: "ai",
      action: "update",
      entity: "card",
      entityId: added.card.id,
      payload: { meaning: "the receipt" },
    });

    const [row] = await inDeck(deck.id);
    expect(row).toMatchObject({ kind: "cards_enriched", actor: "ai", count: 1 });
  });
});

describe("what the list refuses to say", () => {
  it("leaves out caching a card's audio rather than calling it an edit", async () => {
    const deck = await createDeck(kateryna, { name: "Audio", defaultLanguage: "it" });
    const [added] = await addCards(kateryna, [{ deckId: deck.id, term: "la voce" }]);
    if (added?.status !== "added") throw new Error("the card was not added");
    // The AI caches the audio; nothing about the card changed, so no row claims it did.
    await audit(
      { ...kateryna, actor: "ai" },
      { entity: "card", action: "generate_audio", id: added.card.id, deckId: deck.id },
    );
    expect(await inDeck(deck.id)).toHaveLength(0);
  });

  it("hands back a page that has rows to show, not one full of writes it cannot say", async () => {
    const deck = await createDeck(kateryna, { name: "Unsaid", defaultLanguage: "it" });
    const [added] = await addCards(claude, [{ deckId: deck.id, term: "il silenzio" }]);
    if (added?.status !== "added") throw new Error("the card was not added");
    // Ten writes with no sentence, newer than the one that has one.
    for (let i = 0; i < 10; i++) {
      await audit(
        { ...kateryna, actor: "ai" },
        { entity: "card", action: "generate_audio", id: added.card.id, deckId: deck.id },
      );
    }
    const read = await listActivity(kateryna, { limit: 5 });
    // A page of only unsaid writes would leave the screen saying nothing has come in.
    expect(read.entries.length).toBeGreaterThan(0);
  });
});

describe("where a write landed", () => {
  it("names the deck the call wrote to, not the one the card was moved to", async () => {
    const from = await createDeck(kateryna, { name: "Moved from", defaultLanguage: "it" });
    const to = await createDeck(kateryna, { name: "Moved to", defaultLanguage: "it" });
    const [added] = await addCards(claude, [{ deckId: from.id, term: "spostata" }]);
    if (added?.status !== "added") throw new Error("the card was not added");
    await updateCard(kateryna, added.card.id, { deckId: to.id });

    const rows = await entries();
    // The write happened in the deck it happened in, whatever the learner did with the card after.
    expect(rows.find((row) => row.deck?.id === to.id)).toBeUndefined();
    const row = rows.find((r) => r.deck?.id === from.id);
    expect(row).toMatchObject({ kind: "cards_added", count: 1 });
    // The card itself opens where it is now.
    expect(row?.cards[0]).toMatchObject({ term: "spostata", deckId: to.id });
  });

  it("makes one row per deck when a call writes to two", async () => {
    const one = await createDeck(kateryna, { name: "Two decks A", defaultLanguage: "it" });
    const two = await createDeck(kateryna, { name: "Two decks B", defaultLanguage: "it" });
    await addCards(claude, [
      { deckId: one.id, term: "la bolletta" },
      { deckId: two.id, term: "il vicolo" },
    ]);

    const rows = await entries();
    const first = rows.find((row) => row.deck?.id === one.id);
    const second = rows.find((row) => row.deck?.id === two.id);
    expect(first?.count).toBe(1);
    expect(second?.count).toBe(1);
    expect(first?.cards.map((card) => card.term)).toEqual(["la bolletta"]);
    expect(second?.cards.map((card) => card.term)).toEqual(["il vicolo"]);
  });
});

describe("the day a write belongs to", () => {
  it("is the learner's own, not UTC's", async () => {
    // Kyiv is ahead of UTC, so 23:00 UTC is already the next morning there.
    const ingrid = await learner(db, "ingrid", "Ingrid");
    const app = { ...ingrid, actor: "mcp" as const, client: "cl-1" };
    await setReviewTimezone(ingrid, { mode: "manual", timezone: "Europe/Kyiv" });
    const deck = await createDeck(ingrid, { name: "Midnight", defaultLanguage: "et" });
    const [added] = await addCards(app, [{ deckId: deck.id, term: "kesköö" }]);
    if (added?.status !== "added") throw new Error("the card was not added");
    const late = new Date("2026-03-01T23:00:00Z");
    await db
      .update(schema.auditLog)
      .set({ createdAt: late })
      .where(eq(schema.auditLog.entityId, added.card.id));

    const [row] = (await listActivity(ingrid)).entries;
    expect(row?.day).toBe("2026-03-02");
  });
});

describe("paging", () => {
  it("reads a page far past D1's bound-parameter ceiling", async () => {
    const deck = await createDeck(kateryna, { name: "Many", defaultLanguage: "it" });
    await addCards(
      claude,
      Array.from({ length: 120 }, (_, i) => ({ deckId: deck.id, term: `parola tanta ${i}` })),
    );
    // 120 card ids in one lookup is more bound parameters than D1 takes in a single query.
    const read = await listActivity(kateryna, { limit: 200 });
    expect(read.entries.find((row) => row.deck?.id === deck.id)?.count).toBe(120);
  });

  it("hands back the rest of the list and never repeats a row", async () => {
    const deck = await createDeck(kateryna, { name: "Long", defaultLanguage: "it" });
    await addCards(
      claude,
      Array.from({ length: 5 }, (_, i) => ({ deckId: deck.id, term: `parola ${i}` })),
    );

    const first = await listActivity(kateryna, { limit: 3 });
    expect(first.nextCursor).toBeTruthy();
    const second = await listActivity(kateryna, { cursor: first.nextCursor ?? undefined });
    const ids = [...first.entries, ...second.entries].map((row) => row.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives the halves of a split group the same group, so the screen can join them", async () => {
    const deck = await createDeck(kateryna, { name: "Split", defaultLanguage: "it" });
    await addCards(
      claude,
      Array.from({ length: 4 }, (_, i) => ({ deckId: deck.id, term: `spezzato ${i}` })),
    );

    // Where the deck's four cards fall among the other tests' writes is free, so walk the pages.
    const halves: string[] = [];
    let cursor: string | undefined;
    for (let page = 0; page < 10; page++) {
      const read = await listActivity(kateryna, { limit: 2, cursor });
      halves.push(
        ...read.entries.filter((row) => row.deck?.id === deck.id).map((row) => row.group),
      );
      cursor = read.nextCursor ?? undefined;
      if (!cursor) break;
    }
    // Four cards cannot fit in a page of two, so the group is split and every half names it.
    expect(halves.length).toBeGreaterThan(1);
    expect(new Set(halves).size).toBe(1);
  });
});
