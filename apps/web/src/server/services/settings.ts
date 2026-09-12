import type { SettingsPatch } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { schema } from "../db";
import type { ServiceContext } from "./context";

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
  await getSettings(ctx);
  if (patch.appLanguage === undefined) return getSettings(ctx);
  await ctx.db
    .update(schema.userSettings)
    .set({
      appLanguage: patch.appLanguage,
      meaningLanguage: patch.appLanguage,
      updatedAt: new Date(),
    })
    .where(eq(schema.userSettings.userId, ctx.userId));
  return getSettings(ctx);
}
