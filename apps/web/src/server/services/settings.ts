import type { SettingsPatch } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { schema } from "../db";
import { type ServiceContext, ServiceError } from "./context";
import { applyGoalToToday } from "./review-days";

/** The learner's settings, created with defaults on first read. */
export async function getSettings({ db, userId }: ServiceContext) {
  const [row] = await db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId));
  if (row) return row;
  await db.insert(schema.userSettings).values({ userId }).onConflictDoNothing();
  const [created] = await db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId));
  if (!created) throw new Error("user_settings insert did not land");
  return created;
}

/** The app language also sets the meaning language; nothing else writes it. ADR 0013. */
export async function updateSettings(ctx: ServiceContext, patch: SettingsPatch) {
  // The goal is the learner's own commitment; a write grant covers cards.
  if (patch.dailyGoal !== undefined && ctx.actor !== "user") {
    throw new ServiceError("forbidden", "Only the learner can change the daily goal.");
  }
  await getSettings(ctx);
  if (patch.appLanguage === undefined && patch.dailyGoal === undefined) return getSettings(ctx);
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
