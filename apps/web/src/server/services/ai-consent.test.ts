import { AI_CONSENT_REQUIRED } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { TextProvider } from "../ai";
import { type Db, schema } from "../db";
import type { LessonReader } from "../lessons/reader";
import { aiAllowed, aiAllowedForOwner, aiWithdrawn, updateAiConsent } from "./ai-consent";
import type { AnalyticsWriter } from "./analytics";
import { addCards, requestEnrichment } from "./cards";
import type { ServiceContext } from "./context";
import { chooseDeck } from "./deck-choice";
import { createDeck } from "./decks";
import type { EnrichmentQueue } from "./enrichment";
import { hintDraftFor } from "./hint-draft";
import { assertCanCheckAnswers, assertCanReadLessons } from "./lessons";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;
beforeAll(async () => {
  ({ db, dispose } = await testDb());
}, 60_000);
afterAll(async () => {
  await dispose();
});

const queue = (): EnrichmentQueue & { create: ReturnType<typeof vi.fn> } => ({
  create: vi.fn(async () => undefined),
});
const model = () => {
  const complete = vi.fn(async () => ({ language: "et", hint: "a hint" }));
  return { provider: { provider: "openai", model: "test", complete } as TextProvider, complete };
};
const reader: LessonReader = {
  model: "test",
  stream: async () => {
    throw new Error("A refused read never reaches the model");
  },
};
const phone = (ctx: ServiceContext): ServiceContext => ({ ...ctx, fromPhone: true });
const answer = (ctx: ServiceContext, allowed: boolean, at = Date.now()) =>
  updateAiConsent(ctx, { allowed, version: 1, updated_at: at });
const refused = { code: "forbidden", reason: AI_CONSENT_REQUIRED };

describe("aiAllowed", () => {
  it("waits for a yes on the phone and for a no everywhere else", () => {
    expect(aiAllowed(null, true)).toBe(false);
    expect(aiAllowed(null, false)).toBe(true);
    expect(aiAllowed(true, true)).toBe(true);
    expect(aiAllowed(false, false)).toBe(false);
    expect(aiAllowed(false, true)).toBe(false);
  });
});

describe("updateAiConsent", () => {
  it("keeps the newest answer, audits each one and counts each change once", async () => {
    const capture = vi.fn();
    const ctx = {
      ...(await learner(db, "ai-consent-1", "Kateryna")),
      analytics: { writeDataPoint: () => {}, capture } as AnalyticsWriter,
    };
    const now = Date.now();
    expect((await answer(ctx, true, now - 2000)).aiConsent).toBe(true);
    expect((await answer(ctx, false, now - 3000)).aiConsent).toBe(true);
    expect((await answer(ctx, false, now)).aiConsent).toBe(false);
    await updateAiConsent(ctx, { allowed: false, version: 1, updated_at: now + 1, place: "hint" });
    expect(capture.mock.calls.map(([event]) => event.name)).toEqual([
      "ai_consent_granted",
      "ai_consent_withdrawn",
    ]);
    const audits = await db
      .select({ action: schema.auditLog.action })
      .from(schema.auditLog)
      .where(eq(schema.auditLog.userId, ctx.userId));
    // The stale answer left no row; the repeated no did, since it is a newer answer.
    expect(audits.filter((row) => row.action === "ai.consent")).toHaveLength(3);
    expect(await aiWithdrawn(db, ctx.userId)).toBe(true);
  });

  it("is the learner's alone", async () => {
    const ctx = await learner(db, "ai-consent-2", "Kateryna");
    await expect(answer({ ...ctx, actor: "api" }, true)).rejects.toMatchObject({
      code: "forbidden",
    });
  });

  it("counts a first no as declined", async () => {
    const capture = vi.fn();
    const ctx = {
      ...(await learner(db, "ai-consent-3", "Kateryna")),
      analytics: { writeDataPoint: () => {}, capture } as AnalyticsWriter,
    };
    await updateAiConsent(ctx, {
      allowed: false,
      version: 1,
      updated_at: Date.now(),
      place: "add",
    });
    expect(capture).toHaveBeenCalledWith({ name: "ai_consent_declined", place: "add" });
  });
});

