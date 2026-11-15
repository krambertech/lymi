import { and, eq, isNotNull, isNull, lte } from "@lymi/core/db";
import {
  type AppleClients,
  exchangeAppleCode,
  openAppleToken,
  revokeAppleToken,
  sealAppleToken,
} from "../apple-revoke";
import { type Db, schema } from "../db";
import { type AnalyticsWriter, track } from "./analytics";

type Reason = (typeof schema.APPLE_REVOCATION_REASONS)[number];
type Revocation = typeof schema.appleRevocations.$inferSelect;
export type AppleRevocationOutcome = "revoked" | "retrying" | "failed" | "skipped";

/** About a day and a half of retries before the grant is left on record as not revoked. */
export const APPLE_REVOKE_ATTEMPTS = 8;
const FIRST_RETRY_MS = 15 * 60 * 1000;
const LONGEST_RETRY_MS = 24 * 60 * 60 * 1000;
/** Apple's authorization code lasts five minutes, so a row still waiting on it after this is lost. */
const CODE_LOST_MS = 10 * 60 * 1000;
const EXCHANGE_PAUSES_MS = [1000, 3000];

export interface AppleRevocationDeps {
  clients: AppleClients | null;
  events?: AnalyticsWriter | undefined;
  fetcher?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

const backoff = (attempts: number) =>
  Math.min(FIRST_RETRY_MS * 2 ** (attempts - 1), LONGEST_RETRY_MS);

/** Counts and a fixed reason only: never the account, the token or Apple's reply. */
function report(
  events: AnalyticsWriter | undefined,
  outcome: AppleRevocationOutcome,
  attempt: number,
  reason?: Reason | undefined,
  status?: number | null,
) {
  console.log(
    JSON.stringify({
      job: "apple-revocation",
      outcome,
      attempt,
      reason,
      status: status ?? undefined,
    }),
  );
  track(events, {
    name: "apple_revocation_attempted",
    outcome,
    attempt,
    ...(reason ? { reason } : {}),
  });
}

/**
 * The row a delete writes, in its own batch, for an account that signs in with Apple, so the
 * grant is on record before the account goes. A fresh authorization code from the phone comes
 * first; otherwise the refresh token the web's Apple sign-in stored. Null for other accounts.
 */
export async function appleRevocationRow(
  db: Db,
  userId: string,
  clients: AppleClients | null,
  code: string | undefined,
  now: Date,
): Promise<typeof schema.appleRevocations.$inferInsert | null> {
  const accounts = await db
    .select({ refreshToken: schema.account.refreshToken })
    .from(schema.account)
    .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, "apple")));
  if (accounts.length === 0) return null;
  const base = { id: userId, createdAt: now };
  if (!clients) {
    return { ...base, status: "skipped", reason: "no_key", client: "app", settledAt: now };
  }
  if (code) return { ...base, status: "pending", client: "app" };
  const stored = accounts.find((row) => row.refreshToken)?.refreshToken;
  if (stored && clients.web) {
    return {
      ...base,
      status: "pending",
      client: "web",
      token: await sealAppleToken(clients.app, stored),
      nextAttemptAt: now,
    };
  }
  return { ...base, status: "skipped", reason: "no_token", client: "app", settledAt: now };
}

/** Records a skipped revocation, which the delete settled in its own batch. */
export function reportSkippedAppleRevocation(
  events: AnalyticsWriter | undefined,
  reason: Reason,
): void {
  report(events, "skipped", 0, reason);
}

async function settle(
  db: Db,
  row: Revocation,
  events: AnalyticsWriter | undefined,
  now: Date,
  change: Partial<typeof schema.appleRevocations.$inferInsert>,
  outcome: AppleRevocationOutcome,
  status?: number | null,
): Promise<AppleRevocationOutcome> {
  // Only the run that read this attempt writes it, so two runs never count one attempt twice.
  const written = await db
    .update(schema.appleRevocations)
    .set(change)
    .where(
      and(
        eq(schema.appleRevocations.id, row.id),
        eq(schema.appleRevocations.status, "pending"),
        eq(schema.appleRevocations.attempts, row.attempts),
      ),
    )
    .returning({ id: schema.appleRevocations.id });
  if (written.length === 0) return "retrying";
  report(events, outcome, change.attempts ?? row.attempts, change.reason ?? undefined, status);
  if (outcome === "failed") {
    console.error("A deleted account's Apple grant was not revoked", {
      reason: change.reason,
      attempts: change.attempts ?? row.attempts,
      settledAt: now.toISOString(),
    });
  }
  return outcome;
}

const failed = (now: Date, reason: Reason, attempts: number) => ({
  status: "failed" as const,
  reason,
  attempts,
  token: null,
  nextAttemptAt: null,
  settledAt: now,
});

