import { and, eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { addCards, archiveCard } from "./cards";
import type { ServiceContext } from "./context";
import { archiveDeck, createDeck, listDecks, restoreDeck } from "./decks";
import {
  getJoinLink,
  isJoinToken,
  joinLinkAdmits,
  joinThroughLink,
  previewJoin,
  turnOffJoinLink,
  turnOnJoinLink,
} from "./invitations";
import { join, leave, listMembers, removeMember } from "./members";
import { learner, testDb } from "./test-db";

/** The join link is the front door of a shared deck. ADR 0011. */
let db: Db;
let dispose: () => Promise<void>;
let kateryna: ServiceContext;
let anna: ServiceContext;
let marko: ServiceContext;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  kateryna = await learner(db, "kateryna", "Kateryna");
  anna = await learner(db, "anna", "Anna");
  marko = await learner(db, "marko", "Marko");
}, 60_000);

afterAll(async () => {
  await dispose();
});

async function sharedDeck(name: string, terms: string[] = ["tere", "aitäh"]) {
  const deck = await createDeck(kateryna, { name, defaultLanguage: "et" });
  await addCards(
    kateryna,
    terms.map((term) => ({ deckId: deck.id, term, meaning: `${term} meaning` })),
  );
  const link = await turnOnJoinLink(kateryna, deck.id);
  return { deck, token: link.token };
}

const auditRows = (deckId: string, action: string) =>
  db
    .select({ id: schema.auditLog.id, payload: schema.auditLog.payload })
    .from(schema.auditLog)
    .where(and(eq(schema.auditLog.entityId, deckId), eq(schema.auditLog.action, action)));

const forbidden = expect.objectContaining({ code: "forbidden" });
const notFound = expect.objectContaining({ code: "not_found" });

describe("the owner controls one join link", () => {
  it("turning it on twice gives one unguessable link and one audit row without the token", async () => {
    const deck = await createDeck(kateryna, { name: "Numbrid" });
    expect((await getJoinLink(kateryna, deck.id)).link).toBeNull();

    const [first, second] = await Promise.all([
      turnOnJoinLink(kateryna, deck.id),
      turnOnJoinLink(kateryna, deck.id),
    ]);
    expect(first.token).toBe(second.token);
    expect(isJoinToken(first.token)).toBe(true);
    expect((await getJoinLink(kateryna, deck.id)).link?.token).toBe(first.token);

    const audits = await auditRows(deck.id, "turn_on_join_link");
    expect(audits).toHaveLength(1);
    expect(JSON.stringify(audits)).not.toContain(first.token);
  });

  it("turning it off keeps members and makes the next link a different URL", async () => {
    const { deck, token } = await sharedDeck("Värvid");
    await joinThroughLink(anna, token);

    await turnOffJoinLink(kateryna, deck.id);
    await turnOffJoinLink(kateryna, deck.id);

    expect(await getJoinLink(kateryna, deck.id)).toEqual({ link: null, members: 1 });
    expect((await listMembers(kateryna, deck.id)).map((m) => m.userId)).toEqual(["anna"]);
    expect(await joinLinkAdmits(db, token)).toBe(false);
    await expect(joinThroughLink(marko, token)).rejects.toThrow(notFound);

    const next = await turnOnJoinLink(kateryna, deck.id);
    expect(next.token).not.toBe(token);
    expect(await joinLinkAdmits(db, token)).toBe(false);
    expect(await joinLinkAdmits(db, next.token)).toBe(true);
    expect(await auditRows(deck.id, "turn_off_join_link")).toHaveLength(1);
  });

  it("only the owner can read, turn on or turn off the link", async () => {
    const { deck, token } = await sharedDeck("Toit");
    await joinThroughLink(anna, token);

    await expect(getJoinLink(anna, deck.id)).rejects.toThrow(forbidden);
    await expect(turnOnJoinLink(anna, deck.id)).rejects.toThrow(forbidden);
    await expect(turnOffJoinLink(anna, deck.id)).rejects.toThrow(forbidden);
    await expect(getJoinLink(marko, deck.id)).rejects.toThrow(notFound);
    expect(await joinLinkAdmits(db, token)).toBe(true);
  });

  it("an archived deck cannot be shared", async () => {
    const deck = await createDeck(kateryna, { name: "Vana" });
    await archiveDeck(kateryna, deck.id);
    await expect(turnOnJoinLink(kateryna, deck.id)).rejects.toThrow(
      expect.objectContaining({ code: "invalid" }),
    );
  });
});

