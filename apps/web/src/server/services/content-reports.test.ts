import { CONTENT_REPORT_DAILY_LIMIT } from "@lymi/core";
import { and, eq } from "@lymi/core/db";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { type Db, schema } from "../db";
import type { Bindings } from "../env";
import { addCards, archiveCard, getCard, restoreCard } from "./cards";
import {
  getContentReport,
  listContentReports,
  reportContent,
  resolveContentReport,
} from "./content-reports";
import type { ServiceContext } from "./context";
import { createDeck, listDecks, restoreDeck } from "./decks";
import { clearLocalEmailOutbox, latestLocalEmail } from "./email";
import { inviteByEmail, turnOnJoinLink } from "./invitations";
import { join } from "./members";
import { learner, testDb } from "./test-db";

type ReportEnv = Pick<Bindings, "PRODUCT_URL" | "EMAIL" | "SESSIONS">;
const env = {
  PRODUCT_URL: "http://localhost:5241",
  EMAIL: { send: vi.fn() },
} as unknown as ReportEnv;

let db: Db;
let dispose: () => Promise<void>;
let next = 0;
const operators = new Set(["operator@lymi.test"]);
let operator: ServiceContext;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  operator = await learner(db, "operator", "Operator");
}, 60_000);

afterAll(async () => {
  await dispose();
});

afterEach(() => {
  clearLocalEmailOutbox();
});

async function person(name: string) {
  next += 1;
  return learner(db, `${name.toLowerCase()}-${next}`, name);
}

/** An owner's deck with one card, and a member studying it. */
async function sharedDeck() {
  const owner = await person("Mart");
  const member = await person("Lesia");
  const deck = await createDeck(owner, { name: "Eesti slang", defaultLanguage: "et" });
  const [added] = await addCards(owner, [{ deckId: deck.id, term: "kurat", meaning: "damn" }]);
  if (added?.status !== "added") throw new Error("no card");
  await join(member, deck.id);
  return { owner, member, deck, card: added.card };
}

const forbidden = expect.objectContaining({ code: "forbidden" });
const notFound = expect.objectContaining({ code: "not_found" });

describe("reporting", () => {
  it("keeps a member's card report as it read, and emails the operator", async () => {
    const { member, card } = await sharedDeck();
    const { id } = await reportContent(member, env, {
      target: { kind: "card", cardId: card.id },
      reason: "offensive",
      note: "Insults a group of people.",
    });

    const [row] = await db
      .select()
      .from(schema.contentReports)
      .where(eq(schema.contentReports.id, id));
    expect(row).toMatchObject({ target: "card", via: "member", reason: "offensive" });
    expect(row?.snapshot).toMatchObject({ deckName: "Eesti slang", card: { term: "kurat" } });

    const email = latestLocalEmail("hello@lymi.app");
    expect(email?.subject).toBe("Lymi report: Hateful or offensive · kurat");
    expect(email?.text).toContain("Insults a group of people.");
    expect(email?.text).toContain(`pnpm moderate show ${id}`);
  });

  it("answers a repeat of an open report with the same one and no second email", async () => {
    const { member, deck } = await sharedDeck();
    const target = { kind: "deck" as const, deckId: deck.id };
    const first = await reportContent(member, env, { target, reason: "spam" });
    clearLocalEmailOutbox();
    const again = await reportContent(member, env, { target, reason: "other" });
    expect(again.id).toBe(first.id);
    expect(latestLocalEmail("hello@lymi.app")).toBeNull();
  });

  it("takes a report from a join page before joining", async () => {
    const { owner, deck } = await sharedDeck();
    const visitor = await person("Visitor");
    const link = await turnOnJoinLink(owner, deck.id);
    const { id } = await reportContent(visitor, env, {
      target: { kind: "join", token: link.token },
      reason: "harassment",
    });
    expect(await getContentReport(operator, operators, id)).toMatchObject({
      via: "join",
      deck: { id: deck.id, name: "Eesti slang" },
      card: null,
    });
  });

  it("refuses the owner's own deck and a deck the reporter cannot see", async () => {
    const { owner, deck } = await sharedDeck();
    const stranger = await person("Stranger");
    await expect(
      reportContent(owner, env, { target: { kind: "deck", deckId: deck.id }, reason: "spam" }),
    ).rejects.toMatchObject({ code: "invalid" });
    await expect(
      reportContent(stranger, env, { target: { kind: "deck", deckId: deck.id }, reason: "spam" }),
    ).rejects.toEqual(notFound);
  });

  it("stops at the daily limit", async () => {
    const member = await person("Busy");
    for (let i = 0; i < CONTENT_REPORT_DAILY_LIMIT; i++) {
      const owner = await person("Owner");
      const deck = await createDeck(owner, { name: `Deck ${i}` });
      await join(member, deck.id);
      await reportContent(member, env, {
        target: { kind: "deck", deckId: deck.id },
        reason: "spam",
      });
    }
    const owner = await person("Owner");
    const deck = await createDeck(owner, { name: "One more" });
    await join(member, deck.id);
    await expect(
      reportContent(member, env, { target: { kind: "deck", deckId: deck.id }, reason: "spam" }),
    ).rejects.toMatchObject({ code: "conflict" });
  });
});

