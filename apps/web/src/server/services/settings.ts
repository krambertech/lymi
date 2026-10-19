import {
  type AnalyticsConsentInput,
  type OnboardingInput,
  type SettingsPatch,
  STARTING_DAILY_GOAL,
} from "@lymi/core";
import { and, eq, isNull, lt, or } from "@lymi/core/db";
import { type Db, schema } from "../db";
import { track } from "./analytics";
import { auditStatementWhen } from "./audit";
import { type ServiceContext, ServiceError } from "./context";
import { applyGoalToToday } from "./review-days";

type UserSettings = typeof schema.userSettings.$inferSelect;

/** The learner's settings; reading never writes, so a read-only caller stays read-only. */
export async function getSettings({ db, userId }: ServiceContext): Promise<UserSettings> {
  const [row] = await db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId));
  return row ?? defaultSettings(userId);
}

/** Mirrors the column defaults in the schema; `settings.test.ts` compares them with a stored row. */
export function defaultSettings(userId: string): UserSettings {
  const now = new Date();
  return {
    userId,
    analyticsConsent: null,
    analyticsConsentUpdatedAt: null,
    appLanguage: null,
    meaningLanguage: "en",
    dailyGoal: 50,
    dailyGoalChosenAt: null,
    reviewTimezone: null,
    reviewTimezoneMode: "automatic",
    reviewTimezoneUpdatedAt: null,
    onboardedAt: null,
    learningKind: null,
    learningLanguage: null,
    createdAt: now,
    updatedAt: now,
  };
}

/** Writers call this before an update, so the update has a row to land on. */
export async function ensureSettings({ db, userId }: ServiceContext): Promise<void> {
  await db.insert(schema.userSettings).values({ userId }).onConflictDoNothing();
}

/** The app language also sets the meaning language; nothing else writes it. ADR 0013. */
export async function updateSettings(ctx: ServiceContext, patch: SettingsPatch) {
  // The goal is the learner's own commitment; a write grant covers cards.
  if (patch.dailyGoal !== undefined && ctx.actor !== "user") {
    throw new ServiceError("forbidden", "Only the learner can change the daily goal.");
  }
  if (patch.appLanguage === undefined && patch.dailyGoal === undefined) return getSettings(ctx);
  const before = await getSettings(ctx);
  await ensureSettings(ctx);
  await ctx.db
    .update(schema.userSettings)
    .set({
      ...(patch.appLanguage !== undefined && {
        appLanguage: patch.appLanguage,
        meaningLanguage: patch.appLanguage,
      }),
      ...(patch.dailyGoal !== undefined && {
        dailyGoal: patch.dailyGoal,
        dailyGoalChosenAt: new Date(),
      }),
      updatedAt: new Date(),
    })
    .where(eq(schema.userSettings.userId, ctx.userId));
  if (patch.dailyGoal !== undefined) {
    await applyGoalToToday(ctx, patch.dailyGoal);
    if (!before.dailyGoalChosenAt || before.dailyGoal !== patch.dailyGoal)
      track(ctx.analytics, {
        name: "daily_goal_set",
        value: patch.dailyGoal,
        is_change: before.dailyGoalChosenAt !== null,
      });
  }
  return getSettings(ctx);
}

export async function updateAnalyticsConsent(ctx: ServiceContext, choice: AnalyticsConsentInput) {
  if (ctx.actor !== "user")
    throw new ServiceError("forbidden", "Only the learner can change analytics consent.");
  if (choice.updated_at > Date.now() + 60_000)
    throw new ServiceError("invalid", "This privacy preference has a future date.");
  const before = await getSettings(ctx);
  if (
    before.analyticsConsentUpdatedAt &&
    choice.updated_at <= before.analyticsConsentUpdatedAt.getTime()
  )
    return before;
  await ensureSettings(ctx);
  const eligible = and(
    eq(schema.userSettings.userId, ctx.userId),
    or(
      isNull(schema.userSettings.analyticsConsentUpdatedAt),
      lt(schema.userSettings.analyticsConsentUpdatedAt, new Date(choice.updated_at)),
    ),
  )!;
  await ctx.db.batch([
    auditStatementWhen(
      ctx,
      {
        entity: "account",
        action: "analytics.consent",
        id: ctx.userId,
        details: { allowed: choice.allowed, version: choice.version },
      },
      schema.userSettings,
      eligible,
    ),
    ctx.db
      .update(schema.userSettings)
      .set({
        analyticsConsent: choice.allowed,
        analyticsConsentUpdatedAt: new Date(choice.updated_at),
        updatedAt: new Date(),
      })
      .where(eligible),
  ]);
  return getSettings(ctx);
}

