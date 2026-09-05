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

export async function updateSettings(
  ctx: ServiceContext,
  patch: { meaningLanguage?: string | undefined },
) {
  await getSettings(ctx);
  await ctx.db
    .update(schema.userSettings)
    .set({ ...patch, updatedAt: new Date() })
    .where(eq(schema.userSettings.userId, ctx.userId));
  return getSettings(ctx);
}