describe("moderation", () => {
  it("is not found to anyone who is not an operator", async () => {
    const { member, card } = await sharedDeck();
    const { id } = await reportContent(member, env, {
      target: { kind: "card", cardId: card.id },
      reason: "sexual",
    });
    await expect(listContentReports(member, operators, "open")).rejects.toEqual(notFound);
    await expect(resolveContentReport(member, operators, id, "dismiss")).rejects.toEqual(notFound);
  });

  it("archives a reported card for every member, for good", async () => {
    const { owner, member, card } = await sharedDeck();
    const { id } = await reportContent(member, env, {
      target: { kind: "card", cardId: card.id },
      reason: "offensive",
    });
    expect((await listContentReports(operator, operators, "open")).map((r) => r.id)).toContain(id);

    const resolved = await resolveContentReport(operator, operators, id, "archive_card");
    expect(resolved).toMatchObject({ status: "resolved", action: "archive_card" });
    expect((await getCard(member, card.id)).archivedAt).not.toBeNull();
    await expect(restoreCard(owner, card.id)).rejects.toEqual(forbidden);

    const [audit] = await db
      .select({ actor: schema.auditLog.actor, action: schema.auditLog.action })
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.entityId, card.id), eq(schema.auditLog.action, "archive")));
    expect(audit).toMatchObject({ actor: "system", action: "archive" });
    await expect(resolveContentReport(operator, operators, id, "dismiss")).rejects.toMatchObject({
      code: "conflict",
    });
  });

  it("leaves the content alone on dismiss", async () => {
    const { owner, member, card } = await sharedDeck();
    const { id } = await reportContent(member, env, {
      target: { kind: "card", cardId: card.id },
      reason: "other",
    });
    await resolveContentReport(operator, operators, id, "dismiss");
    await archiveCard(owner, card.id);
    await restoreCard(owner, card.id);
    expect((await getCard(owner, card.id)).archivedAt).toBeNull();
  });

  it("suspends an owner from sharing: shared decks go, nothing reopens", async () => {
    const { owner, member, deck } = await sharedDeck();
    const own = await createDeck(owner, { name: "Just mine" });
    const { id } = await reportContent(member, env, {
      target: { kind: "deck", deckId: deck.id },
      reason: "harassment",
    });
    await resolveContentReport(operator, operators, id, "suspend_sharing");

    expect((await listDecks(member)).map((d) => d.id)).not.toContain(deck.id);
    expect((await listDecks(owner)).map((d) => d.id)).toContain(own.id);
    await expect(restoreDeck(owner, deck.id)).rejects.toEqual(forbidden);
    await expect(turnOnJoinLink(owner, own.id)).rejects.toEqual(forbidden);
    await expect(inviteByEmail(owner, own.id, "someone@lymi.test", async () => {})).rejects.toEqual(
      forbidden,
    );
  });
});
