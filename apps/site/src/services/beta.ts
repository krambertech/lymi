import type { BetaSignupInput } from "@lymi/core";
import { newId } from "@lymi/core";
import { eq } from "@lymi/core/db";
import { betaSignups } from "@lymi/core/schema";
import type { Db } from "../db";

export class BetaSignupUnavailable extends Error {}

/**
 * This is the one Lymi write that belongs to nobody: there is no learner yet, so there is no
 * product ServiceContext or audit row. Joining the list creates no account and grants no access.
 */
export async function joinBeta(db: Db, input: BetaSignupInput): Promise<{ alreadyOn: boolean }> {
  try {
    const existing = await db
      .select({ id: betaSignups.id })
      .from(betaSignups)
      .where(eq(betaSignups.email, input.email))
      .limit(1);
    if (existing.length > 0) return { alreadyOn: true };

    await db
      .insert(betaSignups)
      .values({
        id: newId(),
        email: input.email,
        source: input.source ?? "landing",
      })
      .onConflictDoNothing({ target: betaSignups.email });
    return { alreadyOn: false };
  } catch (error) {
    // The database error diagnoses configuration without putting a visitor's address in logs.
    console.error(
      JSON.stringify({
        event: "beta_signup_failed",
        error: error instanceof Error ? error.message : String(error),
      }),
    );
    throw new BetaSignupUnavailable("The beta list is temporarily unavailable. Try again soon.");
  }
}
