import { inArray, lt } from "@lymi/core/db";
import { type Db, schema } from "../db";

const ROWS_PER_RUN = 500;

/**
 * Deleting a session unbinds its OAuth access tokens, which then skip the session check, so a
 * session outlives its expiry by longer than any access token lives (an hour). docs/data-model.md.
 */
const SESSION_GRACE_MS = 24 * 60 * 60 * 1000;

/** Deletes expired sessions and verification values, a bounded batch of each. Run from the cron trigger. */
export async function purgeExpiredAuthRows(db: Db, now = new Date()) {
  const sessions = await db
    .delete(schema.session)
    .where(
      inArray(
        schema.session.id,
        db
          .select({ id: schema.session.id })
          .from(schema.session)
          .where(lt(schema.session.expiresAt, new Date(now.getTime() - SESSION_GRACE_MS)))
          .limit(ROWS_PER_RUN),
      ),
    )
    .returning({ id: schema.session.id });
  const verifications = await db
    .delete(schema.verification)
    .where(
      inArray(
        schema.verification.id,
        db
          .select({ id: schema.verification.id })
          .from(schema.verification)
          .where(lt(schema.verification.expiresAt, now))
          .limit(ROWS_PER_RUN),
      ),
    )
    .returning({ id: schema.verification.id });
  return { sessions: sessions.length, verifications: verifications.length };
}
