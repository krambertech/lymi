import { CardInput } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { type Db, schema } from "../db";
import type { AnalyticsEvent } from "./analytics";
import { analyticsContext, analyticsContextFor } from "./analytics-context";
import { addCards } from "./cards";
import type { ServiceContext } from "./context";
import { createDeck } from "./decks";
import { gradeCard } from "./review";
import {
  awaitsWelcome,
  ensureSettings,
  finishOnboarding,
  getSettings,
  updateAnalyticsConsent,
  updateSettings,
} from "./settings";
import { learner, testDb } from "./test-db";

let db: Db;
let dispose: () => Promise<void>;
let kateryna: ServiceContext;

beforeAll(async () => {
  ({ db, dispose } = await testDb());
  kateryna = await learner(db, "kateryna", "Kateryna");
}, 60_000);

afterAll(async () => {
  await dispose();
});

describe("daily goal", () => {
  it("starts at 50 and changes when the learner sets it", async () => {
    expect((await getSettings(kateryna)).dailyGoal).toBe(50);
    expect((await updateSettings(kateryna, { dailyGoal: 50 })).dailyGoal).toBe(50);
  });

  it("refuses an integration, whatever its scope", async () => {
    for (const actor of ["api", "mcp"] as const) {
      await expect(updateSettings({ ...kateryna, actor }, { dailyGoal: 10 })).rejects.toMatchObject(
        {
          code: "forbidden",
        },
      );
    }
    expect((await getSettings(kateryna)).dailyGoal).toBe(50);
  });

  it("still lets an integration change the app language", async () => {
    const updated = await updateSettings({ ...kateryna, actor: "mcp" }, { appLanguage: "uk" });

    expect(updated).toMatchObject({ appLanguage: "uk", dailyGoal: 50 });
  });
});

describe("reading settings", () => {
  it("writes nothing, and the defaults it returns match a stored row", async () => {
    const reader = await learner(db, "reader", "Reader");
    const rows = () =>
      db.select().from(schema.userSettings).where(eq(schema.userSettings.userId, "reader"));

    const read = await getSettings({ ...reader, actor: "mcp" });
    expect(await rows()).toEqual([]);

    await ensureSettings(reader);
    const [stored] = await rows();
    const { createdAt: _createdAt, updatedAt: _updatedAt, ...defaults } = read;
    expect(stored).toMatchObject(defaults);
  });
});

describe("getting set up", () => {
  const skip = { learningKind: null, learningLanguage: null, dailyGoal: null };

  it("records the answers and counts the goal as chosen", async () => {
    const who = await learner(db, "onboarded", "Onboarded");
    const done = await finishOnboarding(who, {
      learningKind: "language",
      learningLanguage: "es",
      dailyGoal: 10,
    });
    expect(done).toMatchObject({ learningKind: "language", learningLanguage: "es", dailyGoal: 10 });
    expect(done.onboardedAt).toBeInstanceOf(Date);
    expect(done.dailyGoalChosenAt).toBeInstanceOf(Date);
  });

  it("starts a skip on the lighter goal without calling it chosen", async () => {
    const who = await learner(db, "skipper", "Skipper");
    const done = await finishOnboarding(who, skip);
    expect(done).toMatchObject({ dailyGoal: 25, dailyGoalChosenAt: null, learningKind: null });
    expect(done.onboardedAt).toBeInstanceOf(Date);
  });

  it("keeps a goal the learner had already chosen when they skip", async () => {
    const who = await learner(db, "chooser", "Chooser");
    await updateSettings(who, { dailyGoal: 100 });
    expect((await finishOnboarding(who, skip)).dailyGoal).toBe(100);
  });

  it("changes nothing once the learner is set up", async () => {
    const who = await learner(db, "twice", "Twice");
    const first = await finishOnboarding(who, {
      learningKind: "language",
      learningLanguage: "it",
      dailyGoal: 10,
    });
    const again = await finishOnboarding(who, skip);
    expect(again).toMatchObject({
      dailyGoal: 10,
      learningKind: "language",
      learningLanguage: "it",
    });
    expect(again.onboardedAt).toEqual(first.onboardedAt);
  });

  it("counts a goal chosen without a subject as joined, not skipped", async () => {
    const who = await learner(db, "joiner", "Joiner");
    const events: AnalyticsEvent[] = [];
    const done = await finishOnboarding(
      { ...who, analytics: { writeDataPoint: () => {}, capture: (event) => events.push(event) } },
      { ...skip, dailyGoal: 10 },
    );
    expect(events).toContainEqual({ name: "onboarding_finished", kind: "joined" });
    expect(events).toContainEqual({
      name: "welcome_step_finished",
      step_name: "setup",
      skipped: false,
    });
    expect(done).toMatchObject({ dailyGoal: 10, learningKind: null });
    expect(done.dailyGoalChosenAt).toBeInstanceOf(Date);
  });

  it("refuses an integration", async () => {
    const who = await learner(db, "keyholder", "Keyholder");
    await expect(finishOnboarding({ ...who, actor: "api" }, skip)).rejects.toMatchObject({
      code: "forbidden",
    });
    expect((await getSettings(who)).onboardedAt).toBeNull();
  });
});