/**
 * Getting set up, finished or skipped. A goal the learner picked counts as chosen; a skip starts
 * them on the lighter goal unless they had already chosen one. docs/design/onboarding.md.
 */
export async function finishOnboarding(ctx: ServiceContext, input: OnboardingInput) {
  if (ctx.actor !== "user") {
    throw new ServiceError("forbidden", "Only the learner can get set up.");
  }
  const before = await getSettings(ctx);
  // Once set up, the goal changes only in the streak modal, so a second pass changes nothing.
  if (before.onboardedAt) return before;
  // Today sets up only a new account; one already reviewing keeps its goal and stays out of the count.
  if (input.from === "today" && !(await awaitsWelcome(ctx.db, ctx.userId))) return before;
  const dailyGoal =
    input.dailyGoal ?? (before.dailyGoalChosenAt ? before.dailyGoal : STARTING_DAILY_GOAL);
  const now = new Date();
  await ensureSettings(ctx);
  const eligible = and(
    eq(schema.userSettings.userId, ctx.userId),
    isNull(schema.userSettings.onboardedAt),
  )!;
  const [, updated] = await ctx.db.batch([
    auditStatementWhen(
      ctx,
      { entity: "account", action: "onboarding.finish", id: ctx.userId },
      schema.userSettings,
      eligible,
    ),
    ctx.db
      .update(schema.userSettings)
      .set({
        onboardedAt: now,
        learningKind: input.learningKind,
        learningLanguage: input.learningLanguage,
        dailyGoal,
        ...(input.dailyGoal !== null && { dailyGoalChosenAt: now }),
        updatedAt: now,
      })
      .where(eligible)
      .returning(),
  ]);
  if (!updated.length) return getSettings(ctx);
  if (input.dailyGoal !== null && (!before.dailyGoalChosenAt || before.dailyGoal !== dailyGoal))
    track(ctx.analytics, {
      name: "daily_goal_set",
      value: dailyGoal,
      is_change: before.dailyGoalChosenAt !== null,
    });
  if (input.from !== "today")
    track(ctx.analytics, {
      name: "welcome_step_finished",
      step_name: "setup",
      skipped: input.learningKind === null && input.dailyGoal === null,
    });
  if (dailyGoal !== before.dailyGoal) await applyGoalToToday(ctx, dailyGoal);
  // Only the shortcut from a shared or published deck chooses a goal without saying what it is for.
  const kind =
    input.from === "today"
      ? "today"
      : (input.learningKind ?? (input.dailyGoal === null ? "skipped" : "joined"));
  track(ctx.analytics, { name: "onboarding_finished", kind });
  return getSettings(ctx);
}

/**
 * Whether an account that has just joined or added a deck still asks for its daily goal: it has
 * not got set up and has never reviewed. docs/design/onboarding.md.
 */
export async function awaitsWelcome(db: Db, userId: string): Promise<boolean> {
  const [settings] = await db
    .select({ onboardedAt: schema.userSettings.onboardedAt })
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId));
  if (settings?.onboardedAt) return false;
  const [reviewed] = await db
    .select({ id: schema.reviews.id })
    .from(schema.reviews)
    .where(eq(schema.reviews.userId, userId))
    .limit(1);
  return !reviewed;
}