async function attemptRevoke(
  db: Db,
  row: Revocation,
  token: string,
  deps: AppleRevocationDeps,
  now: Date,
): Promise<AppleRevocationOutcome> {
  const clients = deps.clients;
  const attempts = row.attempts + 1;
  const key = row.client === "web" ? clients?.web : clients?.app;
  const result = key
    ? await revokeAppleToken(key, token, deps.fetcher)
    : ({ ok: false, retry: true, status: null } as const);
  if (result.ok) {
    return settle(
      db,
      row,
      deps.events,
      now,
      {
        status: "revoked",
        reason: null,
        attempts,
        token: null,
        nextAttemptAt: null,
        settledAt: now,
      },
      "revoked",
    );
  }
  if (attempts >= APPLE_REVOKE_ATTEMPTS || !clients) {
    return settle(
      db,
      row,
      deps.events,
      now,
      failed(now, "revoke", attempts),
      "failed",
      result.status,
    );
  }
  return settle(
    db,
    row,
    deps.events,
    now,
    {
      reason: "revoke",
      attempts,
      token: row.token ?? (await sealAppleToken(clients.app, token)),
      nextAttemptAt: new Date(now.getTime() + backoff(attempts)),
    },
    "retrying",
    result.status,
  );
}

/**
 * The first try, right after the delete: trades the phone's code for a token, retrying a network
 * failure a couple of times while the code is still good, then revokes. What fails is left to the
 * cron, so this never throws.
 */
export async function revokeAfterDeletion(
  db: Db,
  id: string,
  code: string | undefined,
  deps: AppleRevocationDeps,
  now = new Date(),
): Promise<AppleRevocationOutcome> {
  const [row] = await db
    .select()
    .from(schema.appleRevocations)
    .where(eq(schema.appleRevocations.id, id));
  if (!row) return "skipped";
  if (row.status !== "pending") return row.status === "revoked" ? "revoked" : "failed";
  const clients = deps.clients;
  if (!clients) return "retrying";
  if (row.token) {
    const token = await openAppleToken(clients.app, row.token);
    if (!token)
      return settle(db, row, deps.events, now, failed(now, "lost", row.attempts), "failed");
    return attemptRevoke(db, row, token, deps, now);
  }
  if (!code) return settle(db, row, deps.events, now, failed(now, "lost", row.attempts), "failed");
  const sleep = deps.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)));
  let exchanged = await exchangeAppleCode(clients.app, code, deps.fetcher);
  for (const pause of EXCHANGE_PAUSES_MS) {
    if (exchanged.ok || !exchanged.retry) break;
    await sleep(pause);
    exchanged = await exchangeAppleCode(clients.app, code, deps.fetcher);
  }
  if (!exchanged.ok) {
    return settle(
      db,
      row,
      deps.events,
      now,
      failed(now, "exchange", row.attempts),
      "failed",
      exchanged.status,
    );
  }
  return attemptRevoke(db, { ...row, token: null }, exchanged.token, deps, now);
}

/**
 * The cron's pass: retries each revocation that is due, and gives up on one whose code was never
 * traded. A grant that is not revoked stays on record as failed rather than disappearing.
 */
export async function retryAppleRevocations(
  db: Db,
  deps: AppleRevocationDeps,
  now = new Date(),
): Promise<{ revoked: number; retrying: number; failed: number }> {
  const counts = { revoked: 0, retrying: 0, failed: 0 };
  const lost = await db
    .select()
    .from(schema.appleRevocations)
    .where(
      and(
        eq(schema.appleRevocations.status, "pending"),
        isNull(schema.appleRevocations.token),
        lte(schema.appleRevocations.createdAt, new Date(now.getTime() - CODE_LOST_MS)),
      ),
    )
    .limit(20);
  for (const row of lost) {
    await settle(db, row, deps.events, now, failed(now, "lost", row.attempts), "failed");
    counts.failed++;
  }
  if (!deps.clients) return counts;
  const due = await db
    .select()
    .from(schema.appleRevocations)
    .where(
      and(
        eq(schema.appleRevocations.status, "pending"),
        isNotNull(schema.appleRevocations.token),
        lte(schema.appleRevocations.nextAttemptAt, now),
      ),
    )
    .orderBy(schema.appleRevocations.nextAttemptAt)
    .limit(20);
  for (const row of due) {
    const token: string | null = row.token
      ? await openAppleToken(deps.clients.app, row.token)
      : null;
    const outcome = token
      ? await attemptRevoke(db, row, token, deps, now)
      : await settle(db, row, deps.events, now, failed(now, "lost", row.attempts), "failed");
    if (outcome === "revoked" || outcome === "retrying" || outcome === "failed") counts[outcome]++;
  }
  return counts;
}
