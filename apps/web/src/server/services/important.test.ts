import { and, eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { type Db, schema } from "../db";
import type { AnalyticsEvent } from "./analytics";
import { addCards, showCard } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { setImportant } from "./important";
import { join } from "./members";
import { reviewDraw } from "./review";
import { setReviewTimezone } from "./review-days";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;
let owner: ServiceContext;
let member: ServiceContext;
let stranger: ServiceContext;
const captured: AnalyticsEvent[] = [];

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  owner = {
    ...(await learner(db, "important-owner", "Owner")),
    analytics: { writeDataPoint: vi.fn(), capture: (event) => captured.push(event) },
  };
  member = await learner(db, "important-member", "Member");
  stranger = await learner(db, "important-stranger", "Stranger");
  await setReviewTimezone(owner, { mode: "manual", timezone: "UTC" });
}, 60_000);

afterAll(async () => {
  await dispose();
});

async function deckWith(terms: string[]) {
  const deck = await createDeck(owner, { name: `Deck ${terms[0]}`, defaultLanguage: "et" });
  const outcomes = await addCards(
    owner,
    terms.map((term) => ({ deckId: deck.id, term, meaning: term })),
  );
  return { deck, cards: outcomes.flatMap((o) => (o.status === "added" ? [o.card] : [])) };
}

const auditActions = async (cardId: string) =>
  (
    await db
      .select({ action: schema.auditLog.action })
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.entityId, cardId), eq(schema.auditLog.entity, "card")))
  ).map((row) => row.action);

const statesOf = (ctx: ServiceContext, cardId: string) =>
  db
    .select({ due: schema.cardStates.due, fsrs: schema.cardStates.fsrs })
    .from(schema.cardStates)
    .where(and(eq(schema.cardStates.cardId, cardId), eq(schema.cardStates.userId, ctx.userId)));

describe("the important mark", () => {
  it("marks and unmarks once each, with an audit row and an event per change", async () => {
    const { cards } = await deckWith(["üks"]);
    const card = cards[0];
    if (!card) throw new Error("no card");
    expect(card.important).toBe(false);
    captured.length = 0;

    expect((await setImportant(owner, card.id, true)).important).toBe(true);
    expect((await setImportant(owner, card.id, true)).important).toBe(true);
    expect((await showCard(owner, card.id)).important).toBe(true);
    expect((await setImportant(owner, card.id, false)).important).toBe(false);
    expect((await setImportant(owner, card.id, false)).important).toBe(false);

    const actions = await auditActions(card.id);
    expect(actions.filter((a) => a === "mark_important")).toHaveLength(1);
    expect(actions.filter((a) => a === "unmark_important")).toHaveLength(1);
    expect(captured).toEqual([
      { name: "card_importance_set", important: true, channel: "app" },
      { name: "card_importance_set", important: false, channel: "app" },
    ]);
  });

  it("is each learner's own, and only for a card they can see", async () => {
    const { deck, cards } = await deckWith(["kaks"]);
    const card = cards[0];
    if (!card) throw new Error("no card");
    await join(member, deck.id);

    expect((await setImportant(member, card.id, true)).important).toBe(true);
    expect((await showCard(member, card.id)).important).toBe(true);
    expect((await showCard(owner, card.id)).important).toBe(false);
    await expect(setImportant(stranger, card.id, true)).rejects.toMatchObject({
      code: "not_found",
    });
  });

  it("reaches the draw without moving a schedule", async () => {
    const { deck, cards } = await deckWith(["kolm", "neli"]);
    const [marked, plain] = cards;
    if (!marked || !plain) throw new Error("no cards");
    const before = await statesOf(owner, marked.id);

    await setImportant(owner, marked.id, true);

    expect(await statesOf(owner, marked.id)).toEqual(before);
    const draw = await reviewDraw(owner, { deckId: deck.id });
    const important = Object.fromEntries(draw.cards.map((c) => [c.card.id, c.card.important]));
    expect(important).toEqual({ [marked.id]: true, [plain.id]: false });
  });
});
