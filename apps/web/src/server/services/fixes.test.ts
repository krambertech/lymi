import { and, eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { getCard, updateCard } from "./cards";
import type { ServiceContext } from "./context";
import { type FixCause, seedFixes } from "./dev";
import { acceptFix, markOffered, reviewOffers, undoFix } from "./fixes";
import { join } from "./members";
import { reviewDraw, reviewQueue } from "./review";
import { setReviewTimezone } from "./review-days";
import { learner, testDb } from "./test-db";

const DAY = 86_400_000;

describe("offering a diagnosis's fix in review", () => {
  let db: Db;
  let dispose: () => Promise<void>;
  let people = 0;

  beforeAll(async () => {
    ({ db, dispose } = await testDb());
  }, 60_000);

  afterAll(async () => {
    await dispose();
  });

  async function setup(causes?: FixCause[]) {
    people += 1;
    const ctx = await learner(db, `fixing-${people}`, `Learner ${people}`);
    await setReviewTimezone(ctx, { mode: "manual", timezone: "UTC" });
    const seeded = await seedFixes(ctx, causes);
    const cardOf = (cause: FixCause) => {
      const id = seeded.cards.find((c) => c.cause === cause)?.cardId;
      if (!id) throw new Error(`no ${cause} card`);
      return id;
    };
    const diagnosisOf = async (cardId: string) => {
      const [row] = await db
        .select()
        .from(schema.cardDiagnoses)
        .where(eq(schema.cardDiagnoses.cardId, cardId));
      if (!row) throw new Error("no diagnosis");
      return row;
    };
    return { ctx, deckId: seeded.deckId, cardOf, diagnosisOf };
  }

  const offersIn = async (ctx: ServiceContext) =>
    new Map(
      (await reviewDraw(ctx, { zone: "UTC" })).cards.flatMap((c) =>
        c.offer ? [[c.card.term, c.offer] as const] : [],
      ),
    );

  const cardsIn = (ctx: ServiceContext, deckId: string) =>
    db
      .select()
      .from(schema.cards)
      .where(and(eq(schema.cards.userId, ctx.userId), eq(schema.cards.deckId, deckId)));

  it("carries each often-forgotten card's fix in the draw and the round, naming a pair's other card", async () => {
    const { ctx } = await setup();
    const offers = await offersIn(ctx);
    expect([...offers.keys()].sort()).toEqual(
      ["Kus sa elad? Ma elan Tallinnas.", "alustama", "pikk", "vaatama"].sort(),
    );
    expect(offers.get("alustama")).toMatchObject({
      cause: "confused_pair",
      other: { term: "algama", meaning: "to begin, to start (by itself)", language: "et" },
    });
    expect(offers.get("vaatama")).toEqual({
      diagnosisId: expect.any(String),
      cause: "unclear",
      draft: null,
    });

    const round = await reviewQueue(ctx, { round: "slipping" });
    expect(
      round.items
        .filter((item) => item.offer)
        .map((item) => item.card.term)
        .sort(),
    ).toEqual([...offers.keys()].sort());
  });

  it("offers a fix once per revision, and records that it was shown", async () => {
    const { ctx, cardOf, diagnosisOf } = await setup(["several_answers"]);
    const row = await diagnosisOf(cardOf("several_answers"));
    await markOffered(ctx, row.id);
    await markOffered(ctx, row.id);
    expect(await offersIn(ctx)).toEqual(new Map());
    const audit = await db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.userId, ctx.userId), eq(schema.auditLog.entity, "diagnosis")));
    expect(audit).toMatchObject([{ actor: "user", action: "offer", entityId: row.id }]);
  });

  it("offers no hook, which comes in its own slice", async () => {
    const { ctx, cardOf, diagnosisOf } = await setup(["unclear"]);
    const row = await diagnosisOf(cardOf("unclear"));
    await db
      .update(schema.cardDiagnoses)
      .set({ cause: "no_anchor", draft: { hook: "watch a vat" } })
      .where(eq(schema.cardDiagnoses.id, row.id));
    expect(await offersIn(ctx)).toEqual(new Map());
  });

  it("gives a member of a shared deck no offer, since they cannot change the card", async () => {
    const { ctx: owner, cardOf, deckId } = await setup(["unclear"]);
    const member = await learner(db, `member-${people}`, "Member");
    await join(member, deckId);
    const card = await getCard(owner, cardOf("unclear"));
    await db.insert(schema.cardDiagnoses).values({
      id: `member-diagnosis-${people}`,
      userId: member.userId,
      cardId: card.id,
      revision: card.revision,
      status: "done",
      cause: "unclear",
      confidence: 0.3,
      model: "test",
    });
    expect(await reviewOffers(member, [card], new Set([card.id]), "UTC")).toEqual(new Map());
  });

  it("adds a pair's two cards, marks untouched text as the AI's, and Undo archives them", async () => {
    const { ctx, deckId, cardOf, diagnosisOf } = await setup(["confused_pair"]);
    const row = await diagnosisOf(cardOf("confused_pair"));
    const out = await acceptFix(
      ctx,
      row.id,
      {
        cause: "confused_pair",
        cards: [
          { term: "Ma alustan tööd kell üheksa.", meaning: "I start work at nine. (I start it)" },
          { term: "Töö algab kell üheksa.", meaning: "Work begins at nine." },
        ],
      },
      null,
    );
    expect(out.added.map((c) => [c.term, c.meaningSource, c.deckId])).toEqual([
      ["Ma alustan tööd kell üheksa.", "ai", deckId],
      ["Töö algab kell üheksa.", "manual", deckId],
    ]);
    expect(out.edited).toBeNull();
    expect(await diagnosisOf(row.cardId)).toMatchObject({ acceptedAt: expect.any(Date) });
    await expect(
      acceptFix(
        ctx,
        row.id,
        {
          cause: "confused_pair",
          cards: [
            { term: "a", meaning: "b" },
            { term: "c", meaning: "d" },
          ],
        },
        null,
      ),
    ).rejects.toMatchObject({ code: "conflict" });

    await undoFix(ctx, row.id);
    await undoFix(ctx, row.id);
    const archived = (await cardsIn(ctx, deckId)).filter((c) => c.archivedAt).map((c) => c.term);
    expect(archived.sort()).toEqual(out.added.map((c) => c.term).sort());
    expect(await diagnosisOf(row.cardId)).toMatchObject({ acceptedAt: null, fix: null });
  });

  it("splits a card that keeps its id and history, and Undo puts the card back", async () => {
    const { ctx, deckId, cardOf, diagnosisOf } = await setup(["two_things"]);
    const cardId = cardOf("two_things");
    const row = await diagnosisOf(cardId);
    // Written straight to the row, since an edit would raise the revision past the diagnosis.
    await db
      .update(schema.cards)
      .set({ pronunciation: "kus sa ˈelad ma ˈelan", pronunciationSource: "ai" })
      .where(eq(schema.cards.id, cardId));
    const before = await getCard(ctx, cardId);
    const out = await acceptFix(
      ctx,
      row.id,
      {
        cause: "two_things",
        cards: [
          { term: "Kus sa elad?", meaning: "Where do you live?" },
          { term: "Ma elan Tallinnas.", meaning: "I live in Tallinn." },
        ],
      },
      null,
    );
    expect(out.edited).toMatchObject({
      id: cardId,
      term: "Kus sa elad?",
      meaning: "Where do you live?",
      meaningSource: "ai",
      // The old pronunciation was of both halves, so it goes with the old term.
      pronunciation: null,
      pronunciationSource: null,
    });
    expect(out.added).toMatchObject([
      { term: "Ma elan Tallinnas.", deckId, source: "Tund 7", meaningSource: "ai" },
    ]);
    const reviews = await db.select().from(schema.reviews).where(eq(schema.reviews.cardId, cardId));
    expect(reviews).toHaveLength(3);

    await undoFix(ctx, row.id);
    const after = await getCard(ctx, cardId);
    expect(after).toMatchObject({
      term: before.term,
      meaning: before.meaning,
      meaningSource: "lesson",
      pronunciation: "kus sa ˈelad ma ˈelan",
      pronunciationSource: "ai",
    });
    const second = out.added[0]?.id ?? "";
    expect((await getCard(ctx, second)).archivedAt).not.toBeNull();
    // The words are the diagnosed ones again, so the diagnosis carries over, already offered.
    const rows = await db
      .select()
      .from(schema.cardDiagnoses)
      .where(eq(schema.cardDiagnoses.cardId, cardId));
    expect(rows.find((r) => r.revision === after.revision)).toMatchObject({
      cause: "two_things",
      offeredAt: expect.any(Date),
      acceptedAt: null,
    });
    expect(await offersIn(ctx)).toEqual(new Map());
  });

  it("applies a fix once when two accepts race", async () => {
    const { ctx, deckId, cardOf, diagnosisOf } = await setup(["confused_pair"]);
    const row = await diagnosisOf(cardOf("confused_pair"));
    const input = {
      cause: "confused_pair" as const,
      cards: [
        { term: "Ma alustan tööd.", meaning: "I start work." },
        { term: "Töö algab.", meaning: "Work starts." },
      ] as [{ term: string; meaning: string }, { term: string; meaning: string }],
    };
    const results = await Promise.allSettled([
      acceptFix(ctx, row.id, input, null),
      acceptFix(ctx, row.id, input, null),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.find((r) => r.status === "rejected")).toMatchObject({
      reason: { code: "conflict" },
    });
    const active = (await cardsIn(ctx, deckId)).filter((c) => !c.archivedAt).map((c) => c.term);
    expect(active.sort()).toEqual(["Ma alustan tööd.", "Töö algab.", "algama", "alustama"].sort());
    const audit = await db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.userId, ctx.userId), eq(schema.auditLog.action, "accept")));
    expect(audit).toHaveLength(1);
  });

  it("reverses the cards it wrote when the fix cannot be recorded", async () => {
    const { ctx, deckId, cardOf, diagnosisOf } = await setup(["two_things"]);
    const cardId = cardOf("two_things");
    const row = await diagnosisOf(cardId);
    const before = await getCard(ctx, cardId);
    // The first batch writes the card; the second, which records the fix, fails.
    let batches = 0;
    const failing = new Proxy(db, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (prop === "batch") {
          return (statements: Parameters<Db["batch"]>[0]) => {
            batches += 1;
            if (batches === 3) return Promise.reject(new Error("D1 went away"));
            return target.batch(statements);
          };
        }
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    await expect(
      acceptFix(
        { ...ctx, db: failing },
        row.id,
        {
          cause: "two_things",
          cards: [
            { term: "Kus sa elad?", meaning: "Where do you live?" },
            { term: "Ma elan Tallinnas.", meaning: "I live in Tallinn." },
          ],
        },
        null,
      ),
    ).rejects.toThrow("D1 went away");
    expect(await getCard(ctx, cardId)).toMatchObject({
      term: before.term,
      meaning: before.meaning,
      meaningSource: before.meaningSource,
    });
    const active = (await cardsIn(ctx, deckId)).filter((c) => !c.archivedAt).map((c) => c.term);
    expect(active).toEqual([before.term]);
    expect(await diagnosisOf(cardId)).toMatchObject({ acceptedAt: null, fix: null });
  });

  it("refuses to undo a fix that is still being applied", async () => {
    const { ctx, cardOf, diagnosisOf } = await setup(["unclear"]);
    const row = await diagnosisOf(cardOf("unclear"));
    await db
      .update(schema.cardDiagnoses)
      .set({ acceptedAt: new Date() })
      .where(eq(schema.cardDiagnoses.id, row.id));
    await expect(undoFix(ctx, row.id)).rejects.toMatchObject({ code: "conflict" });
  });

  it("releases the claim when the fix cannot be written, so it can be accepted again", async () => {
    const { ctx, cardOf, diagnosisOf } = await setup(["several_answers"]);
    const row = await diagnosisOf(cardOf("several_answers"));
    await db
      .update(schema.cardDiagnoses)
      .set({ draft: { field: "term", text: "pikk (inimene)", otherAnswer: "kõrge" } })
      .where(eq(schema.cardDiagnoses.id, row.id));
    await expect(
      acceptFix(ctx, row.id, { cause: "several_answers", text: "x".repeat(501) }, null),
    ).rejects.toMatchObject({ code: "invalid" });
    expect(await diagnosisOf(row.cardId)).toMatchObject({ acceptedAt: null, fix: null });
    await acceptFix(ctx, row.id, { cause: "several_answers", text: "pikk (inimene)" }, null);
    expect(await getCard(ctx, row.cardId)).toMatchObject({ term: "pikk (inimene)" });
  });

  it("changes the cue of a card with more than one right answer, and Undo restores it", async () => {
    const { ctx, cardOf, diagnosisOf } = await setup(["several_answers"]);
    const cardId = cardOf("several_answers");
    const row = await diagnosisOf(cardId);
    const out = await acceptFix(
      ctx,
      row.id,
      { cause: "several_answers", text: "tall (of a person, not a building)" },
      null,
    );
    expect(out.edited).toMatchObject({
      meaning: "tall (of a person, not a building)",
      meaningSource: "manual",
    });
    await undoFix(ctx, row.id);
    expect(await getCard(ctx, cardId)).toMatchObject({ meaning: "tall", meaningSource: "lesson" });
  });

  it("refuses a fix for a card changed since the diagnosis, or of another cause", async () => {
    const { ctx, cardOf, diagnosisOf } = await setup(["several_answers"]);
    const cardId = cardOf("several_answers");
    const row = await diagnosisOf(cardId);
    await expect(
      acceptFix(
        ctx,
        row.id,
        {
          cause: "two_things",
          cards: [
            { term: "a", meaning: "b" },
            { term: "c", meaning: "d" },
          ],
        },
        null,
      ),
    ).rejects.toMatchObject({ code: "invalid" });
    await updateCard(ctx, cardId, { meaning: "tall, high" });
    await expect(
      acceptFix(ctx, row.id, { cause: "several_answers", text: "tall (of a person)" }, null),
    ).rejects.toMatchObject({ code: "conflict" });
  });

  it("waits for a card to slip again after an offer before offering its next diagnosis", async () => {
    const { ctx, cardOf, diagnosisOf } = await setup(["unclear"]);
    const cardId = cardOf("unclear");
    const row = await diagnosisOf(cardId);
    // Offered before the three misses the seed wrote, then the card was edited.
    await db
      .update(schema.cardDiagnoses)
      .set({ offeredAt: new Date(Date.now() - 5 * DAY) })
      .where(eq(schema.cardDiagnoses.id, row.id));
    await updateCard(ctx, cardId, { meaning: "to look at, to watch" });
    const card = await getCard(ctx, cardId);
    await db.insert(schema.cardDiagnoses).values({
      id: `next-${people}`,
      userId: ctx.userId,
      cardId,
      revision: card.revision,
      status: "done",
      cause: "unclear",
      confidence: 0.3,
      model: "test",
    });
    expect((await reviewOffers(ctx, [card], new Set([cardId]), "UTC")).size).toBe(1);

    // Offered after them, it has not slipped since.
    await db
      .update(schema.cardDiagnoses)
      .set({ offeredAt: new Date() })
      .where(eq(schema.cardDiagnoses.id, row.id));
    expect((await reviewOffers(ctx, [card], new Set([cardId]), "UTC")).size).toBe(0);
  });
});
