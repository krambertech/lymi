import { and, eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { personas } from "../dev/personas";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import {
  addSampleCards,
  asClaude,
  devCounts,
  enrichSampleCards,
  reachGoal,
  recallCards,
  seedPersona,
  setDue,
  slipCards,
} from "./dev";
import { gradeCard, reviewRounds } from "./review";
import { setReviewTimezone, streak } from "./review-days";
import { updateSettings } from "./settings";
import { learner, testDb } from "./test-db";

// Small fixtures rather than seeded personas: a persona seed is slow enough to time out under load.

let db: Db;
let dispose: () => Promise<void>;
let people = 0;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60_000);

afterAll(async () => {
  await dispose();
});

const DAY = 86_400_000;

async function account(): Promise<ServiceContext> {
  people += 1;
  const ctx = await learner(db, `dev-${people}`, `Dev ${people}`);
  await setReviewTimezone(ctx, { mode: "manual", timezone: "UTC" });
  return ctx;
}

/** An account whose cards were each reviewed Good on each of the last three days. */
async function withHistory(cards: number) {
  const ctx = await account();
  await addSampleCards(ctx, cards);
  const ids = await db
    .select({ id: schema.cards.id })
    .from(schema.cards)
    .where(eq(schema.cards.userId, ctx.userId));
  for (const days of [3, 2, 1]) {
    for (const { id } of ids) {
      const reviewedAt = new Date(Date.now() - days * DAY);
      await gradeCard(ctx, { cardId: id, direction: "recognition", rating: 3, reviewedAt });
    }
  }
  return ctx;
}

describe("simulate actions", () => {
  it("adds cards as Claude, so Activity names the app, into a new deck when there is none", async () => {
    const ctx = await account();
    expect(await addSampleCards(asClaude(ctx), 5)).toBe(5);
    expect(await addSampleCards(asClaude(ctx), 25)).toBe(25);

    const rows = await db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.userId, ctx.userId), eq(schema.auditLog.entity, "card")));
    expect(rows).toHaveLength(30);
    expect(rows.every((r) => r.actor === "mcp" && r.actorClientName === "Claude")).toBe(true);
    expect((await devCounts(ctx)).decks).toBe(1);
  });

  it("enriches the newest cards without an example, as the AI", async () => {
    const ctx = await account();
    await addSampleCards(asClaude(ctx), 3);
    expect(await enrichSampleCards(ctx, 5)).toBe(3);
    expect(await enrichSampleCards(ctx, 5)).toBe(0);

    const cards = await db.select().from(schema.cards).where(eq(schema.cards.userId, ctx.userId));
    expect(cards.every((c) => c.example && c.exampleSource === "ai")).toBe(true);
    const enrich = await db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.userId, ctx.userId), eq(schema.auditLog.action, "enrich")));
    expect(enrich).toHaveLength(3);
    expect(enrich.every((r) => r.actor === "ai")).toBe(true);
  });

  it("forgets due cards through the review service, filling Forgotten today", async () => {
    const ctx = await account();
    await addSampleCards(ctx, 5);
    expect(await recallCards(ctx, 3, 1)).toBe(3);
    expect((await reviewRounds(ctx)).forgotten).toBe(3);
  });

  it("reaches the goal on an account with a single card, counting every grade", async () => {
    const ctx = await account();
    await updateSettings(ctx, { dailyGoal: 10 });
    await addSampleCards(ctx, 1);
    expect(await reachGoal(ctx)).toBe(10);
    expect((await streak(ctx)).today.outcome).toBe("goal_met");
    expect(await reachGoal(ctx)).toBe(0);
  });

  it("reseeding forgets a goal met before it", async () => {
    const ctx = await account();
    await updateSettings(ctx, { dailyGoal: 3 });
    await addSampleCards(ctx, 3);
    await recallCards(ctx, 3);
    expect((await streak(ctx)).today.outcome).toBe("goal_met");

    await seedPersona(ctx, personas.find((p) => p.id === "fresh") as (typeof personas)[number]);
    const after = await streak(ctx);
    expect(after.today.attempts).toBe(0);
    expect(after.today.outcome).toBe("open");
  });

  it("makes cards often forgotten without touching the streak or cards reviewed today", async () => {
    const ctx = await withHistory(5);
    const reviewed = await db
      .select({ id: schema.cards.id })
      .from(schema.cards)
      .where(eq(schema.cards.userId, ctx.userId))
      .limit(2);
    for (const { id } of reviewed) {
      await gradeCard(ctx, { cardId: id, direction: "recognition", rating: 3 });
    }
    const before = await streak(ctx);
    expect((await reviewRounds(ctx)).slipping).toBe(0);

    expect(await slipCards(ctx, 5)).toBe(3);
    expect((await reviewRounds(ctx)).slipping).toBe(3);
    const after = await streak(ctx);
    expect(after.current).toBe(before.current);
    expect(after.reviewedDays).toBe(before.reviewedDays);
  });

  it("makes nothing slip on an account with no past reviews", async () => {
    const ctx = await account();
    await addSampleCards(ctx, 5);
    expect(await slipCards(ctx, 3)).toBe(0);
  });

  it("makes cards due that were not reviewed today first", async () => {
    const ctx = await account();
    const deck = await createDeck(ctx, { name: "Both ways", directions: "both" });
    await addSampleCards(ctx, 6);
    const [first] = await db
      .select({ id: schema.cards.id })
      .from(schema.cards)
      .where(eq(schema.cards.deckId, deck.id));
    if (!first) throw new Error("No card");
    await gradeCard(ctx, { cardId: first.id, direction: "recognition", rating: 3 });

    expect(await setDue(ctx, 5)).toBe(5);
    expect((await devCounts(ctx)).due).toBe(5);
  });
});