describe("the join page shows what the link opens", () => {
  it("a working link shows the deck's size, language and three recent cards", async () => {
    const { deck, token } = await sharedDeck("Loomad", ["koer", "kass", "hobune", "lehm"]);
    const [bare] = await addCards(kateryna, [{ deckId: deck.id, term: "siga" }]);
    const [hobune] = await db
      .select({ id: schema.cards.id })
      .from(schema.cards)
      .where(and(eq(schema.cards.deckId, deck.id), eq(schema.cards.term, "hobune")));
    if (!hobune || bare?.status !== "added") throw new Error("setup failed");
    await archiveCard(kateryna, hobune.id);

    const preview = await previewJoin(db, token, null);
    expect(preview).toMatchObject({
      status: "live",
      deck: {
        name: "Loomad",
        total: 4,
        owner: { name: "Kateryna" },
        language: "et",
        lastAddedAt: expect.any(String),
      },
      viewer: "signed-out",
      deckId: null,
    });
    // Cards with a meaning come first; the archived card never shows.
    expect(preview.deck?.samples).toHaveLength(3);
    expect(preview.deck?.samples.every((c) => c.meaning)).toBe(true);
    expect(preview.deck?.samples.map((c) => c.term)).not.toContain("hobune");
  });

  it("tells each viewer apart and gives only the owner and members the deck id", async () => {
    const { deck, token } = await sharedDeck("Riided");
    expect((await previewJoin(db, token, "anna")).viewer).toBe("visitor");
    expect(await previewJoin(db, token, "kateryna")).toMatchObject({
      viewer: "owner",
      deckId: deck.id,
    });

    await joinThroughLink(anna, token);
    expect(await previewJoin(db, token, "anna")).toMatchObject({
      viewer: "member",
      deckId: deck.id,
    });

    await leave(anna, deck.id);
    expect(await previewJoin(db, token, "anna")).toMatchObject({ viewer: "visitor", deckId: null });

    await joinThroughLink(anna, token);
    await removeMember(kateryna, deck.id, "anna");
    expect(await previewJoin(db, token, "anna")).toMatchObject({ viewer: "removed", deckId: null });
  });

  it("a turned-off, archived or malformed link names no deck", async () => {
    const off = await sharedDeck("Kodu");
    await turnOffJoinLink(kateryna, off.deck.id);
    expect(await previewJoin(db, off.token, null)).toMatchObject({ status: "off", deck: null });

    const archived = await sharedDeck("Kool");
    await archiveDeck(kateryna, archived.deck.id);
    expect(await previewJoin(db, archived.token, "kateryna")).toMatchObject({
      status: "archived",
      deck: null,
      deckId: null,
    });

    for (const token of ["", "short", `${off.token.slice(0, 31)}!`, "x".repeat(32)]) {
      expect(await previewJoin(db, token, null)).toMatchObject({ status: "invalid", deck: null });
    }
  });
});

