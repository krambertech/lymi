import type { SettingsPatch } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { schema } from "../db";
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
    appLanguage: null,
    meaningLanguage: "en",
    dailyGoal: 50,
    dailyGoalChosenAt: null,
    reviewTimezone: null,
    reviewTimezoneMode: "automatic",
    reviewTimezoneUpdatedAt: null,
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
  if (patch.dailyGoal !== undefined) await applyGoalToToday(ctx, patch.dailyGoal);
  return getSettings(ctx);
}