describe("awaiting Welcome", () => {
  it("holds for a new account, and ends once it is set up", async () => {
    const who = await learner(db, "newcomer", "Newcomer");
    expect(await awaitsWelcome(db, who.userId)).toBe(true);
    await finishOnboarding(who, { learningKind: null, learningLanguage: null, dailyGoal: null });
    expect(await awaitsWelcome(db, who.userId)).toBe(false);
  });

  it("ends with the first review, set up or not", async () => {
    const who = await learner(db, "studied", "Studied");
    const deck = await createDeck(who, { name: "Estonian", defaultLanguage: "et" });
    const [outcome] = await addCards(who, [CardInput.parse({ deckId: deck.id, term: "tere" })]);
    if (outcome?.status !== "added") throw new Error("not added");
    await gradeCard(who, { cardId: outcome.card.id, direction: "recognition", rating: 3 });
    expect(await awaitsWelcome(db, who.userId)).toBe(false);
  });
});

describe("analytics consent", () => {
  it("requires the learner and preserves the newest choice under concurrent requests", async () => {
    const ctx = await learner(db, "consent-owner", "Learner");
    const now = Date.now();
    await expect(
      updateAnalyticsConsent(
        { ...ctx, actor: "mcp" },
        { allowed: true, version: 1, updated_at: now },
      ),
    ).rejects.toMatchObject({ code: "forbidden" });
    await Promise.all([
      updateAnalyticsConsent(ctx, { allowed: true, version: 1, updated_at: now - 1000 }),
      updateAnalyticsConsent(ctx, { allowed: false, version: 1, updated_at: now }),
    ]);
    expect(await getSettings(ctx)).toMatchObject({
      analyticsConsent: false,
      analyticsConsentUpdatedAt: new Date(now),
    });
    await updateAnalyticsConsent(ctx, { allowed: true, version: 1, updated_at: now - 500 });
    expect((await analyticsContext(db, ctx.userId)).allowed).toBe(false);
    await updateAnalyticsConsent(ctx, { allowed: true, version: 1, updated_at: now + 1 });
    expect((await analyticsContext(db, ctx.userId)).allowed).toBe(true);
    expect((await analyticsContext(db, ctx.userId, null)).allowed).toBe(false);
    expect(
      (await analyticsContext(db, ctx.userId, { allowed: false, version: 1, updated_at: now + 2 }))
        .allowed,
    ).toBe(false);
  });

  it("holds browsers to their consent cookie and native apps to the account choice", async () => {
    const ctx = await learner(db, "consent-phone", "Learner");
    await updateAnalyticsConsent(ctx, { allowed: true, version: 1, updated_at: Date.now() });
    const session = { cookie: "lymi-session=opaque" };
    const phone = new Headers(session);
    const browser = new Headers({ ...session, "sec-fetch-site": "same-origin" });
    const posted = new Headers({ ...session, origin: "https://my.lymi.app" });
    expect((await analyticsContextFor(db, ctx.userId, phone)()).allowed).toBe(true);
    expect((await analyticsContextFor(db, ctx.userId, browser)()).allowed).toBe(false);
    expect((await analyticsContextFor(db, ctx.userId, posted)()).allowed).toBe(false);
  });
});