describe("joining through the link", () => {
  it("repeated joins make one membership, one audit row and one set of states", async () => {
    const { deck, token } = await sharedDeck("Ilm", ["vihm", "päike"]);

    const results = await Promise.all([
      joinThroughLink(anna, token),
      joinThroughLink(anna, token),
      joinThroughLink(anna, token),
    ]);
    await joinThroughLink(anna, token);

    expect(results.every((r) => r.deckId === deck.id && r.role === "learner")).toBe(true);
    expect(await listMembers(kateryna, deck.id)).toHaveLength(1);
    expect(await auditRows(deck.id, "join")).toHaveLength(1);
    const states = await db
      .select({ id: schema.cardStates.id })
      .from(schema.cardStates)
      .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
      .where(and(eq(schema.cards.deckId, deck.id), eq(schema.cardStates.userId, "anna")));
    expect(states).toHaveLength(2);
    expect((await listDecks(anna)).find((d) => d.id === deck.id)).toMatchObject({
      role: "learner",
      due: 2,
    });
  });

  it("records which link let the member in", async () => {
    const { deck, token } = await sharedDeck("Linnud");
    await joinThroughLink(marko, token);
    const [membership] = await db
      .select({ invitationId: schema.deckMembers.invitationId })
      .from(schema.deckMembers)
      .where(and(eq(schema.deckMembers.deckId, deck.id), eq(schema.deckMembers.userId, "marko")));
    expect(membership?.invitationId).toBeTruthy();
  });

  it("an owner joining their own link stays the owner", async () => {
    const { deck, token } = await sharedDeck("Oma");
    expect(await joinThroughLink(kateryna, token)).toEqual({ deckId: deck.id, role: "owner" });
    expect(await listMembers(kateryna, deck.id)).toEqual([]);
  });

  it("a self-leaver rejoins, and someone the owner removed stays out", async () => {
    const { deck, token } = await sharedDeck("Sport");
    await joinThroughLink(anna, token);
    await leave(anna, deck.id);
    await joinThroughLink(anna, token);
    expect((await listDecks(anna)).map((d) => d.id)).toContain(deck.id);

    await removeMember(kateryna, deck.id, "anna");
    await expect(joinThroughLink(anna, token)).rejects.toThrow(forbidden);
    await expect(join(anna, deck.id)).rejects.toThrow(forbidden);
    expect((await listDecks(anna)).map((d) => d.id)).not.toContain(deck.id);
  });

  it("an archived deck's link admits nobody until the deck is restored", async () => {
    const { deck, token } = await sharedDeck("Muusika");
    await archiveDeck(kateryna, deck.id);
    expect(await joinLinkAdmits(db, token)).toBe(false);
    await expect(joinThroughLink(marko, token)).rejects.toThrow(notFound);
    expect(await listMembers(kateryna, deck.id)).toEqual([]);

    await restoreDeck(kateryna, deck.id);
    expect(await joinLinkAdmits(db, token)).toBe(true);
  });

  it("a join that started before the link went off does not land", async () => {
    const { deck, token } = await sharedDeck("Hilja");
    const [invitation] = await db
      .select({ id: schema.deckInvitations.id })
      .from(schema.deckInvitations)
      .where(eq(schema.deckInvitations.token, token));
    if (!invitation) throw new Error("no invitation");
    // The link check already passed; the owner turns the link off before the membership write.
    await turnOffJoinLink(kateryna, deck.id);

    await expect(join(marko, deck.id, { invitationId: invitation.id })).rejects.toThrow(notFound);
    expect(await listMembers(kateryna, deck.id)).toEqual([]);
    expect(await auditRows(deck.id, "join")).toHaveLength(0);
    const states = await db
      .select({ id: schema.cardStates.id })
      .from(schema.cardStates)
      .innerJoin(schema.cards, eq(schema.cards.id, schema.cardStates.cardId))
      .where(and(eq(schema.cards.deckId, deck.id), eq(schema.cardStates.userId, "marko")));
    expect(states).toHaveLength(0);
  });

  it("a malformed token admits nobody", async () => {
    expect(await joinLinkAdmits(db, "not-a-token")).toBe(false);
    await expect(joinThroughLink(marko, "not-a-token")).rejects.toThrow(notFound);
  });
});
