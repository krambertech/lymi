import { eq } from "@lymi/core/db";
import { schema } from "../db";
import { type ServiceContext, ServiceError } from "./context";

/**
 * Only first-party publishers may publish while the catalog is curated. The list is the
 * `PUBLISHER_EMAILS` variable; the publisher must also own the deck. ADR 0015.
 */
export async function assertPublisher(ctx: ServiceContext, publishers: Set<string>) {
  const [row] = await ctx.db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, ctx.userId));
  if (!row || !publishers.has(row.email.toLowerCase())) {
    throw new ServiceError("forbidden", "Only Lymi's publishers can publish a deck");
  }
}
