import { dayWindow } from "@lymi/core";
import { and, eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import { getCard, updateCard } from "./cards";
import type { ServiceContext } from "./context";
import { type FixCause, seedFixes } from "./dev";
import {
  acceptFix,
  dismissDiagnosis,
  FIX_CLAIM_MS,
  markOffered,
  reviewOffers,
  undoDismissal,
  undoFix,
} from "./fixes";
import { join } from "./members";
import { gradeCard, reviewDraw, reviewQueue } from "./review";
import { setReviewTimezone } from "./review-days";
import { learner, testDb } from "./test-db";

const DAY = 86_400_000;
const today = () => dayWindow(new Date(), "UTC");

/**
 * The database, except that the batch recording an accepted fix fails, and with `outage` every
 * batch after it too, as when D1 stays down for the rollback.
 */
function failingAcceptRecord(db: Db, { outage = false } = {}) {
  let failed = false;
  const recordsAccept = (statement: unknown) => {
    const { sql, params } = (statement as { toSQL(): { sql: string; params: unknown[] } }).toSQL();
    return /^insert into "audit_log"/.test(sql) && params.includes("accept");
  };
  const failing = new Proxy(db, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (prop === "batch") {
        return (statements: Parameters<Db["batch"]>[0]) => {
          if (!(outage && failed) && !statements.some(recordsAccept)) {
            return target.batch(statements);
          }
          failed = true;
          return Promise.reject(new Error("D1 went away"));
        };
      }
      return typeof value === "function" ? value.bind(target) : value;
    },
  });
  return { db: failing, failed: () => failed };
}

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
      ["Kus sa elad? Ma elan Tallinnas.", "alustama", "kõrvits", "pikk", "vaatama"].sort(),
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

  it("offers a drafted hook, unless the card already has one", async () => {
    const { ctx, cardOf } = await setup(["no_anchor"]);
    expect((await offersIn(ctx)).get("kõrvits")).toMatchObject({
      cause: "no_anchor",
      draft: { hook: "A pumpkin curves at its sides: “curve-its”." },
    });
    await updateCard(ctx, cardOf("no_anchor"), { hook: "My own picture of a pumpkin" });
    expect(await offersIn(ctx)).toEqual(new Map());
  });

  it("keeps a drafted hook as the AI's, an edited one as the learner's, and Undo clears it", async () => {
    const { ctx, cardOf, diagnosisOf } = await setup(["no_anchor"]);
    const cardId = cardOf("no_anchor");
    const row = await diagnosisOf(cardId);
    const before = await getCard(ctx, cardId);
    const drafted = "A pumpkin curves at its sides: “curve-its”.";
    const out = await acceptFix(ctx, row.id, { cause: "no_anchor", hook: drafted }, null);
    expect(out).toMatchObject({ added: [], edited: { hook: drafted, hookSource: "ai" } });
    // A hook is not edition text, so the diagnosis stays on the card's revision.
    expect((await getCard(ctx, cardId)).revision).toBe(before.revision);
    await undoFix(ctx, row.id);
    expect(await getCard(ctx, cardId)).toMatchObject({ hook: null, hookSource: null });

    await acceptFix(ctx, row.id, { cause: "no_anchor", hook: "Curvy pumpkin" }, null);
    expect(await getCard(ctx, cardId)).toMatchObject({
      hook: "Curvy pumpkin",
      hookSource: "manual",
    });
    const audit = await db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.userId, ctx.userId), eq(schema.auditLog.entity, "diagnosis")));
    expect(audit.map((a) => [a.actor, a.action])).toEqual([
      ["user", "accept"],
      ["user", "undo_accept"],
      ["user", "accept"],
    ]);
  });

  it("takes the learner's own hook for a card with no clear reason, and no other fix", async () => {
    const { ctx, cardOf, diagnosisOf } = await setup(["unclear"]);
    const cardId = cardOf("unclear");
    const row = await diagnosisOf(cardId);
    await expect(
      acceptFix(ctx, row.id, { cause: "several_answers", text: "to watch (a film)" }, null),
    ).rejects.toMatchObject({ code: "invalid" });
    const out = await acceptFix(ctx, row.id, { cause: "no_anchor", hook: "Watch the vat" }, null);
    expect(out.edited).toMatchObject({ hook: "Watch the vat", hookSource: "manual" });
    await undoFix(ctx, row.id);
    expect(await getCard(ctx, cardId)).toMatchObject({ hook: null, hookSource: null });
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
    expect(await reviewOffers(member, [card], new Set([card.id]), today())).toEqual(new Map());
  });

  it("draws a member's often-forgotten card from a shared deck with no offer", async () => {
    const { ctx: owner, cardOf, deckId } = await setup(["several_answers"]);
    const member = await learner(db, `drawing-member-${people}`, "Member");
    await setReviewTimezone(member, { mode: "manual", timezone: "UTC" });
    await join(member, deckId);
    const cardId = cardOf("several_answers");
    for (const daysAgo of [3, 2, 1]) {
      await gradeCard(member, {
        cardId,
        direction: "production",
        rating: 1,
        reviewedAt: new Date(today().start.getTime() - daysAgo * DAY + 9 * 3_600_000),
      });
    }
    const card = await getCard(owner, cardId);
    await db.insert(schema.cardDiagnoses).values({
      id: `drawing-member-diagnosis-${people}`,
      userId: member.userId,
      cardId,
      revision: card.revision,
      status: "done",
      cause: "several_answers",
      draft: { field: "meaning", text: "tall (of a person)", otherAnswer: "kõrge" },
      confidence: 0.9,
      model: "test",
    });
    const drawn = (await reviewDraw(member, { zone: "UTC" })).cards.find(
      (c) => c.card.id === cardId,
    );
    expect(drawn).toMatchObject({ slipping: true });
    expect(drawn?.offer).toBeUndefined();
  });

  it("refuses a fix from a member of a shared deck, since they cannot change the card", async () => {
    const { ctx: owner, cardOf, deckId } = await setup(["no_anchor"]);
    const member = await learner(db, `accepting-member-${people}`, "Member");
    await join(member, deckId);
    const card = await getCard(owner, cardOf("no_anchor"));
    const id = `accepting-member-diagnosis-${people}`;
    await db.insert(schema.cardDiagnoses).values({
      id,
      userId: member.userId,
      cardId: card.id,
      revision: card.revision,
      status: "done",
      cause: "no_anchor",
      draft: { hook: "A pumpkin curves at its sides" },
      confidence: 0.9,
      model: "test",
    });
    await expect(
      acceptFix(member, id, { cause: "no_anchor", hook: "Curvy pumpkin" }, null),
    ).rejects.toMatchObject({ code: "forbidden" });
    expect(await getCard(owner, card.id)).toMatchObject({ hook: null, hookSource: null });
    const [row] = await db
      .select()
      .from(schema.cardDiagnoses)
      .where(eq(schema.cardDiagnoses.id, id));
    expect(row).toMatchObject({ acceptedAt: null, fix: null });
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

  it("clears the hook of a card a split gives a new term, and Undo puts it back", async () => {
    const { ctx, cardOf, diagnosisOf } = await setup(["two_things"]);
    const cardId = cardOf("two_things");
    const row = await diagnosisOf(cardId);
    await db
      .update(schema.cards)
      .set({ hook: "Where do you live? In Tallinn.", hookSource: "manual" })
      .where(eq(schema.cards.id, cardId));
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
    expect(out.edited).toMatchObject({ term: "Kus sa elad?", hook: null, hookSource: null });
    expect(out.added).toMatchObject([{ hook: null }]);

    await undoFix(ctx, row.id);
    expect(await getCard(ctx, cardId)).toMatchObject({
      hook: "Where do you live? In Tallinn.",
      hookSource: "manual",
    });
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
    const failing = failingAcceptRecord(db);
    await expect(
      acceptFix(
        { ...ctx, db: failing.db },
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
    expect(failing.failed()).toBe(true);
    expect(await getCard(ctx, cardId)).toMatchObject({
      term: before.term,
      meaning: before.meaning,
      meaningSource: before.meaningSource,
    });
    const active = (await cardsIn(ctx, deckId)).filter((c) => !c.archivedAt).map((c) => c.term);
    expect(active).toEqual([before.term]);
    expect(await diagnosisOf(cardId)).toMatchObject({ acceptedAt: null, fix: null });

    // Put back at the diagnosed revision, so trying again is not refused as a change.
    expect((await getCard(ctx, cardId)).revision).toBe(before.revision);
    await acceptFix(
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
    expect(await getCard(ctx, cardId)).toMatchObject({ term: "Kus sa elad?" });
  });

  it("puts back the cue it changed when the fix cannot be recorded", async () => {
    const { ctx, cardOf, diagnosisOf } = await setup(["several_answers"]);
    const cardId = cardOf("several_answers");
    const row = await diagnosisOf(cardId);
    const before = await getCard(ctx, cardId);
    const failing = failingAcceptRecord(db);
    await expect(
      acceptFix(
        { ...ctx, db: failing.db },
        row.id,
        { cause: "several_answers", text: "tall (of a person)" },
        null,
      ),
    ).rejects.toThrow("D1 went away");
    expect(failing.failed()).toBe(true);
    expect(await getCard(ctx, cardId)).toMatchObject({
      term: before.term,
      meaning: before.meaning,
      meaningSource: before.meaningSource,
      revision: before.revision,
    });
    expect(await diagnosisOf(cardId)).toMatchObject({ acceptedAt: null, fix: null });
    await acceptFix(ctx, row.id, { cause: "several_answers", text: "tall (of a person)" }, null);
    expect(await getCard(ctx, cardId)).toMatchObject({ meaning: "tall (of a person)" });
  });

  it("releases the claim when the rollback fails in the same outage", async () => {
    const { ctx, cardOf, diagnosisOf } = await setup(["several_answers"]);
    const cardId = cardOf("several_answers");
    const row = await diagnosisOf(cardId);
    const failing = failingAcceptRecord(db, { outage: true });
    await expect(
      acceptFix(
        { ...ctx, db: failing.db },
        row.id,
        { cause: "several_answers", text: "tall (of a person)" },
        null,
      ),
    ).rejects.toThrow("D1 went away");
    expect(await diagnosisOf(cardId)).toMatchObject({ acceptedAt: null, fix: null });
    await expect(dismissDiagnosis(ctx, row.id)).resolves.toBeUndefined();
  });

  it("takes over a claim an accept left when it died, and only once it is stale", async () => {
    const { ctx, cardOf, diagnosisOf } = await setup(["no_anchor", "several_answers"]);
    const hook = await diagnosisOf(cardOf("no_anchor"));
    const cue = await diagnosisOf(cardOf("several_answers"));
    const claim = (id: string, at: Date) =>
      db
        .update(schema.cardDiagnoses)
        .set({ acceptedAt: at })
        .where(eq(schema.cardDiagnoses.id, id));

    await claim(hook.id, new Date(Date.now() - 60_000));
    await expect(
      acceptFix(ctx, hook.id, { cause: "no_anchor", hook: "Curvy pumpkin" }, null),
    ).rejects.toMatchObject({ code: "conflict" });
    await expect(undoFix(ctx, hook.id)).rejects.toMatchObject({ code: "conflict" });
    await expect(dismissDiagnosis(ctx, hook.id)).rejects.toMatchObject({ code: "conflict" });

    const died = new Date(Date.now() - FIX_CLAIM_MS - 60_000);
    await claim(hook.id, died);
    await acceptFix(ctx, hook.id, { cause: "no_anchor", hook: "Curvy pumpkin" }, null);
    expect(await diagnosisOf(hook.cardId)).toMatchObject({
      acceptedAt: expect.any(Date),
      fix: { edited: { after: { hook: "Curvy pumpkin" } } },
    });

    await claim(cue.id, died);
    await undoFix(ctx, cue.id);
    expect(await diagnosisOf(cue.cardId)).toMatchObject({ acceptedAt: null, fix: null });
    await claim(cue.id, died);
    await dismissDiagnosis(ctx, cue.id);
    expect(await diagnosisOf(cue.cardId)).toMatchObject({
      acceptedAt: null,
      dismissedAt: expect.any(Date),
    });
  });

  it("refuses to undo a hook edited since, and keeps the edit", async () => {
    const { ctx, cardOf, diagnosisOf } = await setup(["no_anchor"]);
    const cardId = cardOf("no_anchor");
    const row = await diagnosisOf(cardId);
    await acceptFix(ctx, row.id, { cause: "no_anchor", hook: "Curvy pumpkin" }, null);
    await updateCard(ctx, cardId, { hook: "A pumpkin with curves" });
    await expect(undoFix(ctx, row.id)).rejects.toMatchObject({
      code: "conflict",
      message: expect.stringContaining("edited after the fix"),
    });
    expect(await getCard(ctx, cardId)).toMatchObject({
      hook: "A pumpkin with curves",
      hookSource: "manual",
    });
    expect(await diagnosisOf(cardId)).toMatchObject({ acceptedAt: expect.any(Date) });
  });

  it("refuses to undo a cue whose meaning was edited since", async () => {
    const { ctx, cardOf, diagnosisOf } = await setup(["several_answers"]);
    const cardId = cardOf("several_answers");
    const row = await diagnosisOf(cardId);
    await acceptFix(ctx, row.id, { cause: "several_answers", text: "tall (of a person)" }, null);
    await updateCard(ctx, cardId, { meaning: "tall (of people)" });
    await expect(undoFix(ctx, row.id)).rejects.toMatchObject({ code: "conflict" });
    expect(await getCard(ctx, cardId)).toMatchObject({ meaning: "tall (of people)" });
  });

  it("refuses to undo a split edited since, and carries no diagnosis over", async () => {
    const { ctx, deckId, cardOf, diagnosisOf } = await setup(["two_things"]);
    const cardId = cardOf("two_things");
    const row = await diagnosisOf(cardId);
    const split = {
      cause: "two_things" as const,
      cards: [
        { term: "Kus sa elad?", meaning: "Where do you live?" },
        { term: "Ma elan Tallinnas.", meaning: "I live in Tallinn." },
      ] as [{ term: string; meaning: string }, { term: string; meaning: string }],
    };
    const out = await acceptFix(ctx, row.id, split, null);
    const added = out.added[0]?.id ?? "";

    // Enrichment filling the pronunciation the split cleared is not the learner's edit.
    await db
      .update(schema.cards)
      .set({ pronunciation: "kus sa ˈelad", pronunciationSource: "ai" })
      .where(eq(schema.cards.id, cardId));
    await updateCard(ctx, added, { meaning: "I live in Tallinn now." });
    await expect(undoFix(ctx, row.id)).rejects.toMatchObject({ code: "conflict" });
    expect(await getCard(ctx, added)).toMatchObject({
      meaning: "I live in Tallinn now.",
      archivedAt: null,
    });
    expect(await getCard(ctx, cardId)).toMatchObject({ term: "Kus sa elad?" });
    const rows = await db
      .select()
      .from(schema.cardDiagnoses)
      .where(eq(schema.cardDiagnoses.cardId, cardId));
    expect(rows).toHaveLength(1);

    // Put back as the fix wrote it, the split undoes whole.
    await updateCard(ctx, added, { meaning: "I live in Tallinn." });
    await undoFix(ctx, row.id);
    expect((await getCard(ctx, cardId)).term).toBe("Kus sa elad? Ma elan Tallinnas.");
    const archived = (await cardsIn(ctx, deckId)).filter((c) => c.archivedAt).map((c) => c.id);
    expect(archived).toEqual([added]);
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

  it("never offers a dismissed fix again, audits it, and Undo lets it be accepted", async () => {
    const events: unknown[] = [];
    const { ctx: own, cardOf, diagnosisOf } = await setup(["several_answers"]);
    const ctx = { ...own, analytics: { writeDataPoint: (point: unknown) => events.push(point) } };
    const row = await diagnosisOf(cardOf("several_answers"));
    await dismissDiagnosis(ctx, row.id);
    await dismissDiagnosis(ctx, row.id);
    expect(await offersIn(ctx)).toEqual(new Map());
    expect(await diagnosisOf(row.cardId)).toMatchObject({
      dismissedAt: expect.any(Date),
      offeredAt: expect.any(Date),
    });
    await expect(
      acceptFix(ctx, row.id, { cause: "several_answers", text: "tall (of a person)" }, null),
    ).rejects.toMatchObject({ code: "conflict" });

    await undoDismissal(ctx, row.id);
    await undoDismissal(ctx, row.id);
    expect(await diagnosisOf(row.cardId)).toMatchObject({ dismissedAt: null });
    // Undo takes the answer back, but review has shown this fix once already.
    expect(await offersIn(ctx)).toEqual(new Map());
    await acceptFix(ctx, row.id, { cause: "several_answers", text: "tall (of a person)" }, null);

    const audit = await db
      .select()
      .from(schema.auditLog)
      .where(and(eq(schema.auditLog.userId, ctx.userId), eq(schema.auditLog.entity, "diagnosis")));
    expect(audit.map((entry) => entry.action)).toEqual(["dismiss", "undo_dismiss", "accept"]);
    expect(audit[0]).toMatchObject({ actor: "user", entityId: row.id });
    expect(events).toEqual([
      { indexes: ["diagnosis_dismissed"], blobs: ["several_answers"], doubles: [1] },
      { indexes: ["diagnosis_dismiss_undone"], blobs: ["several_answers"], doubles: [1] },
    ]);
  });

  it("refuses to dismiss no clear reason, a fix on the card, or a diagnosis still running", async () => {
    const { ctx, cardOf, diagnosisOf } = await setup(["unclear", "several_answers"]);
    const unclear = await diagnosisOf(cardOf("unclear"));
    await expect(dismissDiagnosis(ctx, unclear.id)).rejects.toMatchObject({ code: "invalid" });

    const row = await diagnosisOf(cardOf("several_answers"));
    await acceptFix(ctx, row.id, { cause: "several_answers", text: "tall (of a person)" }, null);
    await expect(dismissDiagnosis(ctx, row.id)).rejects.toMatchObject({ code: "conflict" });

    await db
      .update(schema.cardDiagnoses)
      .set({ status: "working", acceptedAt: null })
      .where(eq(schema.cardDiagnoses.id, row.id));
    await expect(dismissDiagnosis(ctx, row.id)).rejects.toMatchObject({ code: "conflict" });
    await expect(dismissDiagnosis(ctx, "someone-else")).rejects.toMatchObject({
      code: "not_found",
    });
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
    expect((await reviewOffers(ctx, [card], new Set([cardId]), today())).size).toBe(1);

    // Offered after them, it has not slipped since.
    await db
      .update(schema.cardDiagnoses)
      .set({ offeredAt: new Date() })
      .where(eq(schema.cardDiagnoses.id, row.id));
    expect((await reviewOffers(ctx, [card], new Set([cardId]), today())).size).toBe(0);
  });
});