describe("enrichment", () => {
  it("saves a phone's card as typed until the learner allows AI", async () => {
    const ctx = await learner(db, "ai-consent-enrich-1", "Kateryna");
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    const runs = queue();
    const [waiting] = await addCards(phone(ctx), [{ deckId: deck.id, term: "kohvik" }], runs);
    expect(waiting?.status === "added" && waiting.card.enrichmentStatus).toBeNull();
    expect(runs.create).not.toHaveBeenCalled();
    if (waiting?.status !== "added") throw new Error("not added");
    await expect(requestEnrichment(phone(ctx), waiting.card.id, runs)).rejects.toMatchObject(
      refused,
    );

    await answer(ctx, true);
    const [allowed] = await addCards(phone(ctx), [{ deckId: deck.id, term: "raamat" }], runs);
    expect(allowed?.status === "added" && allowed.card.enrichmentStatus).toBe("working");
    expect(runs.create).toHaveBeenCalledOnce();
  });

  it("carries on for the web until the learner says no, then stops there too", async () => {
    const ctx = await learner(db, "ai-consent-enrich-2", "Kateryna");
    const deck = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    const runs = queue();
    const [unanswered] = await addCards(ctx, [{ deckId: deck.id, term: "kohvik" }], runs);
    expect(unanswered?.status === "added" && unanswered.card.enrichmentStatus).toBe("working");

    await answer(ctx, false);
    const [declined] = await addCards(ctx, [{ deckId: deck.id, term: "raamat" }], runs);
    expect(declined?.status === "added" && declined.card.enrichmentStatus).toBeNull();
    const [asked] = await addCards(
      { ...ctx, actor: "api" },
      [{ deckId: deck.id, term: "laud", enrich: true }],
      runs,
    );
    expect(asked?.status === "added" && asked.card.enrichmentStatus).toBeNull();
    expect(runs.create).toHaveBeenCalledOnce();
  });
});

describe("other AI requests", () => {
  it("drafts no hint, chooses no deck and reads no lesson from a phone without a yes", async () => {
    const ctx = await learner(db, "ai-consent-other-1", "Kateryna");
    const eesti = await createDeck(ctx, { name: "Eesti", defaultLanguage: "et" });
    await createDeck(ctx, { name: "Idioms", defaultLanguage: "en" });
    const [added] = await addCards(ctx, [
      { deckId: eesti.id, term: "kurb", meaning: "sad", language: "et" },
    ]);
    if (added?.status !== "added") throw new Error("not added");
    const { provider, complete } = model();

    await expect(hintDraftFor(phone(ctx), added.card.id, provider)).rejects.toMatchObject(refused);
    expect(await chooseDeck(phone(ctx), { term: "rahulik" }, provider)).toEqual({
      deckId: null,
      language: null,
    });
    await expect(
      assertCanReadLessons(phone(ctx), { reader, operators: new Set() }),
    ).rejects.toMatchObject(refused);
    await expect(assertCanCheckAnswers(phone(ctx), new Set())).rejects.toMatchObject(refused);
    expect(complete).not.toHaveBeenCalled();

    await answer(ctx, true);
    expect(await chooseDeck(phone(ctx), { term: "rahulik" }, provider)).toMatchObject({
      language: "et",
    });
    expect(complete).toHaveBeenCalledOnce();
  });
});

describe("aiAllowedForOwner", () => {
  it("follows the owner's choice, waiting for a yes only on the owner's own phone", async () => {
    const owner = await learner(db, "ai-consent-owner", "Kateryna");
    const member = await learner(db, "ai-consent-member", "Mari");
    expect(await aiAllowedForOwner(phone(owner), owner.userId)).toBe(false);
    expect(await aiAllowedForOwner(owner, owner.userId)).toBe(true);
    expect(await aiAllowedForOwner(phone(member), owner.userId)).toBe(true);

    await answer(owner, false);
    expect(await aiAllowedForOwner(phone(member), owner.userId)).toBe(false);
    expect(await aiAllowedForOwner({ ...owner, actor: "system" }, owner.userId)).toBe(false);
  });
});
