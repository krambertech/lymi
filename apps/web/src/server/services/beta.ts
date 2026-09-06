import type { BetaSignupInput } from "@lymi/core";
import { newId } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { betaSignups } from "@lymi/core/schema";
import type { Db } from "../db";

/**
 * The private beta waiting list. This is the one write in Lymi that belongs to nobody:
 * there is no learner yet, so there is no ServiceContext and no audit row. Access is still
 * invitation only; being on this list only means the address will be told when there is room.
 */
export async function joinBeta(db: Db, input: BetaSignupInput): Promise<{ alreadyOn: boolean }> {
  // The Zod schema lower-cases and trims, so the unique index sees one form per person.
  const existing = await db
    .select({ id: betaSignups.id })
    .from(betaSignups)
    .where(eq(betaSignups.email, input.email))
    .limit(1);
  if (existing.length > 0) return { alreadyOn: true };

  await db.insert(betaSignups).values({
    id: newId(),
    email: input.email,
    source: input.source ?? "landing",
  });
  return { alreadyOn: false };
}
