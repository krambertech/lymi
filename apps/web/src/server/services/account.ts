import { eq } from "@lymi/core/db";
import { schema } from "../db";
import { audit } from "./audit";
import { type ServiceContext, ServiceError } from "./context";

/** Renames the learner. Only the learner can, since the name is how others see them in a shared deck. */
export async function renameLearner(ctx: ServiceContext, name: string) {
  if (ctx.actor !== "user") {
    throw new ServiceError("forbidden", "Only the learner can change their name, from the app.");
  }
  const [row] = await ctx.db
    .update(schema.user)
    .set({ name, updatedAt: new Date() })
    .where(eq(schema.user.id, ctx.userId))
    .returning({ id: schema.user.id, name: schema.user.name, email: schema.user.email });
  if (!row) throw new ServiceError("not_found", "No such learner.");
  await audit(ctx, { entity: "account", action: "rename", id: ctx.userId });
  return row;
}
